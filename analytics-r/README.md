Power BI source files will be generated here:

- spark_features.csv
- risk_enriched_transactions.csv
- user_risk_scores.csv
- fraud_hotspots.csv

Refresh these files by running:

1. python ../spark-engine/stream_processor.py --watch
	(or run: docker compose up -d spark-engine)
2. create real transfers from edge-ui (/dashboard)
3. stop Spark watcher after data is generated
4. Rscript risk_analysis.R
