# Sentinel Shield: AI-Powered Market Fraud Detection Platform

## 🛡️ Project Overview

**Sentinel Shield** is a sophisticated, real-time AI surveillance platform designed to proactively detect and prevent market manipulation schemes in India's securities market. Developed for the Securities Market Hackathon, this prototype demonstrates advanced multi-modal intelligence fusion to protect retail investors from pump-and-dump scams and other coordinated manipulation attacks.

## 🎯 Mission Statement

To safeguard market integrity and protect retail investors by providing regulators and market participants with cutting-edge AI-powered surveillance tools that detect fraudulent activity before it causes systemic harm.

## 🏗️ Architecture Overview

Sentinel employs a **Trinity of Evidence** approach, correlating signals from three distinct intelligence streams:

### 1. **Social Intelligence Pipeline** 🔍

- **NLP-powered analysis** of social media and messaging platforms
- **Real-time sentiment analysis** and manipulation pattern detection
- **Entity recognition** for stock symbols and coordinated messaging
- **Multi-language support** for Indian regional languages

### 2. **Market Intelligence Engine** 📊

- **Enhanced EWMA anomaly detection** with multi-timeframe analysis
- **Isolation Forest ML models** for sophisticated pattern recognition
- **Volume spike detection** using statistical analysis
- **Price momentum anomaly identification**

### 3. **Regulatory Intelligence Layer** ⚖️

- **SEBI intermediary verification** with comprehensive trust scoring
- **Entity credibility analysis** based on handle characteristics
- **Risk level classification** for unverified sources
- **Regulatory compliance status tracking**

## 🚀 Key Features

### Advanced Detection Capabilities

- **Multi-modal correlation** of social media signals with market anomalies
- **Real-time manipulation confidence scoring** (0-100%)
- **Severity-based alert classification** (4 threat levels)
- **Enhanced ML isolation forest** with feature engineering
- **Cross-platform social media monitoring** simulation

### Intelligent Dashboard

- **Live Market Threat Level** with dynamic color coding
- **Real-time Alert Feed** with severity indicators
- **Interactive Investigation Hub** for historical analysis
- **Alert Deep Dive** with comprehensive forensic details
- **CSV export functionality** for compliance reporting

### Trust & Verification System

- **SEBI registration verification** for financial entities
- **Dynamic trust scoring** based on multiple factors
- **Content analysis** for manipulation indicators
- **Risk level assessment** (Low/Medium/High/Very High)

## 📁 Project Structure

```
MargdarshAI/
├── backend/                    # FastAPI Backend
│   ├── main.py                # Core application with AI models
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment configuration template
│   └── .env                  # Environment variables (API keys)
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── App.jsx           # Main dashboard component
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Styling
│   ├── package.json          # Node.js dependencies
│   └── index.html            # HTML template
├── docker-compose.yml         # PostgreSQL database setup
└── README.md                 # This documentation
```

## 🛠️ Technology Stack

| Component          | Technology                       | Purpose                           |
| ------------------ | -------------------------------- | --------------------------------- |
| **Backend API**    | FastAPI + Python                 | High-performance async API server |
| **AI/ML Pipeline** | Scikit-learn, TensorFlow, Pandas | Anomaly detection and NLP         |
| **Database**       | PostgreSQL + TimescaleDB         | Time-series data storage          |
| **Frontend**       | React.js + Vite                  | Interactive dashboard interface   |
| **Charting**       | LightweightCharts                | Professional financial charts     |
| **Data Sources**   | Twelve Data API                  | Real-time market data             |
| **Deployment**     | Docker + Docker Compose          | Containerized deployment          |

## 📊 AI Models & Algorithms

### 1. Enhanced EWMA Anomaly Detection

- **Multi-timeframe analysis** with short/long-term EWMA
- **Trend divergence scoring** for manipulation detection
- **Z-score normalization** for standardized alerts

### 2. ML Isolation Forest (Enhanced)

- **Feature engineering** with 5+ technical indicators
- **Multi-dimensional anomaly scoring**
- **Adaptive contamination thresholds**
- **Risk-adjusted momentum analysis**

### 3. NLP Sentiment Analysis Pipeline

- **Manipulation keyword detection** using curated patterns
- **Sentiment scoring** with financial context
- **Entity extraction** for stock symbols and entities
- **Urgency and greed indicator analysis**

### 4. Trust Scoring Algorithm

- **Multi-factor authentication** verification
- **Content analysis** for manipulation signals
- **Handle credibility assessment**
- **Dynamic risk level assignment**

## 🚀 Quick Start Guide

### Prerequisites

- Python 3.8+
- Node.js 16+
- Docker & Docker Compose
- Twelve Data API Key (free tier available)

### 1. Clone & Setup Environment

```bash
git clone <repository-url>
cd MargdarshAI

# Copy environment template
cp backend/.env.example backend/.env
# Edit backend/.env with your Twelve Data API key
```

### 2. Start Database

```bash
docker-compose up -d
```

### 3. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Access Application

- **Dashboard**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432 (credentials in docker-compose.yml)

## 🔧 API Endpoints

### Core Detection Endpoints

- `GET /fetch_live_alert?symbol={SYMBOL}` - Real-time analysis with alert generation
- `GET /fetch_live?symbol={SYMBOL}` - Market data analysis without alerts
- `GET /social_analysis?symbol={SYMBOL}` - Social media signal analysis

### Investigation & Forensics

- `GET /alerts` - Query historical alerts with filters
- `GET /alerts/{alert_id}` - Detailed alert forensics
- `GET /threat_score` - Current market threat assessment
- `GET /leaderboard` - Most manipulated stocks (24h)

### Verification & Trust

- `GET /verify_entity?handle={HANDLE}` - Entity verification status
- `GET /search_symbols?query={QUERY}` - Symbol search with suggestions

## 📈 Usage Examples

### Detect Real-time Manipulation

```bash
curl "http://localhost:8000/fetch_live_alert?symbol=RELIANCE.NSE"
```

### Query Suspicious Activity

```bash
curl "http://localhost:8000/alerts?symbol=RELIANCE.NSE&since_hours=24"
```

### Check Market Threat Level

```bash
curl "http://localhost:8000/threat_score"
```

## 🎯 Demo Scenarios

### 1. **Pump-and-Dump Detection**

- Load a volatile stock (e.g., RELIANCE.NSE)
- Observe real-time analysis with EWMA z-scores and ML anomaly flags
- View generated social media signals and manipulation confidence

### 2. **Investigation Hub**

- Use the Investigation Hub to filter alerts by symbol, timeframe, or source
- Export results to CSV for compliance reporting
- Deep dive into specific alerts for forensic analysis

### 3. **Entity Verification**

- Test different social media handles in the verification system
- Observe trust scores and risk level classifications
- Review entity verification in alert details

## 🧪 Simulated Data & Demo Mode

The prototype includes sophisticated simulation capabilities for demonstration:

### Realistic Market Data Generation

- **Correlated price-volume movements** with manipulation spikes
- **Time-series continuity** with realistic trading patterns
- **Anomaly injection** for demonstration purposes

### Social Media Signal Simulation

- **Contextual manipulation messages** based on market conditions
- **Multi-platform signal generation** (Telegram, WhatsApp, Twitter)
- **Sentiment and manipulation confidence scoring**
- **Coordinated timing** with market anomalies

### Trust Scoring Demonstration

- **Verified vs. unverified entity scenarios**
- **Content-based credibility analysis**
- **Dynamic risk level assignment**

## 🎯 Impact & Use Cases

### For Regulators (SEBI)

- **Proactive surveillance** of encrypted messaging platforms
- **Evidence correlation** for enforcement actions
- **Real-time market threat assessment**
- **Compliance monitoring** support

### For Retail Investors

- **ScamAdvisor-style warnings** for manipulated stocks
- **Entity verification** before following advice
- **Educational awareness** of manipulation tactics

### For Brokers & Exchanges

- **Risk management API** integration
- **Client activity monitoring** for compliance
- **Market surveillance** enhancement

## 🔮 Future Roadmap

### Phase 1 (Next 3 Months)

- **Enhanced NLP models** for regional Indian languages
- **Expanded social media platform coverage**
- **Real-time Telegram/WhatsApp integration**

### Phase 2 (6 Months)

- **Deepfake detection module** for audio/video manipulation
- **Broker API integration** for pilot programs
- **Advanced network analysis** for coordination detection

### Phase 3 (1 Year)

- **Cryptocurrency market expansion**
- **Predictive manipulation modeling**
- **Cross-border surveillance capabilities**

### Phase 4 (Long-term)

- **SaaS platform** for global regulators
- **AI-powered market making** supervision
- **Quantum-resistant security** implementation

## 🏆 Competitive Advantages

1. **Multi-modal Intelligence Fusion** - Unique correlation of social and market signals
2. **Real-time Processing** - Sub-second alert generation capability
3. **Indian Market Focus** - Specialized for NSE/BSE and regional languages
4. **Regulatory Alignment** - Direct support for SEBI priorities
5. **Scalable Architecture** - Cloud-native design for enterprise deployment

## 🤝 Contributing

We welcome contributions to enhance Sentinel Shield's capabilities:

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/enhancement`)
3. **Commit changes** (`git commit -am 'Add new feature'`)
4. **Push to branch** (`git push origin feature/enhancement`)
5. **Create Pull Request**

## 📄 License

This project is developed for the Securities Market Hackathon and is available under the MIT License.

## 👥 Team: Praesidio Analytics

**Mission**: To protect market integrity through advanced AI surveillance

**Contact**: [Your contact information]

---

## 🔗 Additional Resources

- **API Documentation**: http://localhost:8000/docs (when running)
- **Twelve Data API**: https://twelvedata.com/docs
- **SEBI Guidelines**: https://www.sebi.gov.in/
- **React Documentation**: https://react.dev/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/

---

_"Empowering regulators, protecting investors, securing markets through intelligent surveillance."_

**Sentinel Shield** - Your guardian against market manipulation.
