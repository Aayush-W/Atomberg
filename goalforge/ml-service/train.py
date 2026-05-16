"""
Train all ML models and save them.
Run from ml-service/: python train.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np
import joblib
from pathlib import Path

DATA = Path(__file__).parent / 'data'
MODELS = Path(__file__).parent / 'models' / 'saved'
MODELS.mkdir(parents=True, exist_ok=True)

# --- 1. Generate data first ---
print("Generating synthetic data...")
exec(open(DATA / 'generate_synthetic_data.py').read())

# --- 2. Achievement Predictor (XGBoost) ---
print("\nTraining achievement predictor...")
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

df = pd.read_csv(DATA / 'achievement_data.csv')
FEAT = ['q1_score', 'q2_score', 'q3_score', 'uom_type', 'weightage', 'num_goals', 'days_to_submit', 'manager_checkin_freq']
X, y = df[FEAT], df['q4_final_score']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

model = XGBRegressor(n_estimators=200, max_depth=5, learning_rate=0.05, random_state=42)
model.fit(X_tr, y_tr)
score = model.score(X_te, y_te)
print(f"  R² = {score:.3f}")
joblib.dump({'model': model, 'features': FEAT}, MODELS / 'achievement_predictor.pkl')
print("  Saved achievement_predictor.pkl")

# --- 3. Goal Quality Classifier (TF-IDF + Logistic Regression) ---
print("\nTraining goal quality classifier...")
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

df_q = pd.read_csv(DATA / 'quality_data.csv')
X_q, y_q = df_q['text'], df_q['quality_label']
X_tr, X_te, y_tr, y_te = train_test_split(X_q, y_q, test_size=0.2, random_state=42)

pipe = Pipeline([('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000)), ('clf', LogisticRegression(max_iter=1000, random_state=42))])
pipe.fit(X_tr, y_tr)
print(classification_report(y_te, pipe.predict(X_te), target_names=['Poor','Needs Work','Good','Excellent']))
joblib.dump(pipe, MODELS / 'goal_quality.pkl')
print("  Saved goal_quality.pkl")

# --- 4. Anomaly Detector (Isolation Forest) ---
print("\nTraining anomaly detector...")
from sklearn.ensemble import IsolationForest

df_a = pd.read_csv(DATA / 'anomaly_data.csv')
FEAT_A = ['avg_reported_status_score', 'avg_actual_progress_score', 'std_dev_of_scores', 'q1_to_q2_delta']
iso = IsolationForest(n_estimators=200, contamination=0.1, random_state=42)
iso.fit(df_a[FEAT_A])
joblib.dump({'model': iso, 'features': FEAT_A}, MODELS / 'anomaly_detector.pkl')
print("  Saved anomaly_detector.pkl")

print("\n✅ All models trained and saved to models/saved/")
