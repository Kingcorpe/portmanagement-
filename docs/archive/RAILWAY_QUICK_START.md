# Railway Quick Start Checklist

## ✅ Pre-Deployment Checklist

- [x] Fixed production path in `server/index-prod.ts`
- [x] Created `railway.json` configuration
- [x] Verified build works locally (`npm run build`)
- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] Environment variables configured

## 🚀 Quick Setup (5 minutes)

### 1. Push to GitHub
```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

### 2. Deploy on Railway
1. Go to https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Select your repo
4. Click **Deploy**

### 3. Add Environment Variables
In Railway dashboard → **Variables** tab, add:

```
TRADINGVIEW_REPORT_EMAIL=ryan@crsolutions.ca
TRADINGVIEW_WEBHOOK_SECRET=2e3cb66bdc008494d7d7c989072760e3
TZ=America/Denver
DATABASE_URL=your-neon-connection-string
NODE_ENV=production
```

### 4. Get Your Webhook URL
Railway Settings → **Domains** → Copy the URL

Your webhook: `https://your-app.up.railway.app/api/webhooks/tradingview`

### 5. Update TradingView
Update your alert's webhook URL to the Railway URL above.

## 📝 Files Changed

- ✅ `server/index-prod.ts` - Fixed path to find `dist/public`
- ✅ `railway.json` - Railway deployment configuration
- ✅ `RAILWAY_SETUP.md` - Detailed setup guide
- ✅ `RAILWAY_QUICK_START.md` - This file

## 🎯 That's It!

Once set up, every `git push` automatically deploys to Railway.

