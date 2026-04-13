from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "creditcard.csv"
ARTIFACTS_DIR = ROOT / "artifacts"
FEATURES = ["amount", "hour", "device_risk", "location_risk", "txn_velocity"]

def generate_synthetic_data(size: int = 30000) -> pd.DataFrame:
    rng = np.random.default_rng(SEED)
    amount = rng.lognormal(mean=8.8, sigma=0.8, size=size)
    hour = rng.integers(0, 24, size=size)
    device_risk = rng.uniform(0.0, 1.0, size=size)
    location_risk = rng.uniform(0.0, 1.0, size=size)
    txn_velocity = rng.poisson(2.0, size=size)

    score = 0.00002 * amount + 0.8 * (hour <= 4) + 1.4 * device_risk + 1.2 * location_risk + 0.15 * txn_velocity
    fraud = (score > 2.2).astype(int)

    return pd.DataFrame({"amount": amount, "hour": hour, "device_risk": device_risk, "location_risk": location_risk, "txn_velocity": txn_velocity, "Class": fraud})

def load_or_build_dataset() -> pd.DataFrame:
    if not DATA_PATH.exists():
        print("No Kaggle CSV found. Using synthetic training data.")
        return generate_synthetic_data()

    raw = pd.read_csv(DATA_PATH)
    amount = raw["Amount"].astype(float) if "Amount" in raw.columns else pd.Series(np.clip(np.random.lognormal(8.5, 0.7, len(raw)), 100, 2_000_000))
    hour = ((raw["Time"].astype(float) / 3600.0) % 24).astype(float) if "Time" in raw.columns else pd.Series(np.random.randint(0, 24, len(raw)))
    
    device_risk = raw.get("V14", pd.Series(np.random.normal(0, 1, len(raw)))).abs()
    location_risk = raw.get("V12", pd.Series(np.random.normal(0, 1, len(raw)))).abs()
    txn_velocity = raw.get("V10", pd.Series(np.random.normal(0, 1, len(raw)))).abs()

    amount = np.log1p(np.clip(amount, a_min=0, a_max=None))

    df = pd.DataFrame({
        "amount": amount, "hour": hour,
        "device_risk": (device_risk - device_risk.min()) / (device_risk.max() - device_risk.min() + 1e-9),
        "location_risk": (location_risk - location_risk.min()) / (location_risk.max() - location_risk.min() + 1e-9),
        "txn_velocity": np.clip(txn_velocity * 2.0, 0, 25),
        "Class": raw["Class"].astype(int),
    })
    return df.replace([np.inf, -np.inf], np.nan).dropna().reset_index(drop=True)

def build_model(input_dim: int) -> tf.keras.Model:
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(input_dim,)),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(8, activation="relu"),
        tf.keras.layers.Dense(1, activation="sigmoid"),
    ])
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss="binary_crossentropy", metrics=["accuracy", tf.keras.metrics.AUC(name="auc")])
    return model

def main() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    data = load_or_build_dataset()
    x = data[FEATURES]
    y = data["Class"].astype(int)

    x_train, x_val, y_train, y_val = train_test_split(x, y, test_size=0.2, random_state=SEED, stratify=y)
    scaler = StandardScaler()
    x_train_scaled = scaler.fit_transform(x_train)
    x_val_scaled = scaler.transform(x_val)

    model = build_model(input_dim=x_train_scaled.shape[1])
    early_stop = tf.keras.callbacks.EarlyStopping(monitor="val_auc", mode="max", patience=3, restore_best_weights=True)

    class_counts = y_train.value_counts().to_dict()
    class_weight = {cls: len(y_train) / (len(class_counts) * count) for cls, count in class_counts.items()}

    history = model.fit(x_train_scaled, y_train, validation_data=(x_val_scaled, y_val), epochs=20, batch_size=128, class_weight=class_weight, callbacks=[early_stop], verbose=1)

    val_loss, val_accuracy, val_auc = model.evaluate(x_val_scaled, y_val, verbose=0)
    model.save(ARTIFACTS_DIR / "fraud_model.h5")

    (ARTIFACTS_DIR / "scaler.json").write_text(json.dumps({"feature_names": FEATURES, "mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist()}, indent=2))
    
    metrics = {"val_loss": float(val_loss), "val_accuracy": float(val_accuracy), "val_auc": float(val_auc), "dataset_source": "kaggle" if DATA_PATH.exists() else "synthetic"}
    (ARTIFACTS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))

    print(f"Validation metrics: AUC={val_auc:.4f}, Acc={val_accuracy:.4f}")

    # PRODUCTION CHANGE: Real fraud models gate by AUC, not accuracy.
    if val_auc < 0.85:
        raise SystemExit(f"Quality gate failed: AUC {val_auc:.4f} < 0.85. Model rejected.")

if __name__ == "__main__":
    main()