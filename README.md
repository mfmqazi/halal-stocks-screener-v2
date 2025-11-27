# Halal Stocks Screener V2 🌙📈

**Version 2.0** - Now powered by **Yahoo Finance API** for broader coverage including mutual funds, ETFs, and international stocks!

A comprehensive Shariah-compliant stock screening application that helps Muslim investors identify halal investment opportunities. This version uses the `yahoo-finance2` library for enhanced data coverage.

## 🆕 What's New in V2

- **Yahoo Finance Integration**: Replaced Finnhub with Yahoo Finance for:
  - Broader coverage (mutual funds, ETFs, international stocks)
  - No API key required
  - More comprehensive financial data
  - Better reliability and uptime

- **Enhanced Screening**: Improved financial ratio calculations using Yahoo Finance's detailed data
- **Faster Updates**: Reduced rate limiting delays (500ms vs 1200ms)

## ✨ Features

### Core Functionality
- **Shariah Compliance Screening**: Automated screening based on AAOIFI standards
- **BDS Watchlist**: Track companies to boycott due to support for Israeli occupation/genocide
- **Ethical Screening**: Filter out tobacco, alcohol, gambling, and conventional banking
- **Real-time Data**: Live stock prices and financial metrics via Yahoo Finance
- **Compliance Scoring**: 0-100 score based on multiple Shariah criteria

### Screening Criteria
- ✅ Debt Ratio < 33%
- ✅ Liquid Assets < 33%
- ✅ Receivables < 49%
- ✅ Interest Income < 5%
- ✅ No prohibited activities (alcohol, tobacco, gambling, etc.)
- ✅ Not on BDS or ethical blacklist

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (optional, for user features)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mfmqazi/halal-stocks-screener-v2.git
cd halal-stocks-screener-v2
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

4. **Test the Yahoo Finance integration**
```bash
node test-api.js
```

5. **Start the backend server**
```bash
npm start
# Or for development with auto-reload:
npm run dev
```

6. **Open the frontend**
Simply open `index.html` in your browser, or use a local server:
```bash
# From the project root
npx serve .
```

## 📁 Project Structure

```
prime-curiosity-v2/
├── backend/
│   ├── config/          # Database configuration
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   │   ├── yahooFinanceService.js  # Yahoo Finance integration
│   │   └── blacklistService.js     # BDS/Ethical screening
│   ├── jobs/            # Cron jobs for updates
│   └── server.js        # Express server
├── index.html           # Main frontend
├── app.js              # Frontend logic
└── index.css           # Styling
```

## 🔌 API Endpoints

### Stocks
- `GET /api/stocks` - Get all compliant stocks
- `GET /api/stocks/:symbol` - Get specific stock data
- `POST /api/stocks/refresh/:symbol` - Force refresh stock data

### Testing
- `GET /api/test/stock/:symbol` - Test Yahoo Finance API
- `GET /api/test/health` - Health check

### Admin
- `GET /api/admin/blacklist` - Get BDS/Ethical lists
- `POST /api/admin/blacklist/refresh` - Refresh blacklist cache

## 🌐 Deployment

### Frontend (GitHub Pages)
The frontend is automatically deployed to GitHub Pages from the `gh-pages` branch.

### Backend (Render.com)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
4. Deploy!

## 🛠️ Development

### Testing Yahoo Finance Integration
```bash
cd backend
node test-api.js
```

### Running Locally
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend (optional)
npx serve .
```

## 📊 Data Sources

- **Stock Data**: Yahoo Finance (via yahoo-finance2)
- **BDS List**: BDS Movement (bdsmovement.net)
- **Shariah Standards**: AAOIFI guidelines

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - feel free to use this for your own projects!

## 🙏 Acknowledgments

- Yahoo Finance for providing free financial data
- BDS Movement for maintaining the boycott list
- AAOIFI for Shariah compliance standards
- The `yahoo-finance2` library maintainers

## ⚠️ Disclaimer

This tool is for informational purposes only. Always consult with a qualified Islamic scholar or Shariah advisor before making investment decisions. The screening criteria are based on general AAOIFI guidelines but may not reflect all scholarly opinions.

---

**Free Palestine** 🇵🇸 | **Boycott Israeli Products** | **Invest Ethically**
