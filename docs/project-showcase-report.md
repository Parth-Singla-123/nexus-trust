# Fraud Detection Platform: Project Showcase Report

## 1. Executive Summary

This project is an enterprise-style fraud detection platform designed to detect suspicious financial transactions in real time while maintaining strong backend intelligence.

The system uses a hybrid approach:

- Edge intelligence in the browser for instant fraud scoring before a transaction reaches the server
- Cloud intelligence for rolling behavior analysis, risk scoring, anomaly clustering, and account-level enforcement

This architecture balances speed, scalability, and security. Obvious threats are stopped immediately, while deeper suspicious patterns are detected over time from transaction history.

## 2. Problem Statement

Traditional fraud pipelines often process every transaction fully in the backend, increasing latency and compute cost.

The key problems addressed by this project are:

- Need for immediate risk response during user transfer actions
- Need to detect behavioral anomalies that only appear over time
- Need to unify model-based and rule-based decisioning
- Need for explainable outputs for analysts and dashboards

## 3. Project Objectives

- Detect transaction fraud signals at the point of interaction
- Reduce unnecessary backend load with edge pre-filtering
- Continuously compute user-level risk from streaming behavior
- Generate actionable intelligence for operations teams
- Automate model validation and container delivery via CI/CD

## 4. End-to-End Architecture

High-level transaction flow:

1. User submits a transfer from the Next.js portal
2. Browser runs TensorFlow.js inference with transactional risk features
3. Edge blocks high-risk attempts instantly or forwards eligible transactions
4. API validates payload and persists to PostgreSQL via Prisma
5. API appends stream events to shared transaction feed for Spark
6. Spark computes rolling windows and cloud rule risk flags
7. R analytics performs balancing, clustering, and risk score generation
8. R writes blacklist and hotspot outputs
9. API checks blacklist in real time to enforce cloud-driven hard denial
10. Power BI consumes output files for operational decision dashboards

## 5. Component Breakdown

### 5.1 Edge Layer (Next.js + TensorFlow.js)

Core responsibilities:

- Capture user transaction intent from the transfer form
- Compute device and location context signals
- Run local fraud probability inference with model artifacts
- Apply immediate block threshold for high-confidence anomalies

Primary feature inputs:

- amount
- hour
- device_risk
- location_risk
- txn_velocity

Core implementation files:

- [edge-ui/src/components/TransferForm.tsx](../edge-ui/src/components/TransferForm.tsx)
- [edge-ui/src/lib/tfjs-logic.ts](../edge-ui/src/lib/tfjs-logic.ts)

### 5.2 API and Persistence Layer (Next.js API + Prisma + PostgreSQL)

Core responsibilities:

- Validate transaction payloads
- Persist approved and blocked transaction records
- Update account balance for approved transfers
- Forward stream-ready transaction data to Spark input
- Enforce R-generated blacklist before transaction processing

Core implementation files:

- [edge-ui/src/app/api/transactions/route.ts](../edge-ui/src/app/api/transactions/route.ts)
- [edge-ui/prisma/schema.prisma](../edge-ui/prisma/schema.prisma)

### 5.3 Stream Analytics Layer (PySpark)

Core responsibilities:

- Ingest continuous transaction stream
- Normalize and cast transaction features
- Compute rolling behavioral windows
- Derive cloud_rule_risk based on risk conditions
- Output enriched feature dataset for risk analytics

Key rolling metrics:

- rolling_total_spend_24h
- rolling_txn_count_24h
- rolling_avg_amount_24h
- rolling_blocked_count_24h
- rolling_txn_count_10m

Core implementation file:

- [spark-engine/stream_processor.py](../spark-engine/stream_processor.py)

### 5.4 Risk Intelligence Layer (R)

Core responsibilities:

- Handle class imbalance in suspicious events
- Detect hidden behavioral groups via clustering
- Compute weighted user risk scores
- Generate blacklist and fraud hotspots

Risk score dimensions:

- transaction amount exposure
- rolling spend behavior
- device and location risk
- cloud rule fraud flags

Core implementation file:

- [analytics-r/risk_analysis.R](../analytics-r/risk_analysis.R)

### 5.5 BI Layer (Power BI)

Core responsibilities:

- Visualize fraud hotspots
- Rank high-risk users
- Track trend and operational posture
- Provide command-center style insights for stakeholders

Supporting docs:

- [docs/powerbi_layout.md](powerbi_layout.md)

## 6. Fraud Flagging and Blocking Logic

This platform uses layered controls.

### 6.1 Immediate Edge Blocking

The edge model computes probability at transaction time.

- If probability crosses local threshold, transfer is marked blocked at the client layer
- This provides sub-second preventive control for obvious anomalies

### 6.2 Cloud Rule Flagging (Spark)

Spark marks cloud_rule_risk when conditions indicate suspicious behavior, such as:

- high edge probability from incoming events
- micro-burst activity in short windows
- high-value transactions during unusual time periods

Spark itself flags and enriches data; it does not directly issue user-facing block responses.

### 6.3 Hard Blocking via Blacklist (R + API)

R analytics produces blacklist.csv for high-risk user IDs.

The API checks blacklist before accepting new transactions:

- If user is blacklisted, API returns denial
- This is the cloud intelligence enforcement loop

## 7. Why This Project Is Innovative

### 7.1 Hybrid Edge + Cloud Intelligence

Most implementations run only a backend model. This project combines instant local inference with deeper historical analysis.

### 7.2 Closed Feedback Loop

Cloud analytics output directly affects future API decisions through blacklist checks.

### 7.3 Multi-Disciplinary Stack in One Platform

The project integrates:

- Modern web product layer
- Real-time stream analytics
- Statistical risk intelligence
- Operational BI reporting
- Automated DevOps pipeline

### 7.4 Practical Fraud Features

The logic focuses on realistic banking risk indicators:

- transaction velocity
- device trust behavior
- location abnormality
- time-of-day anomaly
- rolling spending patterns

## 8. Crucial Engineering Decisions

- Shared data directory pattern between services for low-friction stream exchange
- Spark and pandas fallback mode for resilience
- Model quality gates in CI to avoid shipping degraded models
- Separate model training and conversion pipeline for browser deployment compatibility
- Secret hygiene: runtime env injection with committed templates only

## 9. Data and Model Pipeline

Training flow:

1. Load Kaggle credit card dataset when available
2. Engineer deployment-oriented features
3. Train dense neural network model
4. Enforce validation quality gate
5. Export model and scaler artifacts
6. Convert model to TensorFlow.js for browser runtime

Relevant files:

- [ml-research/train.py](../ml-research/train.py)
- [ml-research/convert.py](../ml-research/convert.py)
- [ml-research/tests/test_accuracy_gate.py](../ml-research/tests/test_accuracy_gate.py)
- [ml-research/tests/test_dataset_schema.py](../ml-research/tests/test_dataset_schema.py)

Model evaluation is governed primarily by ROC-AUC, which is more reliable than accuracy for an imbalanced fraud dataset.

## 10. DevOps and Delivery

Containerization:

- Frontend, Spark engine, and R analytics are containerized
- Service orchestration is handled via Docker Compose

CI/CD pipeline:

- Trains and tests model in CI
- Converts and publishes browser model artifacts
- Builds and pushes Docker images to Docker Hub after successful validation

Relevant files:

- [docker-compose.yml](../docker-compose.yml)
- [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml)

## 11. Security and Operational Safety

- Real secrets remain local in runtime env files
- Placeholder templates are committed for reproducibility
- Blacklist-driven denial prevents repeated high-risk activity
- Fraud decisioning remains auditable through persisted records and exports

## 12. Current Strengths

- Complete end-to-end flow from transaction to dashboard
- Practical feature engineering and fraud logic
- Hybrid prevention plus intelligence architecture
- CI/CD-integrated model governance and deployment

## 13. Current Limitations

- Spark input currently file-based, not message-broker based
- Blacklist enforcement is file-backed and eventually consistent
- Explainability can be extended with richer reason codes per decision
- No dedicated online feature store yet

## 14. Recommended Future Enhancements

- Move streaming from CSV to Kafka for scale and reliability
- Add model drift monitoring and alerting
- Add feature store for low-latency reusable risk features
- Introduce role-based fraud operations dashboard with approvals
- Add canary model rollout with rollback in CI/CD

## 15. Project Repository Structure

See full structure and module ownership in:

- [README.md](../README.md)

## 16. Suggested Presentation Flow (10-12 minutes)

1. Business problem and why fraud pipelines need edge + cloud
2. Architecture walkthrough with transaction lifecycle
3. Live or recorded flow: transfer, edge score, API persistence
4. Spark rolling behavior and rule flag explanation
5. R risk scoring and blacklist feedback loop
6. Power BI command-center outputs
7. CI/CD and quality-gate automation
8. Innovation summary and future roadmap

## 17. Evaluation Summary Statement

This project demonstrates a production-relevant fraud detection architecture that combines fast local decisioning, scalable cloud analytics, and continuous risk intelligence feedback. It is technically complete, operationally structured, and extensible toward enterprise-grade deployment patterns.
