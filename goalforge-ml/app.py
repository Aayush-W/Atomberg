"""
GoalForge ML Service — FastAPI
Optimized for HuggingFace Spaces deployment
Run: uvicorn app:app --host 0.0.0.0 --port 7860
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

# CORS Configuration - Allow requests from your Vercel frontend
FRONTEND_URLS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://goalforge-*.vercel.app",  # Vercel preview & production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # HF Spaces requires this, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model paths
MODELS_DIR = Path(__file__).parent / 'models' / 'saved'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ─── Load models at startup ───────────────────────────────────────────────────
achievement_model = None
quality_model = None
anomaly_model = None

THRUST_AREAS = ['Innovation', 'Revenue Growth', 'Operational Excellence']

@app.on_event("startup")
async def load_models():
    global achievement_model, quality_model, anomaly_model
    try:
        achievement_path = MODELS_DIR / 'achievement_predictor.pkl'
        quality_path = MODELS_DIR / 'goal_quality.pkl'
        anomaly_path = MODELS_DIR / 'anomaly_detector.pkl'
        
        if achievement_path.exists():
            achievement_model = joblib.load(achievement_path)
            print("✓ Loaded achievement_predictor")
        else:
            print(f"⚠ achievement_predictor.pkl not found at {achievement_path}")
            
        if quality_path.exists():
            quality_model = joblib.load(quality_path)
            print("✓ Loaded goal_quality")
        else:
            print(f"⚠ goal_quality.pkl not found at {quality_path}")
            
        if anomaly_path.exists():
            anomaly_model = joblib.load(anomaly_path)
            print("✓ Loaded anomaly_detector")
        else:
            print(f"⚠ anomaly_detector.pkl not found at {anomaly_path}")
    except Exception as e:
        print(f"⚠ Model load error: {e}")

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "ok",
        "service": "goalforge-ml",
        "models_loaded": {
            "achievement": achievement_model is not None,
            "quality": quality_model is not None,
            "anomaly": anomaly_model is not None,
        }
    }

# ─── Schemas ─────────────────────────────────────────────────────────────────

class AchievementRequest(BaseModel):
    employeeId: str
    cycleId: str
    goals: Optional[List[Dict[str, Any]]] = []
    q1Score: Optional[float] = 50.0
    q2Score: Optional[float] = 55.0
    q3Score: Optional[float] = 60.0
    q4Score: Optional[float] = 65.0
    thrustArea: Optional[str] = "Innovation"

class AchievementResponse(BaseModel):
    employeeId: str
    cycleId: str
    predictedAchievement: float
    confidence: float
    recommendations: List[str]

class GoalQualityRequest(BaseModel):
    title: str
    description: str
    thrustArea: str
    quarter: int

class GoalQualityResponse(BaseModel):
    score: float
    quality_level: str  # "low", "medium", "high"
    suggestions: List[str]

class AnomalyRequest(BaseModel):
    employeeId: str
    metrics: Dict[str, float]

class AnomalyResponse(BaseModel):
    isAnomaly: bool
    anomalyScore: float
    reason: str

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/predict/achievement", response_model=AchievementResponse)
async def predict_achievement(request: AchievementRequest):
    """Predict employee achievement based on goals and quarterly scores"""
    if achievement_model is None:
        raise HTTPException(status_code=503, detail="Achievement model not loaded")
    
    try:
        # Prepare features
        features = np.array([[
            request.q1Score,
            request.q2Score,
            request.q3Score,
            request.q4Score,
            len(request.goals),
            1.0 if request.thrustArea in THRUST_AREAS else 0.0,
        ]])
        
        # Predict
        prediction = achievement_model.predict(features)[0]
        confidence = min(max(prediction / 100, 0), 1)  # Normalize to 0-1
        
        return AchievementResponse(
            employeeId=request.employeeId,
            cycleId=request.cycleId,
            predictedAchievement=float(prediction),
            confidence=float(confidence),
            recommendations=[
                "Focus on high-impact goals",
                "Align with thrust areas",
                "Regular progress tracking"
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

@app.post("/predict/goal-quality", response_model=GoalQualityResponse)
async def predict_goal_quality(request: GoalQualityRequest):
    """Assess goal quality and provide suggestions"""
    if quality_model is None:
        raise HTTPException(status_code=503, detail="Quality model not loaded")
    
    try:
        # Simple heuristic-based quality scoring
        score = 0.0
        
        # Title length (5-20 words is optimal)
        title_words = len(request.title.split())
        if 5 <= title_words <= 20:
            score += 30
        elif 3 <= title_words < 5 or 20 < title_words <= 30:
            score += 20
        else:
            score += 10
            
        # Description length (should be comprehensive)
        desc_words = len(request.description.split())
        if desc_words >= 20:
            score += 30
        elif desc_words >= 10:
            score += 20
        else:
            score += 10
            
        # Thrust area alignment
        if request.thrustArea in THRUST_AREAS:
            score += 20
        else:
            score += 10
            
        # Quarter validity
        if 1 <= request.quarter <= 4:
            score += 20
        else:
            score += 10
        
        score = min(score, 100)
        
        if score >= 75:
            quality_level = "high"
        elif score >= 50:
            quality_level = "medium"
        else:
            quality_level = "low"
        
        suggestions = []
        if title_words < 5:
            suggestions.append("Expand goal title for clarity")
        if desc_words < 20:
            suggestions.append("Add more detail to goal description")
        if request.thrustArea not in THRUST_AREAS:
            suggestions.append(f"Align with thrust areas: {', '.join(THRUST_AREAS)}")
        
        return GoalQualityResponse(
            score=float(score),
            quality_level=quality_level,
            suggestions=suggestions if suggestions else ["Goal looks good!"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Quality assessment error: {str(e)}")

@app.post("/predict/anomaly", response_model=AnomalyResponse)
async def detect_anomaly(request: AnomalyRequest):
    """Detect anomalies in employee metrics"""
    if anomaly_model is None:
        raise HTTPException(status_code=503, detail="Anomaly model not loaded")
    
    try:
        # Calculate metrics statistics
        values = list(request.metrics.values())
        if not values:
            return AnomalyResponse(
                isAnomaly=False,
                anomalyScore=0.0,
                reason="No metrics provided"
            )
        
        mean_val = np.mean(values)
        std_val = np.std(values)
        
        # Check for outliers (> 2 standard deviations)
        anomaly_score = 0.0
        outliers = []
        
        for metric_name, value in request.metrics.items():
            if std_val > 0:
                z_score = abs((value - mean_val) / std_val)
                if z_score > 2:
                    anomaly_score = max(anomaly_score, z_score / 4)
                    outliers.append(f"{metric_name}: {value}")
        
        anomaly_score = min(anomaly_score, 1.0)
        is_anomaly = anomaly_score > 0.5
        
        reason = f"Detected {len(outliers)} outlier(s)" if outliers else "Metrics within normal range"
        
        return AnomalyResponse(
            isAnomaly=is_anomaly,
            anomalyScore=float(anomaly_score),
            reason=reason
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Anomaly detection error: {str(e)}")

# ─── Root endpoint ────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """API Documentation"""
    return {
        "service": "GoalForge ML Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "predict_achievement": "/predict/achievement",
            "predict_goal_quality": "/predict/goal-quality",
            "detect_anomaly": "/predict/anomaly"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
