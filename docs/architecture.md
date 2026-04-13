# Architecture Diagram (Text)

```text
User (Next.js Edge UI)
  -> Edge Layer (TensorFlow.js tiny model)
      -> if high risk: block immediately
      -> if low risk: forward transaction
          -> API + PostgreSQL persistence
              -> Spark Engine reads real transaction file updates and computes rolling stats
              -> analytics-r/output/spark_features.csv
                  -> R Analytics (SMOTE + clustering + risk score)
                      -> user_risk_scores.csv / fraud_hotspots.csv
                          -> Power BI Risk Command Center
```

## Data Flow Summary

1. User submits transfer in UI.
2. Browser model predicts fraud probability.
3. Risky transfers are blocked before API call.
4. Approved transfers are persisted in PostgreSQL and forwarded to Spark input CSV.
5. Spark watch process continuously recomputes rolling behavior metrics from real incoming transactions.
6. R computes per-user risk scores.
7. Power BI visualizes current risk posture.
