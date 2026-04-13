# Hybrid Fraud Detection System (Edge + Cloud)

This project is a realistic fintech-style fraud platform for college-level demonstration:

- Unit I TinyML: browser-side fraud scoring and instant block
- PostgreSQL + Prisma: persistent users, sessions, financial profiles, and ledger history
- Unit IV Spark: rolling behavior features and stream enrichment
- Unit II R analytics: imbalance handling, clustering, and per-user risk scoring
- Unit III Power BI: command-center dashboard from CSV exports
- Unit V DevOps for AI: accuracy gate, model conversion, Dockerized delivery, CI pipeline

## System Flow

1. User signs up or logs in via secure API-backed auth pages.
2. User profile and financial data are loaded from PostgreSQL.
3. User submits a transfer in Next.js edge UI.
4. TensorFlow.js model (or local heuristic fallback) returns fraud probability instantly.
5. Every transfer decision is stored in PostgreSQL with risk/explainability fields.
6. Approved transfer is also appended to spark-engine input CSV through API route.
7. Spark computes rolling user statistics and exports feature table.
8. R script generates risk scores and hotspot summaries.
9. Power BI reads output CSV files and renders dashboard visuals.

## Repository Layout

fraud-detection-system/
- ml-research/ (training, tests, conversion, artifacts)
- edge-ui/ (Next.js simulation and edge fraud check)
- spark-engine/ (stream simulation and rolling feature generation)
- analytics-r/ (risk analytics and Power BI-ready outputs)
- .github/workflows/ci-cd.yml (MLOps pipeline)
- docker-compose.yml (service orchestration)

## Dataset

- Kaggle dataset expected at ml-research/data/creditcard.csv
- Required columns: Time, Amount, V1..V28, Class
- Training maps high-dimensional raw data into edge-usable features:
  - amount (log scaled)
  - hour
  - device_risk
  - location_risk
  - txn_velocity

## Local Setup (Windows)

Note: Docker is used for `edge-ui` and `spark-engine`. PostgreSQL is expected to be externally hosted (Prisma/managed provider).

1. Frontend dependencies
   - cd edge-ui
   - npm install
   - copy .env.example to .env
   - set DATABASE_URL and JWT_SECRET
   - npx prisma db push
   - npm run prisma:generate

2. Python environment (TensorFlow compatible)
   - cd ..
   - py -3.10 -m venv .venv310
   - .venv310\Scripts\python.exe -m pip install -r ml-research/requirements.txt

3. Train model and run accuracy gate
   - cd ml-research
   - ..\.venv310\Scripts\python.exe train.py
   - ..\.venv310\Scripts\python.exe -m pytest tests -q

4. Convert model
   - ..\.venv310\Scripts\python.exe -m pip install -r requirements-convert.txt
   - ..\.venv310\Scripts\python.exe convert.py
   - If conversion fails on Windows due tensorflowjs native dependency chain, run conversion in GitHub Actions Linux runner.

5. Start edge app
   - cd ..\edge-ui
   - npm run dev

6. Generate Spark and R outputs
   - preferred: docker compose up -d spark-engine
   - alternative local run: install Java 17, then:
     - cd ..\spark-engine
     - ..\.venv310\Scripts\python.exe -m pip install -r requirements.txt
     - ..\.venv310\Scripts\python.exe stream_processor.py --watch
   - generate real transactions from UI (/dashboard transfer form)
   - stop Spark process after enough rows are ingested
   - cd ..\analytics-r
   - Rscript risk_analysis.R

7. Authentication + data pages
   - /signup (create account)
   - /login (login)
   - /dashboard (live decisioning + KPIs)
   - /transactions (persisted ledger)
   - /profile (financial profile update)

## Prisma Setup (Required)

Create `edge-ui/.env` with:

- `DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require`
- `JWT_SECRET=replace-with-a-long-random-secret`

Optional for advanced setups:

- `DIRECT_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require`
- `SHADOW_DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_SHADOW?schema=public&sslmode=require`
   (used by `prisma migrate dev` in managed environments)

Bootstrap Prisma and seed starter data:

1. `cd edge-ui`
2. `npm install`
3. `npm run prisma:generate`
4. `npx prisma db push`
5. `npm run prisma:seed`
6. `npm run dev`

Run Docker services (without database):

1. ensure `edge-ui/.env` has `DATABASE_URL` and `JWT_SECRET`
2. from project root run `docker compose up -d edge-ui spark-engine`

Seeded login users:

- `alice@fraudops.demo` / `Alice@1234`
- `bob@fraudops.demo` / `Bob@1234`

## Key Output Files

- ml-research/artifacts/metrics.json
- ml-research/artifacts/dataset_profile.json
- analytics-r/output/spark_features.csv
- analytics-r/output/risk_enriched_transactions.csv
- analytics-r/output/user_risk_scores.csv
- analytics-r/output/fraud_hotspots.csv

## CI/CD Pipeline

Workflow file: .github/workflows/ci-cd.yml

Pipeline stages:
1. Train model with accuracy gate
2. Run pytest gate
3. Convert Keras model to TensorFlow.js artifacts
4. Upload model artifacts
5. Download artifacts into edge-ui image build context
6. Build and push Docker images to Docker Hub (edge-ui, spark-engine, analytics-r) on push to main/master

Required GitHub repository secrets:
- DOCKERHUB_USERNAME
- DOCKERHUB_TOKEN

## Handling Real Env Values Safely

If your `.env` contains real database/API secrets:

1. Keep secrets only in local `edge-ui/.env` (already gitignored)
2. Commit only `edge-ui/.env.example` with placeholder values
3. Never copy real secrets into Dockerfiles, compose files, or GitHub workflow YAML
4. For production containers, inject env at runtime via `--env-file` or compose `env_file`
5. If any secret was ever committed, rotate/revoke it immediately

Example runtime start from Docker Hub image:

`docker run --env-file edge-ui/.env -p 3000:3000 <dockerhub-username>/fraud-edge-ui:latest`
