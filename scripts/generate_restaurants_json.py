import pandas as pd
import numpy as np

# =========================
# Load Excel data
# =========================

df = pd.read_excel("/Users/jixiang/Library/CloudStorage/Dropbox/ESCAP-DRS/BKK-food-map/data/bangkok_food_combined_ready.xlsx")

# Remove potential leading/trailing spaces in column names
df.columns = df.columns.str.strip()


# =========================
# Step 1: Parse price_level
# =========================
# Convert strings like "200-400" into:
# price_min = 200
# price_max = 400
# price_mid = 300

def parse_price(price_str):
    try:
        # Remove spaces before splitting to make parsing more robust
        parts = str(price_str).replace(" ", "").split("-")
        price_min = float(parts[0])
        price_max = float(parts[1])
        price_mid = (price_min + price_max) / 2
        return pd.Series([price_min, price_max, price_mid])
    except:
        # If parsing fails, return NaN values
        return pd.Series([np.nan, np.nan, np.nan])

df[["price_min", "price_max", "price_mid"]] = df["price_level"].apply(parse_price)


# =========================
# Step 2: Handle missing values
# =========================
# If rating or review_count contains NaN,
# it will break the weighted rating calculation.

# Replace missing review_count with 0
df["review_count"] = df["review_count"].fillna(0)

# Replace missing rating with global mean later
global_mean = df["rating"].mean()
df["rating"] = df["rating"].fillna(global_mean)


# =========================
# Step 3: Calculate weighted rating
# =========================
# Bayesian weighted rating
# Helps reduce bias from restaurants with very few reviews

m = 50  # minimum review threshold

df["weighted_rating"] = (
    (df["rating"] * df["review_count"] + global_mean * m) /
    (df["review_count"] + m)
)


# =========================
# Step 4: Normalize rating
# =========================
# Convert rating into a 0–1 scale for scoring

min_rating = df["weighted_rating"].min()
max_rating = df["weighted_rating"].max()

if max_rating > min_rating:
    df["rating_norm"] = (
        (df["weighted_rating"] - min_rating) /
        (max_rating - min_rating)
    )
else:
    df["rating_norm"] = 0


# =========================
# Step 5: Compute review weight
# =========================
# Log transformation reduces skew from very large review counts

df["review_log"] = np.log(df["review_count"] + 1)

min_review = df["review_log"].min()
max_review = df["review_log"].max()

if max_review > min_review:
    df["review_weight_norm"] = (
        (df["review_log"] - min_review) /
        (max_review - min_review)
    )
else:
    df["review_weight_norm"] = 0


# =========================
# Select columns for export
# =========================

columns_to_export = [
    "name",
    "lat",
    "lon",
    "primary_cuisine",
    "cuisine_subtype",
    "weighted_rating",
    "rating_norm",
    "review_count",
    "review_weight_norm",
    "price_mid",
    "address",
    "url",
    "image_url"
]

df_export = df[columns_to_export]


# =========================
# Replace NaN with null for JSON
# =========================
# Browsers cannot parse NaN in JSON.
# Replace them with None so they become "null".

df_export = df_export.replace({np.nan: None})


# =========================
# Export JSON file
# =========================

df_export.to_json(
    "/Users/jixiang/Library/CloudStorage/Dropbox/ESCAP-DRS/BKK-food-map/restaurants.json",
    orient="records",
    force_ascii=False,
    indent=2
)

print("restaurants.json generated successfully.")
