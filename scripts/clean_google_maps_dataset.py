import pandas as pd
import re

# ---------------------------------------------
# 1. Define the list of input files to load
# ---------------------------------------------

file_paths = [
    '/Users/jixiang/Downloads/google.csv'
]

# ---------------------------------------------
# 2. Read each file, perform basic cleaning,
# and merge them into a single DataFrame
# ---------------------------------------------

df_list = []

for path in file_paths:
    try:
        # Read CSV file
        temp_df = pd.read_csv(path)

        # Remove the first two rows
        # (these rows usually contain empty or invalid content
        # produced during the scraping/export process)
        temp_df = temp_df.iloc[2:].copy()

        # Append cleaned DataFrame to the list
        df_list.append(temp_df)

        print(f"Successfully loaded and cleaned: {path}")

    except Exception as e:
        print(f"Error reading file {path}: {e}")

# Combine all DataFrames into one
df_combined = pd.concat(df_list, ignore_index=True)

# ---------------------------------------------
# 3. Define the mapping between scrambled
# column names and standardized column names
# ---------------------------------------------

mapping = {
    'qBF1Pd': 'name',        # restaurant name
    'MW4etd': 'rating',      # rating score
    'UY7F9': 'reviews',      # number of reviews
    'W4Efsd': 'category',    # business category
    'W4Efsd 3': 'address',   # address
    'hfpxzc href': 'url',    # Google Maps URL
    'FQ2IWe src': 'image_url' # image link
}

# ---------------------------------------------
# 4. Rename columns and keep only necessary ones
# ---------------------------------------------

# Identify columns that actually exist in the dataset
existing_cols = [col for col in mapping.keys() if col in df_combined.columns]

# Keep only relevant columns and rename them
df_clean = df_combined[existing_cols].rename(columns=mapping)

# ---------------------------------------------
# 5. Remove duplicate entries
# Deduplication is based on 'url' because
# each Google Maps location has a unique URL
# ---------------------------------------------

if 'url' in df_clean.columns:

    initial_count = len(df_clean)

    df_clean = df_clean.drop_duplicates(subset=['url'], keep='first')

    final_count = len(df_clean)

    print(f"Deduplication completed: {initial_count} → {final_count} rows remaining.")

# ---------------------------------------------
# 6. Additional data cleaning
# ---------------------------------------------

# Remove parentheses from the review count
# Example: "(385)" → "385"
if 'reviews' in df_clean.columns:
    df_clean['reviews'] = (
        df_clean['reviews']
        .astype(str)
        .str.replace(r'\(|\)', '', regex=True)
    )

# Add city and country fields
# These fields are useful when importing into GIS tools
df_clean['city'] = 'Bangkok'
df_clean['country'] = 'Thailand'

# ---------------------------------------------
# Function to extract latitude and longitude
# from a Google Maps URL
# ---------------------------------------------

def extract_coords(url):

    # Skip if the URL is missing or not a string
    if pd.isna(url) or not isinstance(url, str):
        return None, None

    # Pattern 1: coordinates in !3dLAT!4dLON format
    match = re.search(r'!3d([-?\d\.]+)!4d([-?\d\.]+)', url)

    # Pattern 2: coordinates in @LAT,LON format
    if not match:
        match = re.search(r'@([-?\d\.]+),([-?\d\.]+)', url)

    # If a match is found, return latitude and longitude
    if match:
        return match.group(1), match.group(2)

    return None, None

# ---------------------------------------------
# Extract coordinates from URL column
# ---------------------------------------------

if 'url' in df_clean.columns:

    coords = df_clean['url'].apply(extract_coords)

    df_clean['lat'], df_clean['lon'] = zip(*coords)

# ---------------------------------------------
# 7. Export the cleaned dataset
# ---------------------------------------------

output_file = '/Users/jixiang/Downloads/bangkok_food_new.csv'

df_clean.to_csv(
    output_file,
    index=False,
    encoding='utf-8-sig'
)

print(f"--- Task completed ---")
print(f"Final dataset saved to: {output_file}")

# Display the first few rows
print(df_clean.head())
