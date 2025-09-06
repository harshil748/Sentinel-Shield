# Sentinel Shield - Technical Architecture

## Core Components

### Backend (FastAPI)

- **Real-time market data processing** with enhanced anomaly detection
- **Simulated NLP pipeline** for social media signal analysis
- **SEBI entity verification** with trust scoring
- **Multi-dimensional ML models** for manipulation detection

### Frontend (React)

- **Interactive dashboard** with live threat monitoring
- **Investigation hub** for forensic analysis
- **Alert deep-dive** with comprehensive details
- **Real-time charts** using LightweightCharts

### Key Features Implemented

1. **Enhanced EWMA Anomaly Detection**

   - Multi-timeframe analysis
   - Trend divergence scoring
   - Combined anomaly scoring

2. **Advanced ML Isolation Forest**

   - Feature engineering with 5+ indicators
   - Normalized multi-dimensional analysis
   - Adaptive contamination thresholds

3. **Social Media Signal Simulation**

   - Realistic manipulation pattern generation
   - Sentiment and confidence scoring
   - Platform-specific message formats

4. **Trust Scoring System**

   - SEBI registration verification
   - Content analysis for manipulation indicators
   - Dynamic risk level classification

5. **Live Alert System**
   - Real-time severity classification
   - Manipulation confidence scoring
   - Cross-platform correlation

## API Endpoints

### Primary Detection

- `GET /fetch_live_alert` - Real-time analysis with alerts
- `GET /social_analysis` - Social media signal analysis
- `GET /threat_score` - Market threat assessment

### Investigation

- `GET /alerts` - Historical alert queries
- `GET /alerts/{id}` - Detailed forensic analysis
- `GET /verify_entity` - Entity trust verification

## Deployment

```bash
# Start database
docker-compose up -d

# Start backend
cd backend && uvicorn main:app --reload --port 8000

# Start frontend
cd frontend && npm run dev
```

Access at: http://localhost:5173

## Demo Flow

1. **Load stock symbol** (e.g., RELIANCE.NSE)
2. **Observe real-time analysis** with anomaly scores
3. **View live alert feed** with severity indicators
4. **Investigate alerts** using the Investigation Hub
5. **Deep dive** into alert forensics with social signals

The prototype demonstrates the core concepts from your proposal with realistic simulations and professional UI/UX suitable for regulatory use.
