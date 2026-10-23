
import json
import sys
from pathlib import Path

import joblib
import pandas as pd

BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "models" / "alarm_model.joblib"

try:
    payload = json.load(sys.stdin)

    saved = joblib.load(MODEL_PATH)
    model = saved["model"]
    features = saved["features"]

    values = {
        "Baby Temperature (°C)": float(payload["babyTemp"]),
        "Movement": int(payload["movement"]),
    }

    sample = pd.DataFrame(
        [[values[feature] for feature in features]],
        columns=features,
    )

    prediction = int(model.predict(sample)[0])
    probabilities = model.predict_proba(sample)[0]
    classes = list(model.classes_)

    alarm_probability = (
        float(probabilities[classes.index(1)])
        if 1 in classes else 0.0
    )

    print(json.dumps({
        "mlPrediction": prediction,
        "mlAlarmProbability": round(alarm_probability, 4),
    }))

except Exception as error:
    print(json.dumps({"error": str(error)}))
    sys.exit(1)
