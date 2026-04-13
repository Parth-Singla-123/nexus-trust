# Dataset Notes

Place Kaggle dataset file here:
- creditcard.csv

Expected schema:
- Time, V1..V28, Amount, Class

Project behavior:
- train.py automatically detects this file.
- If file is missing, training falls back to synthetic data for demo continuity.
- dataset_profile.json in ml-research/artifacts records source and class distribution used during training.
