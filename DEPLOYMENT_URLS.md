# Deployment URLs

## 🌐 Live Application

### Frontend (GitHub Pages)
**URL**: https://mfmqazi.github.io/halal-stocks-screener-v2/

The frontend is now deployed and accessible via GitHub Pages!

### Backend API
**Status**: Not yet deployed

To deploy the backend, you have several options:

#### Option 1: Render.com (Recommended)
1. Go to https://render.com
2. Create a new Web Service
3. Connect to repository: `mfmqazi/halal-stocks-screener-v2`
4. Set build command: `cd backend && npm install`
5. Set start command: `cd backend && npm start`
6. Add environment variables:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Random secret key
   - `NODE_ENV=production`

#### Option 2: Railway.app
1. Go to https://railway.app
2. Create new project from GitHub
3. Select `mfmqazi/halal-stocks-screener-v2`
4. Set root directory to `backend`
5. Add environment variables

#### Option 3: Heroku
1. Install Heroku CLI
2. Run:
```bash
cd backend
heroku create halal-stocks-v2
git subtree push --prefix backend heroku master
```

## 📦 Repository

**GitHub Repository**: https://github.com/mfmqazi/halal-stocks-screener-v2

### Branches
- `master` - Main codebase
- `gh-pages` - Frontend deployment

## 🔗 Quick Links

- **Live App**: https://mfmqazi.github.io/halal-stocks-screener-v2/
- **Source Code**: https://github.com/mfmqazi/halal-stocks-screener-v2
- **Issues**: https://github.com/mfmqazi/halal-stocks-screener-v2/issues
- **README**: https://github.com/mfmqazi/halal-stocks-screener-v2#readme

## 📝 Notes

- Frontend is fully deployed and functional
- Backend needs to be deployed separately (see options above)
- Once backend is deployed, update the API URL in `app.js`
- No API keys required for Yahoo Finance! 🎉

---

**Status**: ✅ Frontend Deployed | ⏳ Backend Pending
