# Power BI Risk Command Center Layout

Use these CSV files from `analytics-r/output/`:

- `spark_features.csv`
- `user_risk_scores.csv`
- `fraud_hotspots.csv`

## Suggested Visuals

1. Fraud Hotspots (Geo/Simulated)
- Visual: Map or filled map
- Fields: `hour` as pseudo-region bucket, `fraud_events` as intensity

2. Transaction Trends
- Visual: Line chart
- Axis: `event_time`
- Values: `amount`, `rolling_total_spend_24h`

3. High-Risk Users
- Visual: Bar chart or table
- Axis: `user_id`
- Values: `risk_score`

4. Fraud vs Normal Ratio
- Visual: Donut chart
- Legend: `status`
- Values: count of `transaction_id`

## Refresh Setup

- Set file source refresh to every 1-5 minutes for near-real-time simulation.
