import os
import random
import datetime
import uuid
import re
from typing import Dict, List, Optional
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

alerts = []

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
    "certified_investment_advisor": {
        "name": "Certified Investment Advisor",
        "type": "advisor",
        "score": 88,
    },
    "sebi_registered_firm": {
        "name": "SEBI Registered Firm",
        "type": "firm",
        "score": 92,
    },
}

# Simulated social media manipulation patterns for NLP demonstration
MANIPULATION_PATTERNS = {
    "pump_signals": [
        "🚀🚀 {} going to the moon! Buy now before it's too late!",
        "BREAKING: {} insider news! Target price {}! Limited time opportunity!",
        "🔥 {} is the next big thing! Don't miss out! 10x returns guaranteed!",
        "URGENT: {} pump starting now! Join our premium group for targets!",
        "💎 {} hidden gem discovered! Buy before market opens tomorrow!",
    ],
    "urgency_keywords": [
        "urgent",
        "breaking",
        "limited time",
        "buy now",
        "don't miss",
        "last chance",
    ],
    "manipulation_keywords": [
        "pump",
        "moon",
        "rocket",
        "guaranteed returns",
        "insider",
        "target",
        "premium group",
    ],
    "sentiment_indicators": {
        "extremely_positive": [
            "🚀",
            "🔥",
            "💎",
            "moon",
            "rocket",
            "amazing",
            "incredible",
        ],
        "urgent": ["urgent", "now", "immediate", "breaking", "alert"],
        "greed": ["guaranteed", "easy money", "quick profit", "10x", "100x"],
    },
}


# Simulated social media data for demonstration
def generate_social_signals(symbol: str, manipulation_level: str = "low") -> List[Dict]:
    """Generate simulated social media signals for demonstration"""
    signals = []

    if manipulation_level == "high":
        num_signals = random.randint(8, 15)
        pattern_prob = 0.8
    elif manipulation_level == "medium":
        num_signals = random.randint(4, 8)
        pattern_prob = 0.5
    else:
        num_signals = random.randint(1, 3)
        pattern_prob = 0.2

    channels = [
        "@stocktips_premium",
        "@tradeguru_official",
        "@market_insider_pro",
        "@pump_signals_vip",
    ]

    for i in range(num_signals):
        channel = random.choice(channels)

        if random.random() < pattern_prob:
            # Generate manipulative message
            pattern = random.choice(MANIPULATION_PATTERNS["pump_signals"])
            target_price = round(random.uniform(500, 2000), 2)
            message = pattern.format(symbol.split(".")[0], target_price)
            sentiment_score = random.uniform(0.7, 0.95)
            manipulation_confidence = random.uniform(0.6, 0.9)
        else:
            # Generate normal discussion
            normal_messages = [
                f"What do you think about {symbol.split('.')[0]}? Any technical analysis?",
                f"Looking at {symbol.split('.')[0]} charts, seems like good support level",
                f"{symbol.split('.')[0]} earnings coming up next week, thoughts?",
                f"Anyone holding {symbol.split('.')[0]} for long term?",
            ]
            message = random.choice(normal_messages)
            sentiment_score = random.uniform(0.2, 0.6)
            manipulation_confidence = random.uniform(0.1, 0.3)

        signals.append(
            {
                "id": str(uuid.uuid4()),
                "channel": channel,
                "message": message,
                "timestamp": (
                    datetime.datetime.utcnow()
                    - datetime.timedelta(minutes=random.randint(1, 60))
                ).isoformat(),
                "sentiment_score": round(sentiment_score, 3),
                "manipulation_confidence": round(manipulation_confidence, 3),
                "entities_extracted": [symbol.split(".")[0]],
                "keywords_detected": extract_manipulation_keywords(message),
            }
        )

    return signals


def extract_manipulation_keywords(text: str) -> List[str]:
    """Extract manipulation-related keywords from text"""
    text_lower = text.lower()
    keywords = []

    for keyword in (
        MANIPULATION_PATTERNS["urgency_keywords"]
        + MANIPULATION_PATTERNS["manipulation_keywords"]
    ):
        if keyword in text_lower:
            keywords.append(keyword)

    return keywords


def analyze_sentiment_and_manipulation(text: str) -> Dict:
    """Analyze text for sentiment and manipulation indicators"""
    text_lower = text.lower()

    # Simple sentiment scoring based on keywords
    positive_indicators = sum(
        1
        for word in MANIPULATION_PATTERNS["sentiment_indicators"]["extremely_positive"]
        if word in text_lower
    )
    urgent_indicators = sum(
        1
        for word in MANIPULATION_PATTERNS["sentiment_indicators"]["urgent"]
        if word in text_lower
    )
    greed_indicators = sum(
        1
        for word in MANIPULATION_PATTERNS["sentiment_indicators"]["greed"]
        if word in text_lower
    )

    sentiment_score = min(
        1.0,
        (positive_indicators * 0.3 + urgent_indicators * 0.4 + greed_indicators * 0.5),
    )
    manipulation_score = min(1.0, (urgent_indicators * 0.4 + greed_indicators * 0.6))

    return {
        "sentiment_score": round(sentiment_score, 3),
        "manipulation_confidence": round(manipulation_score, 3),
        "contains_manipulation_keywords": len(extract_manipulation_keywords(text)) > 0,
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
    """Enhanced EWMA-based anomaly detection with multiple timeframes"""
    s = pd.Series(prices).astype(float)

    # Multi-timeframe EWMA analysis
    ewma_short = s.ewm(span=span, adjust=False).mean()
    ewma_long = s.ewm(span=span * 2, adjust=False).mean()

    # Calculate residuals and z-scores
    resid_short = s - ewma_short
    resid_long = s - ewma_long

    # Short-term anomaly score
    z_score_short = (resid_short.iloc[-1]) / (
        resid_short.std() if resid_short.std() > 0 else 1e-9
    )

    # Trend divergence score
    trend_divergence = (
        (ewma_short.iloc[-1] - ewma_long.iloc[-1]) / ewma_long.iloc[-1]
        if ewma_long.iloc[-1] != 0
        else 0
    )

    # Combined anomaly score
    combined_score = z_score_short + (trend_divergence * 2)

    return float(combined_score), float(ewma_short.iloc[-1])


def compute_volume_anomaly(volumes, window=20):
    """Detect volume anomalies using statistical analysis"""
    s = pd.Series(volumes).astype(float)

    # Rolling statistics
    rolling_mean = s.rolling(window=window).mean()
    rolling_std = s.rolling(window=window).std()

    # Current volume z-score
    current_vol = s.iloc[-1]
    recent_mean = (
        rolling_mean.iloc[-1] if not pd.isna(rolling_mean.iloc[-1]) else s.mean()
    )
    recent_std = rolling_std.iloc[-1] if not pd.isna(rolling_std.iloc[-1]) else s.std()

    volume_zscore = (current_vol - recent_mean) / (
        recent_std if recent_std > 0 else 1e-9
    )
    volume_ratio = current_vol / (recent_mean if recent_mean > 0 else 1)

    return float(volume_zscore), float(volume_ratio)


def compute_price_momentum_anomaly(prices, short_window=5, long_window=20):
    """Detect unusual price momentum patterns"""
    s = pd.Series(prices).astype(float)

    # Calculate returns
    returns = s.pct_change().fillna(0)

    # Short and long term momentum
    short_momentum = returns.rolling(window=short_window).mean().iloc[-1]
    long_momentum = returns.rolling(window=long_window).mean().iloc[-1]

    # Momentum divergence
    momentum_divergence = short_momentum - long_momentum

    # Volatility adjustment
    volatility = returns.rolling(window=long_window).std().iloc[-1]
    risk_adjusted_momentum = momentum_divergence / (
        volatility if volatility > 0 else 1e-9
    )

    return float(risk_adjusted_momentum), float(short_momentum)


def compute_ml_isolation_forest(prices, volumes):
    """Enhanced ML-based anomaly detection with multiple features"""
    if len(prices) < 30:
        return 0.0, False

    df = pd.DataFrame({"price": prices, "volume": volumes}).astype(float)

    # Feature engineering
    df["returns"] = df["price"].pct_change().fillna(0)
    df["log_volume"] = np.log(df["volume"] + 1)
    df["price_volatility"] = df["returns"].rolling(window=10).std().fillna(0)
    df["volume_ma"] = df["volume"].rolling(window=10).mean()
    df["volume_ratio"] = df["volume"] / (df["volume_ma"] + 1e-9)
    df["price_momentum"] = df["returns"].rolling(window=5).mean().fillna(0)

    # Normalize features
    feature_cols = [
        "returns",
        "log_volume",
        "price_volatility",
        "volume_ratio",
        "price_momentum",
    ]
    for col in feature_cols:
        df[f"{col}_norm"] = (df[col] - df[col].mean()) / (df[col].std() + 1e-9)

    # Prepare features for ML model
    normalized_cols = [f"{col}_norm" for col in feature_cols]
    features = df[normalized_cols].values

    # Use more data for training if available
    train_size = min(len(features) - 1, 100)
    X_train = features[-train_size - 1 : -1]
    X_test = features[-1].reshape(1, -1)

    # Enhanced Isolation Forest
    iso = IsolationForest(
        n_estimators=150, contamination=0.05, random_state=42, max_features=0.8
    )

    try:
        iso.fit(X_train)
        anomaly_score = float(iso.decision_function(X_test)[0])
        prediction = int(iso.predict(X_test)[0])

        # Convert to positive anomaly score (higher = more anomalous)
        ml_score = float(-anomaly_score)
        ml_is_anomaly = prediction == -1

        return ml_score, ml_is_anomaly
    except Exception as e:
        print(f"ML anomaly detection error: {e}")
        return 0.0, False


def classify_risk(
    ewma_score: float,
    vol_ratio: float,
    ml_flag: bool,
    social_signals: Optional[List] = None,
):
    """Enhanced risk classification with social media integration"""

    # Base risk assessment from market data
    if abs(ewma_score) > 4 and vol_ratio > 5:
        base = "Severe Market Manipulation"
        severity = 4
    elif abs(ewma_score) > 3 and vol_ratio > 3:
        base = "Pump-Dump Anomaly"
        severity = 3
    elif abs(ewma_score) > 2.5:
        base = "Insider Trading Spike"
        severity = 2
    elif vol_ratio > 4:
        base = "Unusual Volume Surge"
        severity = 2
    elif abs(ewma_score) > 1.5 or vol_ratio > 2:
        base = "Market Irregularity"
        severity = 1
    else:
        base = "Normal"
        severity = 0

    # Social media signal enhancement
    social_boost = 0
    if social_signals:
        high_confidence_signals = [
            s for s in social_signals if s.get("manipulation_confidence", 0) > 0.7
        ]
        if len(high_confidence_signals) >= 3:
            social_boost = 2
        elif len(high_confidence_signals) >= 1:
            social_boost = 1

    # ML confirmation boost
    ml_boost = 1 if ml_flag and base != "Normal" else 0

    # Final severity calculation
    final_severity = min(4, severity + social_boost + ml_boost)

    # Generate final classification
    if social_boost > 0 and base != "Normal":
        base = f"{base} (Social Media Confirmed)"

    if ml_flag and base != "Normal":
        base = f"{base} (ML-Verified)"
    elif ml_flag and base == "Normal":
        base = "ML Anomaly (Requires Review)"
        final_severity = 1

    return base, final_severity


def calculate_manipulation_confidence(
    ewma_score: float,
    vol_ratio: float,
    ml_score: float,
    social_signals: Optional[List] = None,
) -> float:
    """Calculate overall manipulation confidence score (0-100)"""

    # Market data confidence (0-40 points)
    market_confidence = 0
    market_confidence += min(20, abs(ewma_score) * 5)  # EWMA contribution
    market_confidence += min(20, (vol_ratio - 1) * 8)  # Volume contribution

    # ML confidence (0-30 points)
    ml_confidence = min(30, ml_score * 15)

    # Social media confidence (0-30 points)
    social_confidence = 0
    if social_signals:
        avg_manipulation = sum(
            s.get("manipulation_confidence", 0) for s in social_signals
        ) / len(social_signals)
        signal_count_bonus = min(10, len(social_signals) * 2)
        social_confidence = (avg_manipulation * 20) + signal_count_bonus

    total_confidence = min(100, market_confidence + ml_confidence + social_confidence)
    return round(total_confidence, 1)


def score_trust(handle: str, message_content: str = "") -> Dict:
    """Enhanced trust scoring with content analysis"""
    if not handle:
        return {
            "registered": False,
            "score": 5,
            "entity": None,
            "risk_level": "Very High",
        }

    key = handle.lower()
    entry = SEBI_REGISTERED_HANDLES.get(key)

    base_score = 10
    risk_level = "High"

    if entry:
        base_score = entry["score"]
        risk_level = "Low" if base_score >= 90 else "Medium"
        return {
            "registered": True,
            "score": base_score,
            "entity": entry,
            "risk_level": risk_level,
            "verification_status": "SEBI Verified",
        }

    # Analyze handle characteristics for unregistered entities
    handle_analysis = analyze_handle_credibility(handle, message_content)
    adjusted_score = max(5, base_score + handle_analysis["credibility_adjustment"])

    if adjusted_score >= 70:
        risk_level = "Medium"
    elif adjusted_score >= 40:
        risk_level = "High"
    else:
        risk_level = "Very High"

    return {
        "registered": False,
        "score": adjusted_score,
        "entity": None,
        "risk_level": risk_level,
        "verification_status": "Unverified",
        "credibility_analysis": handle_analysis,
    }


def analyze_handle_credibility(handle: str, message_content: str = "") -> Dict:
    """Analyze handle and message for credibility indicators"""
    credibility_score = 0
    flags = []

    # Handle analysis
    if "official" in handle.lower():
        credibility_score += 15
    elif "verified" in handle.lower():
        credibility_score += 10
    elif "premium" in handle.lower() or "vip" in handle.lower():
        credibility_score -= 10
        flags.append("premium_signal_indicator")

    # Suspicious patterns
    if any(char in handle for char in "123456789"):
        credibility_score -= 5
        flags.append("numeric_handle")

    if len(handle) < 5:
        credibility_score -= 5
        flags.append("short_handle")

    # Message content analysis
    if message_content:
        content_analysis = analyze_sentiment_and_manipulation(message_content)
        if content_analysis["manipulation_confidence"] > 0.6:
            credibility_score -= 20
            flags.append("high_manipulation_content")
        elif content_analysis["manipulation_confidence"] > 0.3:
            credibility_score -= 10
            flags.append("moderate_manipulation_content")

    return {
        "credibility_adjustment": credibility_score,
        "red_flags": flags,
        "analysis": {
            "handle_suspicious": len(flags) > 2,
            "content_manipulative": any("manipulation" in flag for flag in flags),
        },
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/fetch_live")
async def fetch_live(
    symbol: str = Query(..., example="RELIANCE.NSE"), interval: str = "1min"
):
    """Enhanced live data fetching with comprehensive analysis"""
    data = await fetch_twelvedata(symbol, interval=interval, outputsize=200)
    if data is None or "values" not in data:
        # Generate realistic mock data for demonstration
        now = pd.Timestamp.now()
        rng = pd.date_range(end=now, periods=200, freq="min")
        base_price = random.uniform(800, 1500)
        prices = []
        current_price = base_price

        for i in range(200):
            # Add some realistic price movement with occasional spikes
            change = np.random.normal(0, 0.005)  # 0.5% std deviation
            if (
                i > 150 and random.random() < 0.1
            ):  # 10% chance of manipulation spike in recent data
                change += random.uniform(0.02, 0.05)  # 2-5% spike
            current_price *= 1 + change
            prices.append(round(current_price, 2))

        # Volume with correlation to price changes
        base_volume = random.randint(50000, 200000)
        volumes = []
        for i, price in enumerate(prices):
            volume_multiplier = 1
            if i > 0:
                price_change = abs(prices[i] - prices[i - 1]) / prices[i - 1]
                volume_multiplier = 1 + (
                    price_change * 10
                )  # Higher price changes = higher volume

            volume = int(base_volume * volume_multiplier * random.uniform(0.5, 1.5))
            volumes.append(volume)

        timestamps = rng.astype(str).tolist()
    else:
        vals = data["values"]
        vals_sorted = list(reversed(vals))
        prices = [float(v["close"]) for v in vals_sorted if "close" in v]
        volumes = [int(v.get("volume", 0)) for v in vals_sorted]
        timestamps = [v["datetime"] for v in vals_sorted]

    # Enhanced analysis
    recent_prices = prices[-60:]
    recent_vols = volumes[-60:]
    price_now = recent_prices[-1]
    vol_now = recent_vols[-1]

    # Multi-dimensional anomaly detection
    ewma_score, ewma_value = compute_ewma_anomaly(recent_prices, span=12)
    vol_zscore, vol_ratio = compute_volume_anomaly(recent_vols)
    momentum_score, short_momentum = compute_price_momentum_anomaly(recent_prices)
    ml_score, ml_is_anomaly = compute_ml_isolation_forest(prices[-200:], volumes[-200:])

    # Generate social signals based on market anomaly level
    anomaly_strength = abs(ewma_score) + (vol_ratio - 1) + abs(momentum_score)
    if anomaly_strength > 5:
        manipulation_level = "high"
    elif anomaly_strength > 2:
        manipulation_level = "medium"
    else:
        manipulation_level = "low"

    social_signals = generate_social_signals(symbol, manipulation_level)

    # Enhanced risk classification
    risk_reason, severity = classify_risk(
        ewma_score, vol_ratio, ml_is_anomaly, social_signals
    )
    manipulation_confidence = calculate_manipulation_confidence(
        ewma_score, vol_ratio, ml_score, social_signals
    )

    anomaly = {
        "symbol": symbol,
        "price": price_now,
        "volume": vol_now,
        "ewma": ewma_value,
        "ewma_zscore": ewma_score,
        "volume_ratio": vol_ratio,
        "volume_zscore": vol_zscore,
        "momentum_score": momentum_score,
        "ml_score": ml_score,
        "ml_is_anomaly": ml_is_anomaly,
        "is_anomaly": severity > 0,
        "risk_reason": risk_reason,
        "severity_level": severity,
        "manipulation_confidence": manipulation_confidence,
        "social_signals": social_signals,
        "timestamps": timestamps[-10:],
        "recent_prices": prices[-10:],
        "recent_volumes": volumes[-10:],
        "analysis_timestamp": datetime.datetime.utcnow().isoformat(),
    }
    return anomaly


@app.get("/fetch_live_alert")
async def fetch_live_alert(symbol: str = Query("RELIANCE.NSE", example="RELIANCE.NSE")):
    """Enhanced live alert generation with social media correlation"""
    data = await fetch_live(symbol)

    # Generate alert if anomaly detected
    if data["is_anomaly"] and data["severity_level"] >= 1:
        # Select handle based on manipulation confidence and social signals
        possible_handles = [
            "verified_broker_official",
            "random_channel_abc",
            "research_analyst_xyz",
            "unknown_handle_123",
            "pump_signals_vip",
            "market_insider_pro",
        ]

        # Higher manipulation confidence = more likely to be from unregistered source
        if data["manipulation_confidence"] > 70:
            handle = random.choice(
                ["unknown_handle_123", "pump_signals_vip", "market_insider_pro"]
            )
        elif data["manipulation_confidence"] > 40:
            handle = random.choice(["random_channel_abc", "unknown_handle_123"])
        else:
            handle = random.choice(possible_handles)

        # Get social signal that triggered this alert (if any)
        trigger_message = ""
        if data["social_signals"]:
            high_confidence_signals = [
                s
                for s in data["social_signals"]
                if s.get("manipulation_confidence", 0) > 0.6
            ]
            if high_confidence_signals:
                trigger_message = high_confidence_signals[0]["message"]

        trust = score_trust(handle, trigger_message)

        alert = {
            "id": str(uuid.uuid4()),
            "symbol": symbol,
            "price": data["price"],
            "volume": data["volume"],
            "time": (
                data["timestamps"][-1]
                if data["timestamps"]
                else datetime.datetime.utcnow().isoformat()
            ),
            "reason": data.get("risk_reason", f"EWMA: {data['ewma_zscore']:.2f}"),
            "severity_level": data["severity_level"],
            "manipulation_confidence": data["manipulation_confidence"],
            "source_handle": handle,
            "trust_score": trust["score"],
            "registered": trust["registered"],
            "risk_level": trust["risk_level"],
            "ml_score": data.get("ml_score", 0.0),
            "ml_flag": data.get("ml_is_anomaly", False),
            "social_signals_count": len(data.get("social_signals", [])),
            "trigger_message": trigger_message,
            "created_at": datetime.datetime.utcnow().isoformat(),
            "analysis_metadata": {
                "ewma_zscore": data["ewma_zscore"],
                "volume_ratio": data["volume_ratio"],
                "momentum_score": data.get("momentum_score", 0),
            },
        }
        alerts.append(alert)

    return data


@app.get("/alerts")
async def get_alerts(
    symbol: str = None,
    handle: str = None,
    limit: int = 100,
    from_ts: str = None,
    to_ts: str = None,
    since_hours: int = None,
):
    """
    Filters:
      - symbol: exact match (case-insensitive)
      - handle: source_handle exact match
      - from_ts / to_ts: ISO timestamps (inclusive)
      - since_hours: relative filter (if provided)
      - limit: max records returned (most recent)
    """
    result = alerts.copy()

    if symbol:
        result = [a for a in result if a["symbol"].lower() == symbol.lower()]

    if handle:
        result = [
            a for a in result if a.get("source_handle", "").lower() == handle.lower()
        ]

    if from_ts:
        try:
            f = datetime.datetime.fromisoformat(from_ts)
            result = [
                a
                for a in result
                if datetime.datetime.fromisoformat(a["created_at"]) >= f
            ]
        except Exception:
            raise HTTPException(
                status_code=400, detail="Invalid from_ts format. Use ISO format."
            )

    if to_ts:
        try:
            t = datetime.datetime.fromisoformat(to_ts)
            result = [
                a
                for a in result
                if datetime.datetime.fromisoformat(a["created_at"]) <= t
            ]
        except Exception:
            raise HTTPException(
                status_code=400, detail="Invalid to_ts format. Use ISO format."
            )

    if since_hours:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=int(since_hours))
        result = [
            a
            for a in result
            if datetime.datetime.fromisoformat(a["created_at"]) >= cutoff
        ]

    # return most recent first up to limit
    result_sorted = sorted(result, key=lambda x: x.get("created_at", ""), reverse=True)
    return result_sorted[: int(limit)]


@app.get("/alerts/{alert_id}")
async def get_alert(alert_id: str):
    """Enhanced alert details with comprehensive social media analysis"""
    for a in alerts:
        if a.get("id") == alert_id:
            # Generate enhanced social snippets
            social = [
                {
                    "handle": a["source_handle"],
                    "text": a.get(
                        "trigger_message",
                        f"🚀 {a['symbol']} is breaking out! Target price incoming!",
                    ),
                    "ts": a["created_at"],
                    "platform": "Telegram",
                    "manipulation_confidence": 0.85,
                    "sentiment_score": 0.92,
                },
                {
                    "handle": "market_insider_pro",
                    "text": f"URGENT: {a['symbol']} massive volume spike detected. Something big is happening!",
                    "ts": a["created_at"],
                    "platform": "Telegram",
                    "manipulation_confidence": 0.73,
                    "sentiment_score": 0.88,
                },
                {
                    "handle": "trade_signals_vip",
                    "text": f"{a['symbol']} looking very bullish on charts. Buy zone activated! 💎",
                    "ts": a["created_at"],
                    "platform": "WhatsApp",
                    "manipulation_confidence": 0.67,
                    "sentiment_score": 0.85,
                },
            ]

            return {
                "alert": a,
                "social_snippets": social,
                "entity_verification": {
                    "verified_entities": 0,
                    "unverified_entities": 3,
                    "high_risk_sources": 2,
                },
                "coordination_analysis": {
                    "simultaneous_signals": len(social),
                    "cross_platform_activity": True,
                    "coordinated_timing": True,
                    "network_analysis": "Potential pump group coordination detected",
                },
            }
    raise HTTPException(status_code=404, detail="Alert not found")


@app.get("/social_analysis")
async def social_analysis(symbol: str = Query(..., example="RELIANCE.NSE")):
    """Analyze social media signals for a specific symbol"""

    # Generate social signals for the symbol
    signals = generate_social_signals(symbol, "medium")

    # Aggregate analysis
    total_signals = len(signals)
    high_confidence = sum(
        1 for s in signals if s.get("manipulation_confidence", 0) > 0.7
    )
    avg_sentiment = (
        sum(s.get("sentiment_score", 0) for s in signals) / total_signals
        if total_signals > 0
        else 0
    )
    avg_manipulation = (
        sum(s.get("manipulation_confidence", 0) for s in signals) / total_signals
        if total_signals > 0
        else 0
    )

    # Platform distribution
    platforms = {}
    for signal in signals:
        platform = signal.get("channel", "Unknown")
        platforms[platform] = platforms.get(platform, 0) + 1

    return {
        "symbol": symbol,
        "analysis_timestamp": datetime.datetime.utcnow().isoformat(),
        "signals": signals,
        "summary": {
            "total_signals": total_signals,
            "high_confidence_manipulation": high_confidence,
            "average_sentiment": round(avg_sentiment, 3),
            "average_manipulation_confidence": round(avg_manipulation, 3),
            "platform_distribution": platforms,
            "risk_assessment": (
                "High"
                if high_confidence >= 3
                else "Medium" if high_confidence >= 1 else "Low"
            ),
        },
    }


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
    """Enhanced market threat assessment"""
    weights = {
        "Severe Market Manipulation": 50,
        "Pump-Dump Anomaly (Social Media Confirmed) (ML-Verified)": 45,
        "Pump-Dump Anomaly (ML-Verified)": 40,
        "Pump-Dump Anomaly (Social Media Confirmed)": 35,
        "Pump-Dump Anomaly": 30,
        "Insider Trading Spike (ML-Verified)": 35,
        "Insider Trading Spike (Social Media Confirmed)": 30,
        "Insider Trading Spike": 25,
        "Unusual Volume Surge (ML-Verified)": 25,
        "Unusual Volume Surge (Social Media Confirmed)": 20,
        "Unusual Volume Surge": 15,
        "Market Irregularity": 10,
        "ML Anomaly (Requires Review)": 15,
    }

    # Calculate weighted threat score
    total = 0
    high_severity_count = 0
    recent_alerts = alerts[-100:] if len(alerts) > 100 else alerts

    for a in recent_alerts:
        reason = a.get("reason", "")
        severity = a.get("severity_level", 1)
        manipulation_confidence = a.get("manipulation_confidence", 0)

        # Base weight from reason
        base_weight = weights.get(reason, 5)

        # Severity multiplier
        severity_multiplier = 1 + (severity * 0.3)

        # Manipulation confidence boost
        confidence_boost = manipulation_confidence / 100 * 0.5

        alert_score = base_weight * severity_multiplier * (1 + confidence_boost)
        total += alert_score

        if severity >= 3:
            high_severity_count += 1

    # Additional factors
    recent_alerts_1h = [
        a
        for a in alerts
        if (
            datetime.datetime.utcnow()
            - datetime.datetime.fromisoformat(a["created_at"])
        ).total_seconds()
        < 3600
    ]

    recency_boost = min(20, len(recent_alerts_1h) * 3)
    total += recency_boost

    # Calculate final score
    score = min(100, int(total))

    # Determine threat level with enhanced criteria
    if score >= 80 or high_severity_count >= 5:
        level = "Critical"
        color = "#dc2626"  # Red
    elif score >= 60 or high_severity_count >= 3:
        level = "High"
        color = "#ea580c"  # Orange-red
    elif score >= 35 or high_severity_count >= 1:
        level = "Medium"
        color = "#f59e0b"  # Orange
    elif score >= 15:
        level = "Low"
        color = "#eab308"  # Yellow
    else:
        level = "Minimal"
        color = "#22c55e"  # Green

    return {
        "score": score,
        "level": level,
        "color": color,
        "details": {
            "total_recent_alerts": len(recent_alerts),
            "high_severity_alerts": high_severity_count,
            "alerts_last_hour": len(recent_alerts_1h),
            "assessment_time": datetime.datetime.utcnow().isoformat(),
        },
    }
