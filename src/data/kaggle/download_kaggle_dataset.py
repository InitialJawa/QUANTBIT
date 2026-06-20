import kagglehub
import shutil
import os

# Download the latest version of the Kaggle dataset
path = kagglehub.dataset_download("muamkh/ihsgstockdata")

# Target directory inside the project (src/data/kaggle)
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
target_dir = os.path.join(project_root, "src", "data", "kaggle")
os.makedirs(target_dir, exist_ok=True)

# Copy all files from the Kaggle cache to the target folder
for fname in os.listdir(path):
    src = os.path.join(path, fname)
    dst = os.path.join(target_dir, fname)
    shutil.copy2(src, dst)

print(f"Dataset Kaggle copied to {target_dir}")
