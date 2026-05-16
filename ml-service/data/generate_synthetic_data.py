"""
Generate synthetic training data for GoalForge ML models.
Run: python generate_synthetic_data.py
"""
import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)
N = 500
OUT = Path(__file__).parent

# --- Achievement Prediction Dataset ---
dept = np.random.choice([0, 1, 2], N)       # 0=Engineering, 1=Sales, 2=Operations
thrust = np.random.choice([0, 1, 2], N)     # 0=Innovation, 1=Revenue, 2=OpsEx
uom = np.random.choice([0, 1, 2, 3], N)     # MIN MAX TIMELINE ZERO
weightage = np.random.uniform(10, 80, N)
num_goals = np.random.randint(1, 9, N)
days_submit = np.random.randint(1, 60, N)
mgr_freq = np.random.uniform(0, 1, N)

q1 = np.clip(np.random.normal(65, 20, N), 0, 120)
q2 = np.clip(q1 + np.random.normal(3, 10, N), 0, 120)
q3 = np.clip(q2 + np.random.normal(2, 10, N), 0, 120)
# Q4 is correlated with Q1 (strongest predictor) + some noise
q4 = np.clip(0.5*q1 + 0.3*q2 + 0.1*q3 + np.random.normal(5, 8, N), 0, 120)

df_achieve = pd.DataFrame({
    'uom_type': uom, 'weightage': weightage, 'num_goals': num_goals,
    'q1_score': q1, 'q2_score': q2, 'q3_score': q3,
    'days_to_submit': days_submit, 'manager_checkin_freq': mgr_freq,
    'department_encoded': dept, 'thrust_area_encoded': thrust,
    'q4_final_score': q4,
})
df_achieve.to_csv(OUT / 'achievement_data.csv', index=False)
print(f"Saved achievement_data.csv ({len(df_achieve)} rows)")

# --- Goal Quality Dataset (text + SMART labels) ---
templates = {
    'Excellent': [
        "Increase monthly recurring revenue by 15% from $2M to $2.3M by Q4 2025 through upselling existing enterprise accounts.",
        "Reduce customer churn rate from 8% to 5% by end of Q3 by launching a proactive success outreach program.",
        "Launch 2 new product features (A and B) by September 30, measured by deployment to 100% of customers.",
    ],
    'Good': [
        "Improve customer satisfaction scores to 90% by implementing a quarterly feedback loop.",
        "Reduce operational costs by 10% through process automation in Q2 and Q3.",
        "Complete digital transformation project by year end with all 5 departments migrated.",
    ],
    'Needs Work': [
        "Improve team performance this year by doing better work and being more efficient.",
        "Try to get more sales leads and convert them to customers throughout the year.",
        "Work on improving our processes to be faster and better than before.",
    ],
    'Poor': [
        "Be a better employee and contribute more to the team.",
        "Do marketing stuff and help with sales.",
        "Improve things generally in my area of responsibility.",
    ],
}
label_map = {'Excellent': 3, 'Good': 2, 'Needs Work': 1, 'Poor': 0}

rows = []
for label, texts in templates.items():
    for _ in range(N // 4):
        t = texts[np.random.randint(len(texts))]
        rows.append({'text': t, 'quality_label': label_map[label], 'quality_score': 25 * label_map[label] + np.random.uniform(0, 25)})

df_quality = pd.DataFrame(rows)
df_quality.to_csv(OUT / 'quality_data.csv', index=False)
print(f"Saved quality_data.csv ({len(df_quality)} rows)")

# --- Anomaly Dataset ---
avg_status = np.random.uniform(0, 1, N)
avg_progress = np.clip(np.random.normal(65, 20, N), 0, 120)
std_scores = np.abs(np.random.normal(15, 8, N))
delta = np.random.normal(5, 15, N)

# Anomaly: high status but low actual progress
is_anomaly = ((avg_status > 0.7) & (avg_progress < 50)).astype(int)

df_anomaly = pd.DataFrame({
    'avg_reported_status_score': avg_status,
    'avg_actual_progress_score': avg_progress,
    'std_dev_of_scores': std_scores,
    'q1_to_q2_delta': delta,
    'is_anomaly': is_anomaly,
})
df_anomaly.to_csv(OUT / 'anomaly_data.csv', index=False)
print(f"Saved anomaly_data.csv ({len(df_anomaly)} rows)")
print("Data generation complete.")
