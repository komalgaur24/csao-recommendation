import pandas as pd
import numpy as np
from pymongo import MongoClient
from datetime import datetime, timedelta
import random
import os
from dotenv import load_dotenv

load_dotenv()

random.seed(42)
np.random.seed(42)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["csao_db"]

# ─── Master Item Catalog ───────────────────────────────────────────────────────
ITEMS = [
    {"item_id": "I001", "name": "Biryani",        "category": "main",    "price": 220, "veg": False, "popularity": 0.95},
    {"item_id": "I002", "name": "Paneer Butter Masala", "category": "main", "price": 190, "veg": True, "popularity": 0.90},
    {"item_id": "I003", "name": "Dal Makhani",    "category": "main",    "price": 160, "veg": True,  "popularity": 0.85},
    {"item_id": "I004", "name": "Butter Chicken", "category": "main",    "price": 240, "veg": False, "popularity": 0.92},
    {"item_id": "I005", "name": "Raita",          "category": "addon",   "price": 40,  "veg": True,  "popularity": 0.80},
    {"item_id": "I006", "name": "Salaan",         "category": "addon",   "price": 50,  "veg": True,  "popularity": 0.78},
    {"item_id": "I007", "name": "Gulab Jamun",    "category": "dessert", "price": 60,  "veg": True,  "popularity": 0.82},
    {"item_id": "I008", "name": "Rasmalai",       "category": "dessert", "price": 70,  "veg": True,  "popularity": 0.75},
    {"item_id": "I009", "name": "Lassi",          "category": "drink",   "price": 60,  "veg": True,  "popularity": 0.88},
    {"item_id": "I010", "name": "Coke",           "category": "drink",   "price": 40,  "veg": True,  "popularity": 0.85},
    {"item_id": "I011", "name": "Butter Naan",    "category": "bread",   "price": 35,  "veg": True,  "popularity": 0.91},
    {"item_id": "I012", "name": "Tandoori Roti",  "category": "bread",   "price": 25,  "veg": True,  "popularity": 0.87},
    {"item_id": "I013", "name": "Papad",          "category": "addon",   "price": 20,  "veg": True,  "popularity": 0.70},
    {"item_id": "I014", "name": "Green Salad",    "category": "addon",   "price": 45,  "veg": True,  "popularity": 0.65},
    {"item_id": "I015", "name": "Kheer",          "category": "dessert", "price": 55,  "veg": True,  "popularity": 0.72},
]

# Natural food pairing rules (mimics real meal completion logic)
PAIRING_RULES = {
    "I001": ["I006", "I005", "I007", "I009", "I013"],  # Biryani → salaan, raita, gulab jamun, lassi
    "I002": ["I011", "I012", "I007", "I009", "I014"],  # Paneer → naan, roti, dessert
    "I003": ["I011", "I012", "I010", "I013"],           # Dal → bread, coke
    "I004": ["I011", "I006", "I008", "I009"],           # Butter chicken → naan, salaan
    "I011": ["I002", "I003", "I007", "I010"],           # Naan → curry, dessert
    "I012": ["I003", "I004", "I013"],                   # Roti → dal, chicken
}

RESTAURANTS = [
    {"restaurant_id": "R001", "name": "Spice Garden",   "cuisine": "North Indian", "price_range": "mid",     "rating": 4.3},
    {"restaurant_id": "R002", "name": "Biryani House",  "cuisine": "Hyderabadi",   "price_range": "budget",  "rating": 4.5},
    {"restaurant_id": "R003", "name": "Royal Darbar",   "cuisine": "Mughlai",      "price_range": "premium", "rating": 4.7},
    {"restaurant_id": "R004", "name": "Desi Tadka",     "cuisine": "North Indian", "price_range": "budget",  "rating": 4.1},
    {"restaurant_id": "R005", "name": "Punjab Grill",   "cuisine": "Punjabi",      "price_range": "mid",     "rating": 4.4},
]

USER_SEGMENTS = ["budget", "premium", "occasional", "frequent"]
CITIES         = ["Jaipur", "Delhi", "Mumbai", "Bangalore", "Hyderabad"]
MEAL_TIMES     = ["breakfast", "lunch", "dinner", "late_night"]

def random_meal_time():
    hour = random.randint(0, 23)
    if 7  <= hour <= 10: return "breakfast"
    if 11 <= hour <= 15: return "lunch"
    if 19 <= hour <= 22: return "dinner"
    return "late_night"

def generate_users(n=500):
    users = []
    for i in range(n):
        users.append({
            "user_id":       f"U{i+1:04d}",
            "segment":       random.choice(USER_SEGMENTS),
            "city":          random.choice(CITIES),
            "order_freq":    round(random.uniform(0.5, 10.0), 2),   # orders/week
            "avg_order_val": round(random.uniform(150, 800), 2),
            "preferred_cuisine": random.choice(["North Indian","Hyderabadi","Mughlai","Punjabi"]),
            "veg_only":      random.random() < 0.4,
            "created_at":    datetime.now() - timedelta(days=random.randint(30, 730)),
        })
    return users

def generate_orders(users, n=5000):
    orders, interactions = [], []
    item_ids = [i["item_id"] for i in ITEMS]

    for i in range(n):
        user        = random.choice(users)
        restaurant  = random.choice(RESTAURANTS)
        meal_time   = random_meal_time()
        order_date  = datetime.now() - timedelta(days=random.randint(0, 365))

        # Pick 1–3 main items
        main_items  = random.sample(
            [x for x in item_ids if any(it["item_id"]==x and it["category"]=="main" for it in ITEMS)],
            k=random.randint(1, 2)
        )

        # Add paired add-ons (simulates natural meal completion)
        cart_items  = main_items.copy()
        for main in main_items:
            if main in PAIRING_RULES:
                addons = PAIRING_RULES[main]
                n_addons = random.randint(0, min(3, len(addons)))
                cart_items += random.sample(addons, n_addons)
        cart_items  = list(set(cart_items))

        total_value = sum(
            it["price"] for it in ITEMS if it["item_id"] in cart_items
        )

        order = {
            "order_id":      f"O{i+1:05d}",
            "user_id":       user["user_id"],
            "restaurant_id": restaurant["restaurant_id"],
            "items":         cart_items,
            "total_value":   total_value,
            "meal_time":     meal_time,
            "order_date":    order_date,
            "city":          user["city"],
            "status":        "delivered",
        }
        orders.append(order)

        # Generate interaction records (for ML training)
        all_candidate_addons = [x for x in item_ids if x not in main_items]
        for addon_id in all_candidate_addons:
            accepted = addon_id in cart_items
            interactions.append({
                "user_id":       user["user_id"],
                "order_id":      order["order_id"],
                "cart_items":    main_items,
                "candidate_addon": addon_id,
                "accepted":      int(accepted),
                "meal_time":     meal_time,
                "user_segment":  user["segment"],
                "restaurant_id": restaurant["restaurant_id"],
                "order_date":    order_date,
            })

    return orders, interactions

def save_to_mongo(users, orders, interactions):
    print("Clearing old data...")
    db.users.drop()
    db.items.drop()
    db.restaurants.drop()
    db.orders.drop()
    db.interactions.drop()

    print("Inserting users...")
    db.users.insert_many(users)

    print("Inserting items...")
    db.items.insert_many(ITEMS)

    print("Inserting restaurants...")
    db.restaurants.insert_many(RESTAURANTS)

    print("Inserting orders...")
    db.orders.insert_many(orders)

    print("Inserting interactions...")
    # Insert in batches to avoid memory issues
    batch_size = 1000
    for i in range(0, len(interactions), batch_size):
        db.interactions.insert_many(interactions[i:i+batch_size])

    print(f"\nDone!")
    print(f"  Users:        {db.users.count_documents({})}")
    print(f"  Items:        {db.items.count_documents({})}")
    print(f"  Restaurants:  {db.restaurants.count_documents({})}")
    print(f"  Orders:       {db.orders.count_documents({})}")
    print(f"  Interactions: {db.interactions.count_documents({})}")

if __name__ == "__main__":
    print("Generating users...")
    users = generate_users(500)

    print("Generating orders & interactions...")
    orders, interactions = generate_orders(users, 5000)

    print("Saving to MongoDB...")
    save_to_mongo(users, orders, interactions)
