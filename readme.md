# 🛡️ Sentinel Shield

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.116+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.1+-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> **AI-Powered Market Fraud Detection Platform for India's Securities Market**

Sentinel Shield is a sophisticated, real-time AI surveillance platform designed to detect and prevent market manipulation schemes. Built for the Securities Market Hackathon, it protects retail investors from pump-and-dump scams through advanced multi-modal intelligence fusion.

## 🎯 Mission

Safeguard market integrity and protect retail investors by providing regulators with cutting-edge AI-powered surveillance tools that detect fraudulent activity before it causes systemic harm.

---

## ⚡ Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose

### 🚀 One-Command Setup
```bash
# Clone the repository
git clone https://github.com/harshil748/Sentinel-Shield.git
cd Sentinel-Shield

# Start the database
docker-compose up -d

# Start backend (Terminal 1)
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# Start frontend (Terminal 2)
cd frontend && npm install && npm run dev
```

**🌐 Access the application:** http://localhost:5173

---

## 🏗️ Architecture

Sentinel Shield employs a **Trinity of Evidence** approach, correlating signals from three distinct intelligence streams:

### 🔍 Social Intelligence Pipeline
- NLP-powered analysis of social media platforms
- Real-time sentiment analysis and manipulation detection
- Entity recognition for coordinated messaging
- Multi-language support for Indian markets

### 📊 Market Intelligence Engine
- Enhanced EWMA anomaly detection
- ML Isolation Forest for pattern recognition
- Volume spike detection via statistical analysis
- Price momentum anomaly identification

### ⚖️ Regulatory Intelligence Layer
- SEBI intermediary verification with trust scoring
- Entity credibility analysis
- Risk level classification
- Regulatory compliance tracking

---

## 📁 Project Structure

```
Sentinel-Shield/
├── 🔧 backend/                 # FastAPI Backend
│   ├── main.py                 # Core AI models & API
│   └── requirements.txt        # Python dependencies
├── 🖥️ frontend/                # React Frontend
│   ├── src/                    # Source code
│   ├── package.json            # Node.js dependencies
│   └── tailwind.config.js      # TailwindCSS config
├── 🐳 docker-compose.yml       # PostgreSQL setup
├── 📋 ARCHITECTURE.md          # Technical details
└── 📚 README.md               # This file
```

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | FastAPI + Python 3.12 | High-performance async API |
| **AI/ML** | Scikit-learn + Pandas + NumPy | Anomaly detection & NLP |
| **Frontend** | React 19 + Vite + TailwindCSS | Modern dashboard interface |
| **Charts** | LightweightCharts | Professional financial visualizations |
| **Database** | PostgreSQL | Time-series data storage |
| **Deployment** | Docker + Docker Compose | Containerized services |

---

## 🤖 AI Detection Engine

### Enhanced EWMA Anomaly Detection
- Multi-timeframe analysis with trend divergence scoring
- Z-score normalization for standardized alerts
- Real-time pattern recognition

### ML Isolation Forest
- Feature engineering with 5+ technical indicators
- Multi-dimensional anomaly scoring
- Adaptive contamination thresholds

### NLP Sentiment Analysis
- Manipulation keyword detection with curated patterns
- Financial context-aware sentiment scoring
- Entity extraction for coordinated messaging

### Trust Scoring Algorithm
- SEBI verification with dynamic scoring (5-95 points)
- Content analysis for manipulation indicators
- Risk level classification (Low/Medium/High/Critical)

---

## 🖼️ Dashboard Features

### 🎯 Live Market Threat Monitor
- **Real-time threat levels:** Minimal → Low → Medium → High → Critical
- **Dynamic color coding** for immediate risk assessment
- **Confidence scoring** (0-100%) for manipulation detection

### 📈 Interactive Charts
- Professional financial visualizations using LightweightCharts
- Real-time price and volume data
- Anomaly highlighting with severity indicators

### 🔍 Investigation Hub
- Historical alert analysis with advanced filtering
- CSV export for compliance reporting
- Deep forensic analysis with social media correlation

### ⚠️ Alert System
- **4-tier severity classification**
- Real-time alert feed with timestamps
- Detailed manipulation confidence scores

---

## 📊 Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/fetch_live_alert` | GET | Real-time analysis with alert generation |
| `/social_analysis` | GET | Social media signal analysis |
| `/threat_score` | GET | Current market threat assessment |
| `/alerts` | GET | Historical alert queries with filters |
| `/verify_entity` | GET | Entity verification & trust scoring |

**📚 Full API Documentation:** http://localhost:8000/docs

---

## 🔧 Development & Usage

### Demo Scenarios

#### 🎯 Pump-and-Dump Detection
```bash
# Test real-time manipulation detection
curl "http://localhost:8000/fetch_live_alert?symbol=RELIANCE.NSE"
```

#### 🔍 Investigation Hub
```bash
# Query suspicious activity in last 24 hours
curl "http://localhost:8000/alerts?symbol=RELIANCE.NSE&since_hours=24"
```

#### 🌡️ Market Threat Assessment
```bash
# Check current market threat level
curl "http://localhost:8000/threat_score"
```

### Environment Configuration
```bash
# Backend environment variables
cd backend
cp .env.example .env
# Edit .env with your API keys (optional for demo mode)
```

---

## 🧪 Demo Mode & Simulations

The platform includes sophisticated simulation capabilities:

### 📈 Realistic Market Data
- Correlated price-volume movements with manipulation spikes
- Time-series continuity with realistic trading patterns
- Dynamic anomaly injection for demonstration

### 💬 Social Media Signal Simulation
- Contextual manipulation messages based on market conditions
- Multi-platform signal generation (Telegram, WhatsApp, Twitter)
- Coordinated timing with market anomalies

### 🏆 Trust Scoring Demo
- Verified vs. unverified entity scenarios
- Content-based credibility analysis
- Dynamic risk level assignment

---

## 🎯 Impact & Use Cases

### For Regulators (SEBI)
✅ Proactive surveillance of messaging platforms  
✅ Evidence correlation for enforcement actions  
✅ Real-time market threat assessment  
✅ Compliance monitoring support  

### For Retail Investors
✅ ScamAdvisor-style warnings for manipulated stocks  
✅ Entity verification before following advice  
✅ Educational awareness of manipulation tactics  

### For Brokers & Exchanges
✅ Risk management API integration  
✅ Client activity monitoring for compliance  
✅ Market surveillance enhancement  

---

## 🚧 Future Roadmap

### 📅 Phase 1 (Q1 2025)
- [ ] Enhanced NLP for regional Indian languages
- [ ] Expanded social media platform coverage
- [ ] Real-time Telegram/WhatsApp integration

### 📅 Phase 2 (Q2 2025)
- [ ] Deepfake detection for audio/video manipulation
- [ ] Broker API integration for pilot programs
- [ ] Advanced network analysis for coordination detection

### 📅 Phase 3 (Q3-Q4 2025)
- [ ] Cryptocurrency market expansion
- [ ] Predictive manipulation modeling
- [ ] Cross-border surveillance capabilities

---

## 🏆 Competitive Advantages

🎯 **Multi-modal Intelligence Fusion** - Unique correlation of social and market signals  
⚡ **Real-time Processing** - Sub-second alert generation capability  
🇮🇳 **Indian Market Focus** - Specialized for NSE/BSE and regional languages  
⚖️ **Regulatory Alignment** - Direct support for SEBI priorities  
☁️ **Scalable Architecture** - Cloud-native design for enterprise deployment  

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. 🍴 **Fork** the repository
2. 🌿 **Create** a feature branch (`git checkout -b feature/enhancement`)
3. 💾 **Commit** your changes (`git commit -m 'Add new feature'`)
4. 📤 **Push** to the branch (`git push origin feature/enhancement`)
5. 🔄 **Open** a Pull Request

### Development Guidelines
- Follow existing code style and formatting
- Add tests for new functionality
- Update documentation as needed
- Ensure all checks pass before submitting

---

## 📞 Support & Contact

**Team:** Praesidio Analytics  
**Mission:** Protecting market integrity through advanced AI surveillance  
**Email:** pharshil748@gmail.com  

### 📚 Additional Resources
- [Technical Architecture](ARCHITECTURE.md)
- [Project Completion Summary](COMPLETION_SUMMARY.md)
- [API Documentation](http://localhost:8000/docs) (when running locally)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### 🛡️ Sentinel Shield

**"Empowering regulators, protecting investors, securing markets through intelligent surveillance."**

*Your guardian against market manipulation.*

[![GitHub stars](https://img.shields.io/github/stars/harshil748/Sentinel-Shield?style=social)](https://github.com/harshil748/Sentinel-Shield/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/harshil748/Sentinel-Shield?style=social)](https://github.com/harshil748/Sentinel-Shield/network/members)

</div>
