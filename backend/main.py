import os
import random
import datetime
import uuid
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sklearn.ensemble import IsolationForest
from collections import Counter

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

engine = None
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, echo=False, future=True)

# in-memory alert storage
alerts = []

# demo trust registry
SEBI_REGISTERED_HANDLES = {
    "verified_broker_official": {
        "name": "Verified Broker Official",
        "type": "broker",
        "score": 95,
    },
    "research_analyst_xyz": {
        "name": "Research Analyst XYZ",
        "type": "analyst",
        "score": 90,
    },
}


async def fetch_twelvedata(symbol: str, interval: str = "1min", outputsize: int = 200):
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
    if len(prices) < 30:
        return 0.0, False
    df = pd.DataFrame({"price": prices, "volume": volumes}).astype(float)
    df["ret"] = df["price"].pct_change().fillna(0)
    df["vol_norm"] = (df["volume"] - df["volume"].mean()) / (df["volume"].std() + 1e-9)
    features = df[["ret", "vol_norm"]].values
    X_train = features[:-1]
    X_test = features[-1].reshape(1, -1)
    iso = IsolationForest(n_estimators=100, contamination=0.02, random_state=42)
    try:
        iso.fit(X_train)
        score = float(iso.decision_function(X_test)[0])
        pred = int(iso.predict(X_test)[0])
        ml_is_anomaly = pred == -1
        ml_score = float(-score)
        return ml_score, ml_is_anomaly
    except Exception:
        return 0.0, False


def classify_risk(ewma_score: float, vol_ratio: float, ml_flag: bool):
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


def score_trust(handle: str):
    if not handle:
        return {"registered": False, "score": 10, "entity": None}
    key = handle.lower()
    entry = SEBI_REGISTERED_HANDLES.get(key)
    if entry:
        return {"registered": True, "score": entry["score"], "entity": entry}
    return {"registered": False, "score": 10, "entity": None}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/fetch_live")
async def fetch_live(
    symbol: str = Query(..., example="RELIANCE.NSE"), interval: str = "1min"
):
    data = await fetch_twelvedata(symbol, interval=interval, outputsize=200)
    if data is None or "values" not in data:
        now = pd.Timestamp.now()
        rng = pd.date_range(end=now, periods=200, freq="min")
        prices = (100 + np.cumsum(np.random.randn(200) * 0.2)).round(2).tolist()
        volumes = (np.random.randint(100, 200, size=200)).tolist()
        timestamps = rng.astype(str).tolist()
    else:
        vals = data["values"]
        vals_sorted = list(reversed(vals))
        prices = [float(v["close"]) for v in vals_sorted if "close" in v]
        volumes = [int(v.get("volume", 0)) for v in vals_sorted]
        timestamps = [v["datetime"] for v in vals_sorted]

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
        "timestamps": timestamps[-5:],
        "recent_prices": prices[-5:],
        "recent_volumes": volumes[-5:],
    }
    return anomaly


@app.get("/fetch_live_alert")
async def fetch_live_alert(symbol: str = Query("RELIANCE.NSE", example="RELIANCE.NSE")):
    data = await fetch_live(symbol)
    if data["is_anomaly"]:
        possible_handles = [
            "verified_broker_official",
            "random_channel_abc",
            "research_analyst_xyz",
            "unknown_handle_123",
        ]
        handle = random.choice(possible_handles)
        trust = score_trust(handle)
        alert = {
            "id": str(uuid.uuid4()),
            "symbol": symbol,
            "price": data["price"],
            "volume": data["volume"],
            "time": data["timestamps"][-1],
            "reason": data.get("risk_reason", f"ewma={data['ewma_zscore']:.2f}"),
            "source_handle": handle,
            "trust_score": trust["score"],
            "registered": trust["registered"],
            "ml_score": data.get("ml_score", 0.0),
            "ml_flag": data.get("ml_is_anomaly", False),
            "created_at": datetime.datetime.utcnow().isoformat(),
        }
        alerts.append(alert)
    return data


@app.get("/alerts")
async def get_alerts(
    symbol: str = None, handle: str = None, limit: int = 100, since_hours: int = 24
):
    result = alerts
    if symbol:
        result = [a for a in result if a["symbol"].lower() == symbol.lower()]
    if handle:
        result = [
            a for a in result if a.get("source_handle", "").lower() == handle.lower()
        ]
    if since_hours:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=since_hours)
        filtered = []
        for a in result:
            try:
                created = datetime.datetime.fromisoformat(a["created_at"])
                if created >= cutoff:
                    filtered.append(a)
            except Exception:
                pass
        result = filtered
    return result[-limit:]


@app.get("/alerts/{alert_id}")
async def get_alert(alert_id: str):
    for a in alerts:
        if a.get("id") == alert_id:
            # create mock social snippets related to alert (demo)
            social = [
                {
                    "handle": a["source_handle"],
                    "text": f"Buy {a['symbol']} now. target up.",
                    "ts": a["created_at"],
                },
                {
                    "handle": "random_channel_abc",
                    "text": f"{a['symbol']} is pumping. join in.",
                    "ts": a["created_at"],
                },
            ]
            return {"alert": a, "social_snippets": social}
    raise HTTPException(status_code=404, detail="Alert not found")


@app.get("/search_symbols")
async def search_symbols(query: str = Query(..., min_length=1)):
    if not TD_API_KEY:
        raise HTTPException(status_code=500, detail="No Twelve Data API key configured")
    url = "https://api.twelvedata.com/symbol_search"
    params = {"symbol": query, "apikey": TD_API_KEY}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Search API error")
        return r.json()


@app.get("/verify_entity")
async def verify_entity(handle: str = Query(..., min_length=1)):
    trust = score_trust(handle)
    return {
        "handle": handle,
        "registered": trust["registered"],
        "score": trust["score"],
        "entity": trust["entity"],
    }


@app.get("/leaderboard")
async def leaderboard(limit: int = 10):
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    recent = []
    for a in alerts:
        try:
            created = datetime.datetime.fromisoformat(a["created_at"])
            if created >= cutoff:
                recent.append(a)
        except Exception:
            pass
    counts = Counter([a["symbol"] for a in recent])
    top = counts.most_common(limit)
    return {"top": [{"symbol": s, "count": c} for s, c in top]}


@app.get("/threat_score")
async def threat_score():
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
