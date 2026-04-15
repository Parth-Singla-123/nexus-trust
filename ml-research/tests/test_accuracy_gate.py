from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
METRICS = ROOT / "artifacts" / "metrics.json"


def test_accuracy_gate() -> None:
    if not METRICS.exists():
        subprocess.check_call([sys.executable, "train.py"], cwd=ROOT)

    metrics = json.loads(METRICS.read_text(encoding="utf-8"))
    assert "val_auc" in metrics, "ROC-AUC metric missing from metrics.json"
    assert metrics["val_auc"] >= 0.85, (
        f"ROC-AUC gate failed in CI: {metrics['val_auc']:.4f} < 0.85"
    )
