import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
import httpx
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from fastapi.middleware.cors import CORSMiddleware

# ML
from sklearn.ensemble import IsolationForest

load_dotenv()
TD_API_KEY = os.getenv("TWELVEDATA_API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Sentinel Shield - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# optional DB engine
engine = None
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, echo=False, future=True)

# in-memory alert storage
alerts = []


async def fetch_twelvedata(symbol: str, interval: str = "1min", outputsize: int = 200):
    """
    Fetch time-series from TwelveData. Returns None if no API key.
    """
    if not TD_API_KEY:
        return None
    url = "https://api.twelvedata.com/time_series"
    params = {
        "symbol": symbol,
        "interval": interval,
        "outputsize": outputsize,
        "format": "JSON",
        "apikey": TD_API_KEY,
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Market API error")
        return r.json()


def compute_ewma_anomaly(prices, span=10):
    s = pd.Series(prices).astype(float)
    ewma = s.ewm(span=span, adjust=False).mean()
    resid = s - ewma
    score = (resid.iloc[-1]) / (resid.std() if resid.std() > 0 else 1e-9)
    return float(score), float(ewma.iloc[-1])


def compute_ml_isolation_forest(prices, volumes):
    """
    Train IsolationForest on historical points (price returns and volume).
    Use all but last point as train and score the last point.
    Returns: ml_score (decision_function negative => more anomalous),
             ml_is_anomaly (bool)
    """
    if len(prices) < 30:
        # not enough data
        return 0.0, False

    df = pd.DataFrame({"price": prices, "volume": volumes}).astype(float)

    # features: log returns and volume normalized
    df["ret"] = df["price"].pct_change().fillna(0)
    df["vol_norm"] = (df["volume"] - df["volume"].mean()) / (df["volume"].std() + 1e-9)

    features = df[["ret", "vol_norm"]].values

    # train on all but last sample
    X_train = features[:-1]
    X_test = features[-1].reshape(1, -1)

    # small IsolationForest for speed
    iso = IsolationForest(n_estimators=100, contamination=0.02, random_state=42)
    try:
        iso.fit(X_train)
        # decision_function: larger is more normal, smaller (negative) more anomalous
        score = float(iso.decision_function(X_test)[0])
        pred = int(iso.predict(X_test)[0])  # 1 normal, -1 anomaly
        ml_is_anomaly = pred == -1
        # convert score to positive anomaly magnitude: lower score -> higher anomaly magnitude
        ml_score = float(-score)
        return ml_score, ml_is_anomaly
    except Exception:
        return 0.0, False


def classify_risk(ewma_score: float, vol_ratio: float, ml_flag: bool):
    """
    Combine rule-based signals + ML flag to pick human-readable risk reason.
    ML flag raises suspicion and amplifies categories.
    """
    if abs(ewma_score) > 3 and vol_ratio > 3:
        base = "Pump-Dump Anomaly"
    elif abs(ewma_score) > 3:
        base = "Insider Trading Spike"
    elif vol_ratio > 3:
        base = "Unusual Volume Surge"
    else:
        base = "Normal"

    if ml_flag and base != "Normal":
        return f"{base} (ML-confirmed)"
    if ml_flag and base == "Normal":
        return "ML Anomaly (needs review)"
    return base


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/fetch_live")
async def fetch_live(
    symbol: str = Query(..., example="RELIANCE.NSE"), interval: str = "1min"
):
    """
    Fetch recent time-series for `symbol` and return anomaly scores.
    Uses TwelveData when TWELVEDATA_API_KEY is set. Otherwise returns mocked data.
    """
    data = await fetch_twelvedata(symbol, interval=interval, outputsize=200)
    if data is None or "values" not in data:
        # fallback mock data
        now = pd.Timestamp.now()
        rng = pd.date_range(end=now, periods=200, freq="T")
        prices = (100 + np.cumsum(np.random.randn(200) * 0.2)).round(2).tolist()
        volumes = (np.random.randint(100, 200, size=200)).tolist()
        timestamps = rng.astype(str).tolist()
    else:
        vals = data["values"]
        vals_sorted = list(reversed(vals))  # chronological
        prices = [float(v["close"]) for v in vals_sorted if "close" in v]
        volumes = [int(v.get("volume", 0)) for v in vals_sorted]
        timestamps = [v["datetime"] for v in vals_sorted]

    # basic stats using most recent 60
    recent_prices = prices[-60:]
    recent_vols = volumes[-60:]
    price_now = recent_prices[-1]
    vol_now = recent_vols[-1]
    ewma_score, ewma_value = compute_ewma_anomaly(recent_prices, span=12)
    vol_mean = (
        float(np.mean(recent_vols[-20:]))
        if len(recent_vols) >= 20
        else float(np.mean(recent_vols))
    )
    vol_ratio = float(vol_now / (vol_mean if vol_mean > 0 else 1))

    # ML anomaly using wider history and volumes
    ml_score, ml_is_anomaly = compute_ml_isolation_forest(prices[-200:], volumes[-200:])

    risk_reason = classify_risk(ewma_score, vol_ratio, ml_is_anomaly)

    anomaly = {
        "symbol": symbol,
        "price": price_now,
        "volume": vol_now,
        "ewma": ewma_value,
        "ewma_zscore": ewma_score,
        "volume_ratio": vol_ratio,
        "ml_score": ml_score,
        "ml_is_anomaly": ml_is_anomaly,
        "is_anomaly": (risk_reason != "Normal") or ml_is_anomaly,
        "risk_reason": risk_reason,
        "timestamps": timestamps[-5:],  # last 5 for chart
        "recent_prices": prices[-5:],
        "recent_volumes": volumes[-5:],
    }
    return anomaly


@app.get("/fetch_live_alert")
async def fetch_live_alert(symbol: str = Query("RELIANCE.NSE", example="RELIANCE.NSE")):
    data = await fetch_live(symbol)
    if data["is_anomaly"]:
        alerts.append(
            {
                "symbol": symbol,
                "price": data["price"],
                "volume": data["volume"],
                "time": data["timestamps"][-1],
                "reason": data.get("risk_reason", f"ewma={data['ewma_zscore']:.2f}"),
                "ml_score": data.get("ml_score", 0.0),
                "ml_flag": data.get("ml_is_anomaly", False),
            }
        )
    return data


@app.get("/alerts")
async def get_alerts():
    return alerts[-200:]


@app.get("/search_symbols")
async def search_symbols(query: str = Query(..., min_length=1)):
    """
    Proxy to Twelve Data symbol_search endpoint.
    Keeps API key hidden from frontend.
    """
    if not TD_API_KEY:
        raise HTTPException(status_code=500, detail="No Twelve Data API key configured")

    url = "https://api.twelvedata.com/symbol_search"
    params = {"symbol": query, "apikey": TD_API_KEY}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Search API error")
        return r.json()


@app.get("/threat_score")
async def threat_score():
    """
    Weighted threat score from recent alerts.
    """
    weights = {
        "Pump-Dump Anomaly (ML-confirmed)": 40,
        "Pump-Dump Anomaly": 30,
        "Insider Trading Spike (ML-confirmed)": 35,
        "Insider Trading Spike": 25,
        "Unusual Volume Surge (ML-confirmed)": 25,
        "Unusual Volume Surge": 15,
        "ML Anomaly (needs review)": 20,
    }
    total = 0
    for a in alerts[-200:]:
        reason = a.get("reason", "")
        total += weights.get(reason, 5)
        # also consider explicit ml_flag if present
        if a.get("ml_flag"):
            total += 5
    score = min(100, int(total))
    if score >= 70:
        level = "High"
    elif score >= 40:
        level = "Medium"
    else:
        level = "Low"
    return {"score": score, "level": level}
