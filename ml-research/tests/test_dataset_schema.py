from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from train import FEATURES, generate_synthetic_data


def test_synthetic_dataset_schema_and_quality() -> None:
    df = generate_synthetic_data(size=1024)

    expected = set(FEATURES + ["Class"])
    assert set(df.columns) == expected
    assert len(df) == 1024
    assert df.isna().sum().sum() == 0
    assert set(df["Class"].unique()).issubset({0, 1})
