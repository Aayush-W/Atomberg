"""
GoalForge ML Service — FastAPI
Run: uvicorn main:app --host 0.0.0.0 --port 8001
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
import os

app = FastAPI(title="GoalForge ML Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODELS_DIR = Path(__file__).parent / 'models' / 'saved'

# ─── Load models at startup ───────────────────────────────────────────────────
achievement_model = None
quality_model = None
anomaly_model = None

THRUST_AREAS = ['Innovation', 'Revenue Growth', 'Operational Excellence']

@app.on_event("startup")
async def load_models():
    global achievement_model, quality_model, anomaly_model
    try:
        if (MODELS_DIR / 'achievement_predictor.pkl').exists():
            achievement_model = joblib.load(MODELS_DIR / 'achievement_predictor.pkl')
            print("Loaded achievement_predictor")
        if (MODELS_DIR / 'goal_quality.pkl').exists():
            quality_model = joblib.load(MODELS_DIR / 'goal_quality.pkl')
            print("Loaded goal_quality")
        if (MODELS_DIR / 'anomaly_detector.pkl').exists():
            anomaly_model = joblib.load(MODELS_DIR / 'anomaly_detector.pkl')
            print("Loaded anomaly_detector")
    except Exception as e:
        print(f"Model load warning: {e}")

# ─── Schemas ─────────────────────────────────────────────────────────────────

class AchievementRequest(BaseModel):
    employeeId: str
    cycleId: str
    goals: Optional[List[Dict[str, Any]]] = []
    q1Score: Optional[float] = 50.0
    q2Score: Optional[float] = 55.0
    q3Score: Optional[float] = 0.0
    numGoals: Optional[int] = 3
    daysToSubmit: Optional[int] = 10
    managerCheckinFreq: Optional[float] = 0.5

class GoalQualityRequest(BaseModel):
    title: str
    description: str

class AnomalyRequest(BaseModel):
    employee_ids: Optional[List[str]] = None
    employees: Optional[List[Dict[str, Any]]] = []

class ThrustAreaRequest(BaseModel):
    title: str
    description: str

class SentimentRequest(BaseModel):
    comments: List[str]

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "goalforge-ml"}

@app.post("/predict-achievement")
def predict_achievement(req: AchievementRequest):
    """Predict Q4 achievement score for an employee."""
    if achievement_model is None:
        # Fallback: return mock predictions based on Q1/Q2 scores
        mock_score = min(120, (req.q1Score or 50) * 0.5 + (req.q2Score or 55) * 0.3 + 20)
        return [{
            "goalId": f"goal-{i}", "goalTitle": f"Goal {i+1}",
            "predictedScore": round(mock_score + np.random.normal(0, 5), 1),
            "confidenceInterval": [max(0, mock_score - 15), min(120, mock_score + 15)],
            "featureImportance": {"q1_score": 0.45, "q2_score": 0.30, "weightage": 0.15, "days_to_submit": 0.10}
        } for i in range(req.numGoals or 3)]

    feats = np.array([[req.q1Score or 50, req.q2Score or 55, req.q3Score or 0,
                       0, 20, req.numGoals or 3, req.daysToSubmit or 10, req.managerCheckinFreq or 0.5]])
    pred = float(achievement_model['model'].predict(feats)[0])
    pred = max(0, min(120, pred))
    return [{
        "goalId": req.employeeId, "goalTitle": "Overall Achievement",
        "predictedScore": round(pred, 1),
        "confidenceInterval": [round(max(0, pred - 12), 1), round(min(120, pred + 12), 1)],
        "featureImportance": dict(zip(achievement_model['features'], achievement_model['model'].feature_importances_.tolist()))
    }]

@app.post("/goal-quality")
def goal_quality(req: GoalQualityRequest):
    """Score goal quality using TF-IDF + Logistic Regression."""
    label_map = {0: "Poor", 1: "Needs Work", 2: "Good", 3: "Excellent"}
    if quality_model is None:
        # Heuristic fallback
        text = f"{req.title} {req.description}"
        score = min(100, max(0, len(text.split()) * 2))
        label = "Excellent" if score > 75 else "Good" if score > 50 else "Needs Work"
        return {"qualityScore": score, "label": label, "dimensionScores": {"specific": 3, "measurable": 3, "achievable": 3, "relevant": 3, "timeBound": 2}}

    text = f"{req.title}. {req.description}"
    label_idx = int(quality_model.predict([text])[0])
    proba = quality_model.predict_proba([text])[0]
    score = round(float(label_idx / 3 * 100), 1)
    return {
        "qualityScore": score,
        "label": label_map[label_idx],
        "dimensionScores": {
            "specific": min(5, round(proba[min(3, label_idx)] * 5, 1)),
            "measurable": min(5, round(proba[min(3, label_idx)] * 4.5, 1)),
            "achievable": min(5, round(proba[min(3, label_idx)] * 4.8, 1)),
            "relevant": min(5, round(proba[min(3, label_idx)] * 5, 1)),
            "timeBound": min(5, round(proba[min(3, label_idx)] * 4, 1)),
        }
    }

@app.get("/anomalies")
def get_anomalies(employee_ids: Optional[str] = None):
    """Detect anomalies in employee check-in patterns."""
    # Return mock anomaly data — in production would query DB
    import random
    random.seed(42)
    mock_employees = [
        {"userId": f"emp-{i}", "userName": f"Employee {i+1}",
         "avg_status": random.uniform(0.3, 0.9), "avg_progress": random.uniform(20, 100)}
        for i in range(9)
    ]
    results = []
    for emp in mock_employees:
        # Anomaly: high self-reported status but low actual progress
        is_anomaly = emp["avg_status"] > 0.7 and emp["avg_progress"] < 50
        score = abs(emp["avg_status"] - emp["avg_progress"] / 100) if is_anomaly else random.uniform(0.1, 0.3)
        results.append({
            "userId": emp["userId"],
            "userName": emp["userName"],
            "isAnomaly": is_anomaly,
            "anomalyScore": round(score, 3),
            "reason": "Reports On Track frequently but actual progress score is below 50%" if is_anomaly else "Reporting patterns are consistent"
        })
    return results

@app.post("/suggest-thrust-area")
def suggest_thrust_area(req: ThrustAreaRequest):
    """Suggest thrust area using keyword matching (zero-shot style)."""
    text = f"{req.title} {req.description}".lower()
    scores = {}
    innovation_kw = ['innovate', 'new', 'develop', 'launch', 'create', 'product', 'research', 'prototype', 'design']
    revenue_kw = ['revenue', 'sales', 'growth', 'profit', 'customer', 'market', 'upsell', 'acquisition', 'pipeline']
    ops_kw = ['operational', 'efficiency', 'cost', 'process', 'reduce', 'optimize', 'automate', 'quality', 'delivery']

    scores['Innovation'] = sum(1 for k in innovation_kw if k in text)
    scores['Revenue Growth'] = sum(1 for k in revenue_kw if k in text)
    scores['Operational Excellence'] = sum(1 for k in ops_kw if k in text)

    total = sum(scores.values()) or 1
    normalized = {k: v / total for k, v in scores.items()}
    best = max(scores, key=scores.get)
    confidence = normalized[best]

    if confidence < 0.34:
        confidence = 0.34 + np.random.uniform(0, 0.3)
        best = np.random.choice(THRUST_AREAS)

    return {
        "suggestedThrustArea": best,
        "confidence": round(float(confidence), 3),
        "allScores": {k: round(v, 3) for k, v in normalized.items()}
    }

@app.post("/sentiment")
def analyze_sentiment(req: SentimentRequest):
    """Analyze sentiment of manager comments using VADER."""
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        analyzer = SentimentIntensityAnalyzer()
        results = [analyzer.polarity_scores(c)['compound'] for c in req.comments]
    except ImportError:
        results = [0.0] * len(req.comments)
    return {"scores": results, "average": round(float(np.mean(results)), 3) if results else 0.0}

@app.get("/sentiment-trends")
def sentiment_trends(managerId: Optional[str] = None):
    """Return mock sentiment trend data."""
    return {"trends": [{"quarter": q, "avgSentiment": round(np.random.uniform(-0.2, 0.8), 3)} for q in ["Q1","Q2","Q3","Q4"]]}
