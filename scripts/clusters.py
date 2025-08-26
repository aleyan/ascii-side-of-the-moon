# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "scikit-learn",
#     "pandas",
#     "numpy",
# ]
# ///

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import MiniBatchKMeans

NCLUSTERS = 31

# Read the data
df = pd.read_csv("data/moon_history.csv")

# Get the range of values for each feature
dist_range = df["distance_km"].max() - df["distance_km"].min()
elat_range = df["libration_elat"].max() - df["libration_elat"].min()
elon_range = df["libration_elon"].max() - df["libration_elon"].min()

# Create a grid of points that covers the space more uniformly
n_points = 1000
dist_points = np.linspace(df["distance_km"].min(), df["distance_km"].max(), n_points)
elat_points = np.linspace(df["libration_elat"].min(), df["libration_elat"].max(), n_points)
elon_points = np.linspace(df["libration_elon"].min(), df["libration_elon"].max(), n_points)

# Create a mesh of points
grid_points = []
for d in np.linspace(0, 1, 10):  # 10 points in each dimension
    for e1 in np.linspace(0, 1, 10):
        for e2 in np.linspace(0, 1, 10):
            dist = df["distance_km"].min() + d * dist_range
            elat = df["libration_elat"].min() + e1 * elat_range
            elon = df["libration_elon"].min() + e2 * elon_range
            grid_points.append([dist, elat, elon])

# Combine real data with grid points
features = df[["distance_km", "libration_elat", "libration_elon"]].values
all_points = np.vstack([features, grid_points])

# Normalize to [0,1] range
scaler = MinMaxScaler()
features_scaled = scaler.fit_transform(all_points)

# Perform clustering
n_clusters = NCLUSTERS
kmeans = MiniBatchKMeans(
    n_clusters=n_clusters,
    random_state=42,
    batch_size=1000,
    n_init="auto"
)
kmeans.fit(features_scaled)

# Get cluster centers and inverse transform to original scale
cluster_centers_scaled = kmeans.cluster_centers_
cluster_centers = scaler.inverse_transform(cluster_centers_scaled)

# Create a DataFrame with the cluster centers
centers_df = pd.DataFrame(
    cluster_centers,
    columns=["distance_km", "libration_elat", "libration_elon"]
)

# Round the values to match the original data precision
centers_df["distance_km"] = centers_df["distance_km"].round(1)
centers_df["libration_elat"] = centers_df["libration_elat"].round(3)
centers_df["libration_elon"] = centers_df["libration_elon"].round(3)

# Sort by distance_km to make it easier to analyze
centers_df = centers_df.sort_values("distance_km")

# Add index column starting at 1, zero-padded to 2 digits
centers_df.insert(0, "index", [f"{i:02d}" for i in range(1, n_clusters + 1)])

# Save to CSV
centers_df.to_csv("data/cluster_centers.csv", index=False)
