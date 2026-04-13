from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from types import ModuleType
from unittest.mock import MagicMock

import tensorflow as tf

# =====================================================================
# THE WINDOWS FIX: 
# tensorflowjs crashes on Windows because it tries to load a Linux .so 
# file for Decision Forests. Since we are using a standard Keras Dense 
# Network, we can mock the module to bypass the crash!
# =====================================================================
sys.modules["tensorflow_decision_forests"] = MagicMock()

# tensorflowjs imports JAX conversion modules even when converting Keras models.
# Provide a tiny shim so environments without jax can still run this script.
if "jax" not in sys.modules:
    jax_mod = ModuleType("jax")
    jax_exp_mod = ModuleType("jax.experimental")
    jax_exp_mod.jax2tf = MagicMock()
    jax_mod.experimental = jax_exp_mod
    sys.modules["jax"] = jax_mod
    sys.modules["jax.experimental"] = jax_exp_mod

ROOT = Path(__file__).resolve().parent
ARTIFACTS = ROOT / "artifacts"
H5_PATH = ARTIFACTS / "fraud_model.h5"
SCALER_PATH = ARTIFACTS / "scaler.json"

EDGE_MODEL_DIR = (ROOT / ".." / "edge-ui" / "public" / "models").resolve()


def main() -> None:
    if not H5_PATH.exists():
        raise FileNotFoundError(f"Missing model file: {H5_PATH}")

    EDGE_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Clear old model shards so edge-ui never serves stale files.
    for stale in EDGE_MODEL_DIR.glob("*"):
        if stale.is_file():
            stale.unlink()

    print("Loading trained Keras model...")
    model = tf.keras.models.load_model(H5_PATH)

    try:
        import tensorflowjs as tfjs
        print("Converting model to TensorFlow.js format...")
        tfjs.converters.save_keras_model(model, str(EDGE_MODEL_DIR))
    except Exception as exc:
        raise RuntimeError("TensorFlow.js conversion failed.") from exc

    if SCALER_PATH.exists():
        shutil.copy2(SCALER_PATH, EDGE_MODEL_DIR / "scaler.json")

    metrics_path = ARTIFACTS / "metrics.json"
    if metrics_path.exists():
        metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
        (EDGE_MODEL_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"✅ TF.js model successfully exported to: {EDGE_MODEL_DIR}")


if __name__ == "__main__":
    main()