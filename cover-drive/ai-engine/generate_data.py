import pandas as pd
import numpy as np
import os

np.random.seed(42)
N = 5000

def simulate_premium(row):
    base = 99.0
    # Zone flood risk: score 0-10, adds up to +25
    base += (row['zone_flood_risk'] - 5) * 2.5
    # Weather risk: adds up to +20
    base += (row['weather_risk_score'] - 5) * 2.0
    # App downtime: each hour adds ~₹3
    base += row['app_downtime_7d'] * 3.0
    # Partner rating: 5.0 rating = -₹15, 1.0 = +₹15
    base += (3.0 - row['partner_rating']) * 5.0
    # Active hours: more hours worked = slightly more exposure
    base += (row['active_hours_weekly'] - 40) * 0.3
    # Historical claim rate: 0.3 rate = +₹20
    base += row['historical_claim_rate_zone'] * 60.0
    # Curfew risk
    base += row['curfew_risk_score'] * 3.0

    # Add realistic noise
    noise = np.random.normal(0, 4)
    base += noise

    # Clamp to ₹69 - ₹149
    return float(np.clip(round(base), 69, 149))

data = {
    'zone_flood_risk':           np.random.uniform(0, 10, N),
    'weather_risk_score':        np.random.uniform(0, 10, N),
    'app_downtime_7d':           np.random.uniform(0, 10, N),
    'partner_rating':            np.random.uniform(1.0, 5.0, N),
    'active_hours_weekly':       np.random.randint(20, 70, N).astype(float),
    'historical_claim_rate_zone':np.random.uniform(0.05, 0.40, N),
    'curfew_risk_score':         np.random.uniform(0, 5, N),
}

df = pd.DataFrame(data)
df['weekly_premium'] = df.apply(simulate_premium, axis=1)

os.makedirs('data', exist_ok=True)
df.to_csv('data/training_data.csv', index=False)

print(f"✅ Generated {N} training samples")
print(f"   Premium range: ₹{df['weekly_premium'].min():.0f} — ₹{df['weekly_premium'].max():.0f}")
print(f"   Mean premium: ₹{df['weekly_premium'].mean():.2f}")
print(df.describe())