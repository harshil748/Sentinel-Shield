import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
import httpx
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from fastapi.middleware.cors import CORSMiddleware

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


async def fetch_twelvedata(symbol: str, interval: str = "1min", outputsize: int = 30):
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
    async with httpx.AsyncClient(timeout=15) as client:
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


def classify_risk(ewma_score: float, vol_ratio: float):
    if abs(ewma_score) > 3 and vol_ratio > 3:
        return "Pump-Dump Anomaly"
    elif abs(ewma_score) > 3:
        return "Insider Trading Spike"
    elif vol_ratio > 3:
        return "Unusual Volume Surge"
    else:
        return "Normal"


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/fetch_live")
async def fetch_live(
    symbol: str = Query(..., example="RELIANCE.NSE"), interval: str = "1min"
):
    data = await fetch_twelvedata(symbol, interval=interval, outputsize=60)
    if data is None or "values" not in data:
        now = pd.Timestamp.now()
        rng = pd.date_range(end=now, periods=60, freq="T")
        prices = (100 + np.cumsum(np.random.randn(60) * 0.2)).round(2).tolist()
        volumes = (np.random.randint(100, 200, size=60)).tolist()
        timestamps = rng.astype(str).tolist()
    else:
        vals = data["values"]
        vals_sorted = list(reversed(vals))
        prices = [float(v["close"]) for v in vals_sorted if "close" in v]
        volumes = [int(v.get("volume", 0)) for v in vals_sorted]
        timestamps = [v["datetime"] for v in vals_sorted]

    price_now = prices[-1]
    vol_now = volumes[-1]
    ewma_score, ewma_value = compute_ewma_anomaly(prices, span=12)

    vol_mean = (
        float(np.mean(volumes[-20:])) if len(volumes) >= 20 else float(np.mean(volumes))
    )
    vol_ratio = float(vol_now / (vol_mean if vol_mean > 0 else 1))

    risk_reason = classify_risk(ewma_score, vol_ratio)

    anomaly = {
        "symbol": symbol,
        "price": price_now,
        "volume": vol_now,
        "ewma": ewma_value,
        "ewma_zscore": ewma_score,
        "volume_ratio": vol_ratio,
        "is_anomaly": risk_reason != "Normal",
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
        alerts.append(
            {
                "symbol": symbol,
                "price": data["price"],
                "volume": data["volume"],
                "time": data["timestamps"][-1],
                "reason": data.get("risk_reason", f"ewma={data['ewma_zscore']:.2f}"),
            }
        )
    return data


@app.get("/alerts")
async def get_alerts():
    return alerts[-50:]  # return more for gauge aggregation


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
    Compute a threat score from recent alerts.
    Weighting:
      - Pump-Dump Anomaly = 30
      - Insider Trading Spike = 25
      - Unusual Volume Surge = 15
    Score = sum(weights) capped at 100.
    Level: Low <40, Medium 40-69, High >=70
    """
    weights = {
        "Pump-Dump Anomaly": 30,
        "Insider Trading Spike": 25,
        "Unusual Volume Surge": 15,
    }
    total = 0
    # consider last 50 alerts
    for a in alerts[-50:]:
        reason = a.get("reason", "")
        total += weights.get(reason, 5)  # unknown reason gets small weight
    score = min(100, int(total))
    if score >= 70:
        level = "High"
    elif score >= 40:
        level = "Medium"
    else:
        level = "Low"
    return {"score": score, "level": level}
