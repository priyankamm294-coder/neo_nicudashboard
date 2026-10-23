
from pathlib import Path

import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

files = list(DATA_DIR.glob("*.xlsx"))
if not files:
    raise FileNotFoundError(f"No Excel dataset found in {DATA_DIR}")

df = pd.read_excel(files[0])

# Sensor features and target
features = [
    "Baby Temperature (°C)",
    "Movement",
]
target = "Overall Alarm"

missing = [c for c in features + [target] if c not in df.columns]
if missing:
    raise ValueError(
        f"Missing columns: {missing}\nAvailable: {df.columns.tolist()}"
    )

df = df[features + [target]].dropna()
X = df[features]
y = df[target].astype(int)

if y.nunique() < 2:
    raise ValueError("The target must contain both alarm and no-alarm rows.")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(
    n_estimators=100, random_state=42, class_weight="balanced"
)
model.fit(X_train, y_train)

predictions = model.predict(X_test)

print("\nClassification Report:")
print(classification_report(y_test, predictions, zero_division=0))

print("Confusion Matrix:")
print(confusion_matrix(y_test, predictions))

model_path = MODEL_DIR / "alarm_model.joblib"
joblib.dump({"model": model, "features": features}, model_path)

print(f"\nModel saved successfully: {model_path}")
