# Complete Deployment Guide for V2

## ✅ What's Already Done

1. **GitHub Repository**: Created and all code pushed
   - Repo: https://github.com/mfmqazi/halal-stocks-screener-v2
   - Branch `master`: Backend code
   - Branch `gh-pages`: Frontend code

2. **Frontend Deployment**: Live on GitHub Pages
   - URL: https://mfmqazi.github.io/halal-stocks-screener-v2/
   - Status: ⚠️ Needs backend URL update

3. **Code Updates**:
   - ✅ Yahoo Finance integration complete
   - ✅ MongoDB made optional
   - ✅ All dependencies updated
   - ✅ `render.yaml` configured for deployment

---

## 🚀 Next Steps: Deploy Backend to Render

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up or log in with GitHub

### Step 2: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub account if not already connected
3. Select repository: **`mfmqazi/halal-stocks-screener-v2`**
4. Render will auto-detect settings from `render.yaml`

### Step 3: Configure Service
Render should auto-fill these from `render.yaml`, but verify:

- **Name**: `halal-stocks-api-v2`
- **Environment**: `Node`
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Plan**: `Free`

### Step 4: Set Environment Variables

**Required:**
- `NODE_ENV` = `production` (auto-set from render.yaml)

**Optional (for user features):**
- `MONGODB_URI` = Your MongoDB connection string
- `JWT_SECRET` = Random secret key (e.g., `halal_stocks_jwt_secret_2025`)

**Rate Limiting (auto-set):**
- `RATE_LIMIT_WINDOW_MS` = `900000`
- `RATE_LIMIT_MAX_REQUESTS` = `100`

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Your backend will be live at: `https://halal-stocks-api-v2.onrender.com`

---

## 🔗 Connect Frontend to Backend

Once your backend is deployed, you'll get a URL like:
`https://halal-stocks-api-v2.onrender.com`

### Update Frontend

1. **Edit `app.js`** (line 2):
   ```javascript
   const API_BASE_URL = 'https://halal-stocks-api-v2.onrender.com/api';
   ```

2. **Commit and push to gh-pages**:
   ```bash
   cd prime-curiosity-v2
   git checkout gh-pages
   # Edit app.js with your actual Render URL
   git add app.js
   git commit -m "Update API URL to Render backend"
   git push origin gh-pages
   ```

3. **Wait 1-2 minutes** for GitHub Pages to update

---

## 🧪 Testing Your Deployment

### Test Backend API
Visit: `https://halal-stocks-api-v2.onrender.com/api/health`

You should see:
```json
{
  "status": "OK",
  "message": "Halal Stocks API is running",
  "timestamp": "2025-11-27T..."
}
```

### Test Stock Screening
Visit: `https://halal-stocks-api-v2.onrender.com/api/test/stock/AAPL`

You should see Apple stock data with Shariah compliance info.

### Test Frontend
Visit: https://mfmqazi.github.io/halal-stocks-screener-v2/

The app should now:
- ✅ Load stock data from your backend
- ✅ Display BDS Watchlist
- ✅ Screen stocks for Shariah compliance
- ✅ Show Top 100 compliant stocks

---

## 📝 MongoDB Setup (Optional)

If you want user accounts and watchlists:

### 1. Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free
3. Create a cluster (M0 Free tier)

### 2. Get Connection String
1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string
4. Replace `<password>` with your database password

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/halal-stocks?retryWrites=true&w=majority
```

### 3. Add to Render
1. Go to your Render dashboard
2. Select your web service
3. Go to **"Environment"** tab
4. Add variable:
   - Key: `MONGODB_URI`
   - Value: Your connection string
5. Add variable:
   - Key: `JWT_SECRET`
   - Value: Random secret (e.g., `halal_stocks_secret_2025`)
6. Click **"Save Changes"**
7. Service will auto-redeploy

---

## 🎉 You're Done!

Your complete stack:
- **Frontend**: https://mfmqazi.github.io/halal-stocks-screener-v2/
- **Backend**: https://halal-stocks-api-v2.onrender.com
- **Database**: Optional MongoDB Atlas

---

## 🔧 Troubleshooting

### Backend shows "Application failed to respond"
- Check Render logs for errors
- Verify build command completed successfully
- Ensure `NODE_ENV=production` is set

### Frontend shows "API Error"
- Verify backend URL in `app.js` is correct
- Check backend is running: visit `/api/health`
- Check browser console for CORS errors

### "MongoDB connection failed"
- This is OK! App works without MongoDB
- To fix: Add `MONGODB_URI` environment variable

### Stocks not loading
- Check Render logs
- Yahoo Finance might be rate-limiting
- Try refreshing after a few seconds

---

## 📊 What Works Without MongoDB

✅ Stock screening
✅ BDS Watchlist  
✅ Top 100 stocks
✅ Shariah compliance checking
✅ All filtering and sorting

❌ User accounts
❌ Personal watchlists
❌ Price alerts
❌ Saved preferences

---

## 🆘 Need Help?

- **Render Docs**: https://render.com/docs
- **MongoDB Docs**: https://docs.mongodb.com/
- **GitHub Issues**: https://github.com/mfmqazi/halal-stocks-screener-v2/issues

---

**Free Palestine** 🇵🇸 | **Invest Ethically** | **Boycott Apartheid**
