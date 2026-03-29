from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import List
import pickle
import pandas as pd
import numpy as np
import os
import time
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CSAO Recommendation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client    = MongoClient(MONGO_URI)
db        = client["csao_db"]

# ─── Load Model ───────────────────────────────────────────────────────────────
with open("models/csao_model.pkl", "rb") as f:
    artifact = pickle.load(f)
    MODEL    = artifact["model"]
    FEATURES = artifact["features"]

# ─── Load Item Lookup ─────────────────────────────────────────────────────────
ITEMS       = list(db.items.find({}, {"_id": 0}))
ITEM_LOOKUP = {it["item_id"]: it for it in ITEMS}

# ─── Request Schema ───────────────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    user_id:       str
    cart_items:    List[str]
    meal_time:     str = "dinner"
    top_n:         int = 8

# ─── Helper: Build Feature Row ────────────────────────────────────────────────
def build_feature_row(user, cart_items, candidate_id, meal_time):
    item = ITEM_LOOKUP.get(candidate_id, {})

    meal_time_map = {"breakfast": 0, "lunch": 1, "dinner": 2, "late_night": 3}
    segment_map   = {"budget": 0, "occasional": 1, "frequent": 2, "premium": 3}
    category_map  = {"addon": 0, "bread": 1, "drink": 2, "dessert": 3, "main": 4}

    cart_value = sum(ITEM_LOOKUP.get(i, {}).get("price", 0) for i in cart_items)

    def cart_has(cat):
        return int(any(ITEM_LOOKUP.get(i, {}).get("category") == cat for i in cart_items))

    avg_order_val = user.get("avg_order_val", 300)

    return {
        "cart_size":        len(cart_items),
        "cart_value":       cart_value,
        "meal_time_enc":    meal_time_map.get(meal_time, 1),
        "segment_enc":      segment_map.get(user.get("segment", "occasional"), 1),
        "addon_cat_enc":    category_map.get(item.get("category", "addon"), 0),
        "addon_price":      item.get("price", 50),
        "addon_popularity": item.get("popularity", 0.5),
        "price_ratio":      item.get("price", 50) / (avg_order_val + 1),
        "pop_time_inter":   item.get("popularity", 0.5) * meal_time_map.get(meal_time, 1),
        "cart_has_drink":   cart_has("drink"),
        "cart_has_dessert": cart_has("dessert"),
        "cart_has_bread":   cart_has("bread"),
        "order_freq":       user.get("order_freq", 2.0),
        "avg_order_val":    avg_order_val,
    }

# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "CSAO Recommendation API is running 🚀"}

@app.get("/items")
def get_items():
    return {"items": ITEMS}

@app.post("/recommend")
def recommend(req: RecommendRequest):
    start = time.time()

    # Fetch user
    user = db.users.find_one({"user_id": req.user_id}, {"_id": 0})

    # Cold start — use default user profile if not found
    if not user:
        user = {
            "user_id":       req.user_id,
            "segment":       "occasional",
            "order_freq":    2.0,
            "avg_order_val": 300,
        }

    # Candidate addons = all items NOT already in cart
    candidates = [
        item_id for item_id in ITEM_LOOKUP
        if item_id not in req.cart_items
    ]

    # Build feature rows for all candidates
    rows = [
        build_feature_row(user, req.cart_items, cid, req.meal_time)
        for cid in candidates
    ]

    df   = pd.DataFrame(rows)[FEATURES]
    probs = MODEL.predict_proba(df)[:, 1]

    # Rank by probability
    ranked = sorted(zip(candidates, probs), key=lambda x: x[1], reverse=True)
    top_n  = ranked[:req.top_n]

    # Build response
    recommendations = []
    for item_id, score in top_n:
        item = ITEM_LOOKUP[item_id]
        recommendations.append({
            "item_id":   item_id,
            "name":      item["name"],
            "category":  item["category"],
            "price":     item["price"],
            "score":     round(float(score), 4),
        })

    latency_ms = round((time.time() - start) * 1000, 2)

    return {
        "user_id":         req.user_id,
        "cart_items":      req.cart_items,
        "meal_time":       req.meal_time,
        "recommendations": recommendations,
        "latency_ms":      latency_ms,
        "model_version":   "lgbm-v1",
    }

@app.get("/metrics")
def get_metrics():
    total_orders = db.orders.count_documents({})
    total_users  = db.users.count_documents({})
    avg_order_val = list(db.orders.aggregate([
        {"$group": {"_id": None, "avg": {"$avg": "$total_value"}}}
    ]))[0]["avg"]

    return {
        "total_orders":    total_orders,
        "total_users":     total_users,
        "avg_order_value": round(avg_order_val, 2),
        "model_auc":       0.8579,
        "precision_at_8":  0.5000,
    }

@app.on_event("startup")
async def warmup():
    dummy = pd.DataFrame([{
        "cart_size": 1, "cart_value": 200, "meal_time_enc": 2,
        "segment_enc": 1, "addon_cat_enc": 0, "addon_price": 50,
        "addon_popularity": 0.8, "price_ratio": 0.1,
        "pop_time_inter": 1.6, "cart_has_drink": 0,
        "cart_has_dessert": 0, "cart_has_bread": 0,
        "order_freq": 2.0, "avg_order_val": 300
    }])[FEATURES]
    MODEL.predict_proba(dummy)
    print("Model warmed up ✅")