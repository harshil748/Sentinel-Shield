import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
import httpx
import pandas as pd
import numpy as np
from sqlalchemy import create_engine

load_dotenv()
TD_API_KEY = os.getenv("TWELVEDATA_API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Sentinel Shield - Backend")

# optional DB engine (we won't require migrations for prototype)
engine = None
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, echo=False, future=True)


async def fetch_twelvedata(symbol: str, interval: str = "1min", outputsize: int = 30):
    if not TD_API_KEY:
        return None  # signal to use mock
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


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/fetch_live")
async def fetch_live(
    symbol: str = Query(..., example="RELIANCE.NSE"), interval: str = "1min"
):
    """
    Fetch recent time-series for `symbol` and return a simple anomaly score.
    Uses TwelveData when TWELVEDATA_API_KEY is set. Otherwise returns mocked data.
    """
    data = await fetch_twelvedata(symbol, interval=interval, outputsize=60)
    if data is None or "values" not in data:
        # fallback mock data (useful if you don't yet have API key)
        now = pd.Timestamp.now()
        rng = pd.date_range(end=now, periods=60, freq="T")
        prices = (100 + np.cumsum(np.random.randn(60) * 0.2)).round(2).tolist()
        volumes = (np.random.randint(100, 200, size=60)).tolist()
        timestamps = rng.astype(str).tolist()
    else:
        vals = data[
            "values"
        ]  # TwelveData returns list of dicts with 'datetime','close','volume'
        vals_sorted = list(reversed(vals))  # ensure chronological
        prices = [float(v["close"]) for v in vals_sorted if "close" in v]
        volumes = [int(v.get("volume", 0)) for v in vals_sorted]
        timestamps = [v["datetime"] for v in vals_sorted]

    price_now = prices[-1]
    vol_now = volumes[-1]
    ewma_score, ewma_value = compute_ewma_anomaly(prices, span=12)

    # simple volume spike: ratio of current to mean of last 20
    vol_mean = (
        float(np.mean(volumes[-20:])) if len(volumes) >= 20 else float(np.mean(volumes))
    )
    vol_ratio = float(vol_now / (vol_mean if vol_mean > 0 else 1))

    anomaly = {
        "symbol": symbol,
        "price": price_now,
        "volume": vol_now,
        "ewma": ewma_value,
        "ewma_zscore": ewma_score,
        "volume_ratio": vol_ratio,
        "is_anomaly": bool(abs(ewma_score) > 3 or vol_ratio > 3),
        "timestamps": timestamps[-5:],  # last 5 timestamps for quick view
        "recent_prices": prices[-5:],
        "recent_volumes": volumes[-5:],
    }
    return anomaly
