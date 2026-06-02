import re
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

EXCLUDE_DEPARTMENTS = {"babies", "personal care", "household", "pets", "alcohol", "missing"}
EXCLUDE_AISLES = {
    "beauty", "feminine care", "baby accessories", "paper goods",
    "cleaning products", "trash bags liners", "air fresheners candles", "laundry"
}

AISLE_MAP = {
    "fresh fruits": "Produce - Fruit",
    "fresh vegetables": "Produce - Vegetables",
    "packaged fruits vegetables": "Produce - Fruit",
    "dry pasta": "Pantry & Dry Goods",
    "grains rice dried goods": "Pantry & Dry Goods",
    "canned goods": "Pantry & Dry Goods",
    "oils vinegars": "Spices & Condiments",
    "spices seasonings": "Spices & Condiments",
    "condiments": "Spices & Condiments",
    "sauces": "Spices & Condiments",
    "baking ingredients": "Pantry & Dry Goods",
    "bread": "Bread & Bakery",
    "breakfast bakery": "Bread & Bakery",
    "frozen produce": "Frozen",
    "frozen meat seafood": "Frozen",
    "frozen meals": "Frozen",
    "frozen breads doughs": "Frozen",
    "frozen breakfast": "Frozen",
    "frozen dessert": "Frozen",
    "frozen pizza": "Frozen",
    "frozen vegan vegetarian": "Frozen",
}

DEPARTMENT_MAP = {
    "meat seafood": "Meat & Seafood",
    "dairy eggs": "Dairy & Eggs",
    "produce": "Produce - Vegetables",
    "frozen": "Frozen",
    "bakery": "Bread & Bakery",
    "deli": "Meat & Seafood",
    "pantry": "Pantry & Dry Goods",
    "dry goods pasta": "Pantry & Dry Goods",
    "canned goods": "Pantry & Dry Goods",
    "beverages": "Pantry & Dry Goods",
    "snacks": "Pantry & Dry Goods",
    "breakfast": "Pantry & Dry Goods",
    "international": "Pantry & Dry Goods",
    "other": "Other",
}

DEFAULT_CATEGORY = "Pantry & Dry Goods"

BRANDS = [
    "trader joe", "whole foods", "365", "simple truth", "annie", "bob red mill",
    "organic valley", "horizon", "stonyfield", "good culture", "vital farms",
    "earth balance", "daiya", "follow your heart", "beyond meat", "impossible"
]

STRIP_WORDS = [
    "organic", "natural", "fresh", "raw", "plain", "original", "classic",
    "unsweetened", "sweetened", "salted", "unsalted", "reduced fat", "low fat",
    "whole", "free range", "cage free", "grass fed", "non gmo", "gluten free"
]

# Build regex for strip words (whole word, multi-word phrases first to avoid partial matches)
_sorted_strip = sorted(STRIP_WORDS, key=len, reverse=True)
_strip_pattern = re.compile(
    r'\b(' + '|'.join(re.escape(w) for w in _sorted_strip) + r')\b',
    re.IGNORECASE
)


def strip_brand(name: str) -> str:
    lower = name.lower()
    for brand in sorted(BRANDS, key=len, reverse=True):
        if lower.startswith(brand):
            name = name[len(brand):].strip()
            break
    return name


def normalize_name(product_name: str) -> str:
    name = product_name.lower()
    name = strip_brand(name)
    name = _strip_pattern.sub("", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name.title()


def assign_category(aisle: str, department: str) -> str:
    aisle_key = aisle.lower().strip()
    dept_key = department.lower().strip()
    if aisle_key in AISLE_MAP:
        return AISLE_MAP[aisle_key]
    if dept_key in DEPARTMENT_MAP:
        return DEPARTMENT_MAP[dept_key]
    return DEFAULT_CATEGORY


def main():
    products = pd.read_csv(DATA_DIR / "products.csv")
    aisles = pd.read_csv(DATA_DIR / "aisles.csv")
    departments = pd.read_csv(DATA_DIR / "departments.csv")

    total_before = len(products)
    print(f"Total rows in products.csv before filtering: {total_before}")

    df = (
        products
        .merge(aisles, on="aisle_id", how="left")
        .merge(departments, on="department_id", how="left")
    )

    dept_lower = df["department"].str.lower().str.strip()
    aisle_lower = df["aisle"].str.lower().str.strip()
    df = df[~dept_lower.isin(EXCLUDE_DEPARTMENTS) & ~aisle_lower.isin(EXCLUDE_AISLES)]

    total_after_filter = len(df)
    print(f"Total rows after department/aisle filtering: {total_after_filter}")

    df["grocery_category"] = df.apply(
        lambda r: assign_category(str(r["aisle"]), str(r["department"])), axis=1
    )
    df["name"] = df["product_name"].apply(normalize_name)

    df = df[df["name"].str.strip() != ""]
    df = df[["name", "grocery_category"]].drop_duplicates()

    total_after_dedup = len(df)
    print(f"Total rows after deduplication: {total_after_dedup}")

    df["canonical_name"] = df["name"]
    df["aliases"] = ""
    df = df[["name", "canonical_name", "grocery_category", "aliases"]]

    out_path = DATA_DIR / "ingredient_lookup.csv"
    df.to_csv(out_path, index=False)
    print(f"\nOutput written to: {out_path}")

    print("\nCount per grocery_category:")
    for cat, count in df["grocery_category"].value_counts().items():
        print(f"  {cat}: {count}")

    print("\n10 sample rows:")
    print(df.sample(min(10, len(df)), random_state=42).to_string(index=False))


if __name__ == "__main__":
    main()
