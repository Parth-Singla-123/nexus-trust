# Fraud Detection Platform

Production-style fraud detection platform with edge inference, cloud stream analytics, and risk intelligence orchestration.

## Overview

The platform evaluates transactions in two coordinated stages:

- Edge scoring in the browser for sub-second pre-filtering
- Cloud analytics for rolling behavior analysis and higher-order anomaly detection

This architecture reduces backend noise, improves response time for obvious attacks, and continuously refines risk posture with historical context.

## Key Capabilities

- Real-time browser-side fraud inference using TensorFlow.js
- Server-side transaction validation, persistence, and forwarding
- Streaming enrichment with rolling windows in PySpark
- Statistical risk intelligence and blacklist generation in R
- Operational reporting outputs designed for Power BI
- CI/CD pipeline with model quality gates and Docker image publishing

## System Architecture

```text
Client (Next.js)
      -> Edge Scoring (TensorFlow.js)
                  -> block high-risk attempts locally
                  -> forward eligible transactions

API Layer (Next.js API + Prisma)
      -> validate and persist transaction
      -> update account state
      -> append event stream row
      -> enforce cloud blacklist policy

Stream Layer (PySpark)
      -> compute rolling 24h and 10m behavioral aggregates
      -> derive cloud_rule_risk
      -> export enriched feature stream

Risk Intelligence (R)
      -> rebalance rare fraud patterns
      -> cluster suspicious behavior cohorts
      -> compute user risk scores and fraud hotspots
      -> emit blacklist feedback

BI Layer (Power BI)
      -> operational risk command center
```

## Detection Strategy

### Edge model inputs

- amount
- hour
- device_risk
- location_risk
- txn_velocity

The client uses TensorFlow.js artifacts when available and falls back to a deterministic scoring path when model artifacts are unavailable.

Scoring basis:

$$
z = 0.00002\cdot amount + 0.8\cdot \mathbb{1}(hour \le 4) + 1.4\cdot device\_risk + 1.2\cdot location\_risk + 0.15\cdot txn\_velocity
$$

$$
p = \sigma(z - 2.2)
$$

Current local block policy:

- block when edge_fraud_probability >= 0.82

### Cloud stream rules

PySpark computes rolling behavior windows per user:

- rolling_total_spend_24h
- rolling_txn_count_24h
- rolling_avg_amount_24h
- rolling_blocked_count_24h
- rolling_txn_count_10m

Cloud rule escalation triggers when any condition matches:

- edge_fraud_probability >= 0.8
- rolling_txn_count_10m >= 4
- amount > 250000 and hour <= 4

### Risk intelligence layer

The R pipeline performs:

- fraud-class rebalancing to improve minority signal visibility
- k-means clustering for hidden fraud cohort discovery
- weighted risk scoring for user-level prioritization
- blacklist generation enforced by API pre-checks

Risk score composition:

- 30% amount
- 25% rolling_total_spend_24h
- 20% location_risk
- 20% device_risk
- 5% cloud_rule_risk

## Repository Structure

```text
fraud-detection-system/
|-- .github/
|   `-- workflows/
|       `-- ci-cd.yml
|-- analytics-r/
|   |-- Dockerfile
|   |-- README.md
|   |-- risk_analysis.R
|   `-- output/
|-- docs/
|   |-- architecture.md
|   `-- powerbi_layout.md
|-- edge-ui/
|   |-- Dockerfile
|   |-- package.json
|   |-- prisma/
|   |   |-- schema.prisma
|   |   `-- seed.js
|   |-- public/models/
|   `-- src/
|       |-- app/
|       |-- components/
|       `-- lib/
|-- ml-research/
|   |-- train.py
|   |-- convert.py
|   |-- requirements.txt
|   |-- requirements-convert.txt
|   |-- tests/
|   `-- artifacts/
|-- spark-engine/
|   |-- Dockerfile
|   |-- requirements.txt
|   `-- stream_processor.py
|-- docker-compose.yml
`-- README.md
```

## Services

- edge-ui: customer-facing interface, edge inference, auth/session APIs
- spark-engine: stream enrichment and rolling risk feature computation
- analytics-r: risk scoring, clustering, hotspot and blacklist export
- ml-research: model training, quality gating, TF.js conversion

## CI/CD

Pipeline definition: .github/workflows/ci-cd.yml

Execution flow:

1. Train and validate model quality
2. Run automated tests
3. Convert model artifacts for browser inference
4. Build and push container images to Docker Hub

Docker Hub repository outputs:

- fraud-edge-ui
- fraud-spark-engine
- fraud-analytics-r

Required CI secrets:

- DOCKERHUB_USERNAME
- DOCKERHUB_TOKEN

## Quick Start (Windows)

1. Configure environment values
2. Install UI dependencies and generate Prisma client
3. Train model and run tests
4. Convert TensorFlow artifacts
5. Start services with Docker Compose

Commands:

```powershell
cd edge-ui
npm install
Copy-Item .env.example .env
npm run prisma:generate
npx prisma db push

cd ..\ml-research
..\.venv310\Scripts\python.exe -m pip install -r requirements.txt
..\.venv310\Scripts\python.exe -m pytest -q tests
..\.venv310\Scripts\python.exe -m pip install -r requirements-convert.txt
..\.venv310\Scripts\python.exe train.py
..\.venv310\Scripts\python.exe convert.py

cd ..
docker compose up -d edge-ui spark-engine analytics-r
```

## Security

- Keep production secrets only in local runtime env files
- Commit placeholders only via edge-ui/.env.example
- Never embed credentials in source, compose, or workflow files
- Rotate credentials immediately after any potential exposure

## Operational Artifacts

- ml-research/artifacts/metrics.json
- edge-ui/public/models/model.json
- spark-engine/data/spark_features.csv
- analytics-r/output/risk_enriched_transactions.csv
- analytics-r/output/user_risk_scores.csv
- analytics-r/output/fraud_hotspots.csv
- analytics-r/output/blacklist.csv
