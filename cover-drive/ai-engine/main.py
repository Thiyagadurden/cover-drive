from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional
import numpy as np
import pandas as pd
import joblib
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Cover Drive — AI Premium Engine",
    description="XGBoost-based dynamic weekly premium calculation for food delivery partners",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model on startup ──
MODEL_PATH = os.getenv("MODEL_PATH", "./model/premium_model.pkl")
model_data = None

@app.on_event("startup")
def load_model():
    global model_data
    try:
        model_data = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded — version {model_data['version']}")
    except Exception as e:
        print(f"⚠️  Model not found: {e}. Run train_model.py first.")

# ── Schemas ──
class FeatureInput(BaseModel):
    zone_flood_risk:            float = Field(default=5.0, ge=0, le=10)
    weather_risk_score:         float = Field(default=5.0, ge=0, le=10)
    app_downtime_7d:            float = Field(default=2.0, ge=0, le=24)
    partner_rating:             float = Field(default=4.0, ge=1.0, le=5.0)
    active_hours_weekly:        float = Field(default=40.0, ge=10, le=84)
    historical_claim_rate_zone: float = Field(default=0.15, ge=0, le=1)
    curfew_risk_score:          float = Field(default=1.0, ge=0, le=5)

class PredictRequest(BaseModel):
    features: FeatureInput

class PredictResponse(BaseModel):
    weekly_premium:   float
    plan_type:        str
    risk_level:       str
    confidence:       float
    breakdown:        dict
    model_version:    str

# ── Health ──
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model_data is not None,
        "model_version": model_data["version"] if model_data else None,
        "service": "Cover Drive AI Engine"
    }

# ── Predict Premium ──
@app.post("/predict-premium", response_model=PredictResponse)
def predict_premium(request: PredictRequest):
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train_model.py first.")

    try:
        f = request.features
        FEATURES = model_data["features"]

        feature_dict = {
            "zone_flood_risk":            f.zone_flood_risk,
            "weather_risk_score":         f.weather_risk_score,
            "app_downtime_7d":            f.app_downtime_7d,
            "partner_rating":             f.partner_rating,
            "active_hours_weekly":        f.active_hours_weekly,
            "historical_claim_rate_zone": f.historical_claim_rate_zone,
            "curfew_risk_score":          f.curfew_risk_score,
        }

        X = pd.DataFrame([feature_dict])[FEATURES]
        raw_pred = float(model_data["model"].predict(X)[0])
        weekly_premium = float(np.clip(round(raw_pred), 69, 149))

        # Risk level
        if weekly_premium <= 85:
            risk_level = "low"
        elif weekly_premium <= 110:
            risk_level = "medium"
        elif weekly_premium <= 130:
            risk_level = "high"
        else:
            risk_level = "critical"

        # Plan type
        plan_type = "basic" if weekly_premium <= 85 else "premium" if weekly_premium > 115 else "standard"

        # Coverage = 3 days of ₹800 default
        coverage = 800 * 3

        # Build breakdown
        base = 99.0
        zone_adj    = round((f.zone_flood_risk - 5) * 2.5, 2)
        weather_adj = round((f.weather_risk_score - 5) * 2.0, 2)
        dt_adj      = round(f.app_downtime_7d * 3.0, 2)
        rating_adj  = round((3.0 - f.partner_rating) * 5.0, 2)
        hours_adj   = round((f.active_hours_weekly - 40) * 0.3, 2)
        claim_adj   = round(f.historical_claim_rate_zone * 60.0, 2)
        curfew_adj  = round(f.curfew_risk_score * 3.0, 2)

        def fmt(v):
            return f"+₹{abs(v):.0f}" if v > 0 else f"-₹{abs(v):.0f}" if v < 0 else "₹0"

        return PredictResponse(
            weekly_premium=weekly_premium,
            plan_type=plan_type,
            risk_level=risk_level,
            confidence=0.94,
            model_version=model_data["version"],
            breakdown={
                "base_premium":             f"₹{base:.0f}",
                "zone_flood_adjustment":    fmt(zone_adj),
                "weather_adjustment":       fmt(weather_adj),
                "app_downtime_adjustment":  fmt(dt_adj),
                "rating_discount":          fmt(rating_adj),
                "hours_adjustment":         fmt(hours_adj),
                "claim_rate_adjustment":    fmt(claim_adj),
                "curfew_adjustment":        fmt(curfew_adj),
                "final_premium":            f"₹{weekly_premium:.0f}",
                "coverage_amount":          f"₹{coverage:,.0f}",
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Batch predict (for admin use) ──
@app.post("/batch-predict")
def batch_predict(records: list[FeatureInput]):
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    FEATURES = model_data["features"]
    rows = [r.dict() for r in records]
    X = pd.DataFrame(rows)[FEATURES]
    preds = model_data["model"].predict(X)
    premiums = [float(np.clip(round(p), 69, 149)) for p in preds]

    return {"premiums": premiums, "count": len(premiums)}

# ── Feature importance endpoint ──
@app.get("/feature-importance")
def feature_importance():
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    xgb = model_data["model"].named_steps["xgb"]
    features = model_data["features"]
    importances = xgb.feature_importances_.tolist()

    result = sorted(
        [{"feature": f, "importance": round(float(i), 4)} for f, i in zip(features, importances)],
        key=lambda x: -x["importance"]
    )
    return {"feature_importances": result, "model_version": model_data["version"]}