import pandas as pd
import numpy as np
import joblib
import os
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

# ── Load data ──
print("📂 Loading training data...")
df = pd.read_csv('data/training_data.csv')

FEATURES = [
    'zone_flood_risk',
    'weather_risk_score',
    'app_downtime_7d',
    'partner_rating',
    'active_hours_weekly',
    'historical_claim_rate_zone',
    'curfew_risk_score',
]
TARGET = 'weekly_premium'

X = df[FEATURES]
y = df[TARGET]

# ── Train/test split ──
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"   Train: {len(X_train)} | Test: {len(X_test)}")

# ── Build pipeline ──
model = Pipeline([
    ('scaler', StandardScaler()),
    ('xgb', XGBRegressor(
        n_jobs=1,
        n_estimators=300,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        verbosity=0,
    ))
])

# ── Train ──
print("🧠 Training XGBoost model...")
model.fit(X_train, y_train)

# ── Evaluate ──
y_pred = model.predict(X_test)
y_pred_clipped = np.clip(np.round(y_pred), 69, 149)

rmse = np.sqrt(mean_squared_error(y_test, y_pred_clipped))
mae  = mean_absolute_error(y_test, y_pred_clipped)
r2   = r2_score(y_test, y_pred_clipped)

print(f"\n📊 Model Performance:")
print(f"   RMSE : ₹{rmse:.2f}")
print(f"   MAE  : ₹{mae:.2f}")
print(f"   R²   : {r2:.4f}")

# ── Cross validation ──
cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
print(f"\n🔁 5-Fold CV R² : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Feature importance ──
importances = model.named_steps['xgb'].feature_importances_
print(f"\n📌 Feature Importances:")
for feat, imp in sorted(zip(FEATURES, importances), key=lambda x: -x[1]):
    bar = '█' * int(imp * 40)
    print(f"   {feat:<35} {bar} {imp:.4f}")

# ── Save model ──
os.makedirs('model', exist_ok=True)
model_path = 'model/premium_model.pkl'
joblib.dump({
    'model': model,
    'features': FEATURES,
    'version': '1.0.0',
    'premium_range': {'min': 69, 'max': 149},
}, model_path)
print(f"\n✅ Model saved to {model_path}")

# ── Quick sanity test ──
print("\n🧪 Sanity checks:")
tests = [
    {
        'label': 'Low-risk zone, high rating',
        'features': [2.0, 2.0, 1.0, 4.8, 40, 0.08, 0.5]
    },
    {
        'label': 'High flood zone, low rating',
        'features': [9.0, 8.5, 6.0, 2.0, 50, 0.35, 3.5]
    },
    {
        'label': 'Average partner, average zone',
        'features': [5.0, 5.0, 2.5, 4.0, 40, 0.15, 1.5]
    },
]

for t in tests:
    inp = pd.DataFrame([dict(zip(FEATURES, t['features']))])
    pred = float(np.clip(round(model.predict(inp)[0]), 69, 149))
    print(f"   {t['label']:<40} → ₹{pred:.0f}/week")