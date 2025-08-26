# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "pandas",
# ]
# ///

import json
import subprocess
from pathlib import Path
import pandas as pd

# Read the clusters data
clusters_df = pd.read_csv("renders/clusters.csv")

# Initialize the result dictionary
result = []

# Process each image
for _, row in clusters_df.iterrows():
    idx = int(row["index"])
    img_path = f"renders/{idx:02d}_moon.png"
    
    # Run chafa command
    cmd = [
        "chafa",
        "-f", "symbols",
        "-c", "none",
        "--symbols", "ascii,-block",
        "--work", "2",
        "--font-ratio", "10/22",
        "-s", "60x",
        "-p", "off",
        img_path
    ]
    
    try:
        # Run chafa and capture output
        ascii_art = subprocess.check_output(cmd, text=True).strip()
        
        # Add to result
        result.append({
            "index": idx,
            "distance_km": float(row["distance_km"]),
            "libration_elat": float(row["libration_elat"]),
            "libration_elon": float(row["libration_elon"]),
            "ascii": ascii_art
        })
    except subprocess.CalledProcessError as e:
        print(f"Error processing {img_path}: {e}")
        continue

# Write the JSON file
output_path = Path("src/render/ascii.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump({"moons": result}, f, indent=2)

print(f"Created {output_path} with {len(result)} moon ASCII renderings")
