import pandas as pd
import numpy as np
from pymongo import MongoClient
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_score
import pickle
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["csao_db"]

# ─── Load Data from MongoDB ────────────────────────────────────────────────────
def load_data():
    print("Loading interactions from MongoDB...")
    interactions = list(db.interactions.find({}, {"_id": 0}))
    users        = list(db.users.find({}, {"_id": 0}))
    items        = list(db.items.find({}, {"_id": 0}))

    df_inter = pd.DataFrame(interactions)
    df_users = pd.DataFrame(users)
    df_items = pd.DataFrame(items)

    return df_inter, df_users, df_items

# ─── Feature Engineering ───────────────────────────────────────────────────────
def build_features(df_inter, df_users, df_items):
    print("Building features...")

    # Merge user features
    df = df_inter.merge(df_users, on="user_id", how="left")

    # Merge candidate item features
    df = df.merge(
        df_items.rename(columns={
            "item_id":    "candidate_addon",
            "name":       "addon_name",
            "category":   "addon_category",
            "price":      "addon_price",
            "popularity": "addon_popularity",
            "veg":        "addon_veg"
        }),
        on="candidate_addon", how="left"
    )

    # Cart-level features
    df["cart_size"]      = df["cart_items"].apply(len)
    df["cart_value"]     = df["cart_items"].apply(
        lambda items: sum(
            next((it["price"] for it in db.items.find({"item_id": i})), 0)
            for i in items
        )
    )

    # Meal time encoding
    meal_time_map = {"breakfast": 0, "lunch": 1, "dinner": 2, "late_night": 3}
    df["meal_time_enc"]  = df["meal_time"].map(meal_time_map).fillna(1)

    # User segment encoding
    segment_map = {"budget": 0, "occasional": 1, "frequent": 2, "premium": 3}
    df["segment_enc"]    = df["user_segment"].map(segment_map).fillna(0)

    # Addon category encoding
    category_map = {"addon": 0, "bread": 1, "drink": 2, "dessert": 3, "main": 4}
    df["addon_cat_enc"]  = df["addon_category"].map(category_map).fillna(0)

    # Price sensitivity feature
    df["price_ratio"]    = df["addon_price"] / (df["avg_order_val"] + 1)

    # Popularity × meal time interaction
    df["pop_time_inter"] = df["addon_popularity"] * df["meal_time_enc"]

    # Cart already has a drink/dessert/bread?
    def cart_has_category(cart, cat):
        for item_id in cart:
            item = next((it for it in db.items.find({"item_id": item_id})), None)
            if item and item.get("category") == cat:
                return 1
        return 0

    df["cart_has_drink"]   = df["cart_items"].apply(lambda c: cart_has_category(c, "drink"))
    df["cart_has_dessert"] = df["cart_items"].apply(lambda c: cart_has_category(c, "dessert"))
    df["cart_has_bread"]   = df["cart_items"].apply(lambda c: cart_has_category(c, "bread"))

    return df

# ─── Train Model ───────────────────────────────────────────────────────────────
def train(df):
    print("Training LightGBM model...")

    FEATURES = [
        "cart_size", "cart_value", "meal_time_enc", "segment_enc",
        "addon_cat_enc", "addon_price", "addon_popularity",
        "price_ratio", "pop_time_inter",
        "cart_has_drink", "cart_has_dessert", "cart_has_bread",
        "order_freq", "avg_order_val"
    ]

    df = df.dropna(subset=FEATURES + ["accepted"])

    X = df[FEATURES]
    y = df["accepted"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        num_leaves=31,
        min_child_samples=20,
        class_weight="balanced",
        random_state=42,
        verbose=-1
    )

    model.fit(X_train, y_train)

    # ─── Evaluation ───────────────────────────────────────────────────────────
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred       = model.predict(X_test)

    auc       = roc_auc_score(y_test, y_pred_proba)
    precision = precision_score(y_test, y_pred, zero_division=0)

    # Precision@K
    def precision_at_k(y_true, y_scores, k=8):
        top_k = np.argsort(y_scores)[::-1][:k]
        return np.mean(y_true.iloc[top_k].values)

    p_at_8 = precision_at_k(y_test, y_pred_proba, k=8)

    print(f"\n  AUC:           {auc:.4f}")
    print(f"  Precision:     {precision:.4f}")
    print(f"  Precision@8:   {p_at_8:.4f}")

    return model, FEATURES

# ─── Save Model ────────────────────────────────────────────────────────────────
def save_model(model, features):
    os.makedirs("models", exist_ok=True)
    with open("models/csao_model.pkl", "wb") as f:
        pickle.dump({"model": model, "features": features}, f)
    print("\n  Model saved to backend/models/csao_model.pkl ✅")

if __name__ == "__main__":
    df_inter, df_users, df_items = load_data()
    df = build_features(df_inter, df_users, df_items)
    model, features = train(df)
    save_model(model, features)