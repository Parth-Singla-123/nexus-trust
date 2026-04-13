from __future__ import annotations
import argparse
import time
from pathlib import Path
from typing import Optional
import os

import pandas as pd
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.window import Window

ROOT = Path(__file__).resolve().parent
SHARED_DATA_DIR = Path(os.environ.get("SHARED_DATA_DIR", ROOT / "data"))

DEFAULT_INPUT_CSV = SHARED_DATA_DIR / "transactions.csv"
DEFAULT_OUTPUT_CSV = SHARED_DATA_DIR / "spark_features.csv"

REQUIRED_COLUMNS = ["transaction_id", "user_id", "amount", "event_time", "hour", "device_risk", "location_risk", "txn_velocity", "edge_fraud_probability", "status"]

def _build_spark() -> Optional[SparkSession]:
    try:
        return SparkSession.builder.appName("FraudStreamProcessor").master("local[*]").getOrCreate()
    except Exception as exc:
        print(f"[spark] Spark unavailable ({exc}). Falling back to pandas mode.")
        return None

def _read_transactions_spark(spark: SparkSession, input_csv: Path):
    if not input_csv.exists(): return None
    df = spark.read.option("header", True).csv(str(input_csv))

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        print(f"[spark] Missing required columns in input: {missing}")
        return None
    
    normalized = (
        df.select(*REQUIRED_COLUMNS)
        .withColumn("amount", F.col("amount").cast("double"))
        .withColumn("hour", F.col("hour").cast("int"))
        .withColumn("device_risk", F.col("device_risk").cast("double"))
        .withColumn("location_risk", F.col("location_risk").cast("double"))
        .withColumn("txn_velocity", F.col("txn_velocity").cast("double"))
        .withColumn("edge_fraud_probability", F.col("edge_fraud_probability").cast("double"))
        .withColumn("event_ts", F.to_timestamp("event_time"))
        .filter(F.col("transaction_id").isNotNull())
    )
    
    dedupe_window = Window.partitionBy("transaction_id").orderBy(F.col("event_ts").desc())
    return normalized.withColumn("row_num", F.row_number().over(dedupe_window)).filter(F.col("row_num") == 1).drop("row_num")

def _read_transactions_pandas(input_csv: Path) -> Optional[pd.DataFrame]:
    if not input_csv.exists():
        return None

    raw = pd.read_csv(input_csv)
    missing = [col for col in REQUIRED_COLUMNS if col not in raw.columns]
    if missing:
        print(f"[spark] Missing required columns in input: {missing}")
        return None

    df = raw[REQUIRED_COLUMNS].copy()
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["hour"] = pd.to_numeric(df["hour"], errors="coerce")
    df["device_risk"] = pd.to_numeric(df["device_risk"], errors="coerce")
    df["location_risk"] = pd.to_numeric(df["location_risk"], errors="coerce")
    df["txn_velocity"] = pd.to_numeric(df["txn_velocity"], errors="coerce")
    df["edge_fraud_probability"] = pd.to_numeric(df["edge_fraud_probability"], errors="coerce")
    df["event_ts"] = pd.to_datetime(df["event_time"], errors="coerce")

    df = df[df["transaction_id"].notna() & df["event_ts"].notna()].copy()
    if df.empty:
        return df

    df = df.sort_values("event_ts").drop_duplicates(subset=["transaction_id"], keep="last")
    return df

def _compute_features_spark(df):
    enriched = df.withColumn("event_unix", F.col("event_ts").cast("long")).withColumn("is_blocked", F.when(F.col("status") == "blocked", F.lit(1)).otherwise(F.lit(0)))

    # Standard 24h Window
    window_24h = Window.partitionBy("user_id").orderBy(F.col("event_unix")).rangeBetween(-24 * 60 * 60, 0)
    # PRODUCTION CHANGE: Micro-Burst 10-Minute Window
    window_10m = Window.partitionBy("user_id").orderBy(F.col("event_unix")).rangeBetween(-10 * 60, 0)

    return (
        enriched.withColumn("rolling_total_spend_24h", F.sum("amount").over(window_24h))
        .withColumn("rolling_txn_count_24h", F.count("transaction_id").over(window_24h))
        .withColumn("rolling_avg_amount_24h", F.avg("amount").over(window_24h))
        .withColumn("rolling_blocked_count_24h", F.sum("is_blocked").over(window_24h))
        .withColumn("rolling_txn_count_10m", F.count("transaction_id").over(window_10m)) 
        .withColumn(
            "cloud_rule_risk",
            F.when(F.col("edge_fraud_probability") >= 0.8, F.lit(1))
            .when(F.col("rolling_txn_count_10m") >= 4, F.lit(1)) # Flag Burst Anomalies!
            .when((F.col("amount") > 250000) & (F.col("hour") <= 4), F.lit(1))
            .otherwise(F.lit(0)),
        )
    ).orderBy(F.col("event_ts").asc())

def _compute_features_pandas(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    working = df.copy()
    working["is_blocked"] = (working["status"] == "blocked").astype(int)
    working = working.sort_values(["user_id", "event_ts"])

    def _enrich_group(group: pd.DataFrame) -> pd.DataFrame:
        user_id = group.name
        g = group.sort_values("event_ts").set_index("event_ts")
        g["rolling_total_spend_24h"] = g["amount"].rolling("24h", min_periods=1).sum()
        g["rolling_txn_count_24h"] = g["transaction_id"].rolling("24h", min_periods=1).count()
        g["rolling_avg_amount_24h"] = g["amount"].rolling("24h", min_periods=1).mean()
        g["rolling_blocked_count_24h"] = g["is_blocked"].rolling("24h", min_periods=1).sum()
        g["rolling_txn_count_10m"] = g["transaction_id"].rolling("10min", min_periods=1).count()
        out = g.reset_index()
        out["user_id"] = user_id
        return out

    enriched = working.groupby("user_id", group_keys=False).apply(_enrich_group, include_groups=False)
    enriched["cloud_rule_risk"] = (
        (enriched["edge_fraud_probability"] >= 0.8)
        | (enriched["rolling_txn_count_10m"] >= 4)
        | ((enriched["amount"] > 250000) & (enriched["hour"] <= 4))
    ).astype(int)
    return enriched.sort_values("event_ts")

def _write_output(feature_df, output_csv: Path) -> int:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    temp_csv = output_csv.with_suffix(".tmp.csv")
    pandas_df = feature_df.toPandas() if hasattr(feature_df, "toPandas") else feature_df
    pandas_df.to_csv(temp_csv, index=False)
    temp_csv.replace(output_csv)
    return len(pandas_df)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-csv", type=Path, default=DEFAULT_INPUT_CSV)
    parser.add_argument("--output-csv", type=Path, default=DEFAULT_OUTPUT_CSV)
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--poll-seconds", type=int, default=8)
    parser.add_argument("--engine", choices=["auto", "spark", "pandas"], default="auto")
    args = parser.parse_args()

    spark = None
    if args.engine in ("auto", "spark"):
        spark = _build_spark()
    if args.engine == "spark" and spark is None:
        raise RuntimeError("Spark engine requested but could not be initialized.")

    def process_once() -> None:
        nonlocal spark
        if spark is not None:
            try:
                transactions_df = _read_transactions_spark(spark, args.input_csv)
                if transactions_df is not None and transactions_df.head(1) != []:
                    _write_output(_compute_features_spark(transactions_df), args.output_csv)
                return
            except Exception as exc:
                print(f"[spark] Spark processing failed ({exc}). Switching to pandas mode.")
                spark = None

        transactions_df_pd = _read_transactions_pandas(args.input_csv)
        if transactions_df_pd is not None and not transactions_df_pd.empty:
            _write_output(_compute_features_pandas(transactions_df_pd), args.output_csv)

    if not args.watch:
        process_once()
        return

    runtime = "spark" if spark is not None else "pandas"
    print(f"[spark] Watch mode started with {runtime} engine. Monitoring micro-bursts...")
    while True:
        process_once()
        time.sleep(max(1, args.poll_seconds))

if __name__ == "__main__":
    main()