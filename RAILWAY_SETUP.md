# Railway Deployment Setup Guide

## ✅ What I've Done

1. **Fixed production path** - Updated `server/index-prod.ts` to correctly find the built files
2. **Created `railway.json`** - Railway configuration file for your project
3. **Verified build scripts** - Your `package.json` already has the correct build/start commands

## 🚀 Step-by-Step Railway Setup

### Step 1: Push to GitHub

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### Step 2: Sign Up / Login to Railway

1. Go to **https://railway.app**
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (recommended for easy integration)

### Step 3: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub (if needed)
4. Select your repository: `portmanagement-` (or whatever it's named)
5. Click **"Deploy Now"**

### Step 4: Configure Environment Variables

Railway will start deploying, but you need to add environment variables:

1. In your Railway project, click on your **service**
2. Go to the **"Variables"** tab
3. Click **"New Variable"** and add each of these:

```
TRADINGVIEW_REPORT_EMAIL=ryan@crsolutions.ca
TRADINGVIEW_WEBHOOK_SECRET=2e3cb66bdc008494d7d7c989072760e3
TZ=America/Denver
DATABASE_URL=your-neon-postgresql-connection-string-here
NODE_ENV=production
PORT=5000
```

**Important Notes:**
- Replace `DATABASE_URL` with your actual Neon PostgreSQL connection string
- Railway will automatically set `PORT`, but it's good to be explicit
- Don't add quotes around the values

### Step 5: Wait for Deployment

Railway will automatically:
- Install dependencies (`npm install`)
- Build your app (`npm run build`)
- Start your app (`npm start`)

Watch the **"Deployments"** tab to see the build progress.

### Step 6: Get Your Webhook URL

Once deployed:

1. Go to the **"Settings"** tab
2. Scroll to **"Domains"**
3. Railway will generate a domain like: `your-app-production.up.railway.app`
4. Your webhook URL will be: `https://your-app-production.up.railway.app/api/webhooks/tradingview`

### Step 7: Update TradingView Alerts

1. Go to TradingView
2. Edit your alert settings
3. Update the **Webhook URL** to your new Railway URL
4. Save the alert

### Step 8: (Optional) Add Custom Domain

If you want a custom domain:

1. In Railway **Settings** → **Domains**
2. Click **"Generate Domain"** or **"Add Custom Domain"**
3. Follow the DNS instructions
4. Update your TradingView webhook URL to the new domain

## 🔄 Automatic Deployments

Once set up, Railway will automatically deploy whenever you push to your `main` branch:

```bash
git push origin main
# Railway automatically builds and deploys!
```

## 📊 Monitoring

- **Logs**: Click on your service → **"Deployments"** → Click a deployment → **"View Logs"**
- **Metrics**: Railway dashboard shows CPU, memory, and network usage
- **Health**: Railway automatically restarts your app if it crashes

## 🐛 Troubleshooting

### Build Fails

**Check logs:**
1. Go to **Deployments** tab
2. Click on the failed deployment
3. Check the build logs for errors

**Common issues:**
- Missing environment variables → Add them in **Variables** tab
- Database connection issues → Verify `DATABASE_URL` is correct
- Build timeout → Railway free tier has limits, but your build should be fine

### App Crashes on Start

**Check:**
1. All environment variables are set correctly
2. `DATABASE_URL` is valid and accessible
3. Port is set correctly (Railway sets this automatically, but verify)

### Webhook Not Working

**Verify:**
1. Your Railway app is running (check **Deployments** tab)
2. The webhook URL is correct: `https://your-domain.up.railway.app/api/webhooks/tradingview`
3. Test with a simple curl:
   ```bash
   curl -X POST https://your-domain.up.railway.app/api/webhooks/tradingview \
     -H "Content-Type: application/json" \
     -d '{"symbol":"TEST","signal":"BUY","price":100,"secret":"2e3cb66bdc008494d7d7c989072760e3"}'
   ```

## 💰 Pricing

- **Free Tier**: $5 credit/month (usually enough for small apps)
- **Hobby Plan**: $5/month (if you exceed free tier)
- **Pro Plan**: $20/month (for production apps)

Your app should fit comfortably in the free tier initially.

## ✅ Next Steps After Deployment

1. ✅ Test the webhook with a TradingView alert
2. ✅ Verify emails are being sent
3. ✅ Check that alerts appear in your app
4. ✅ Set up a custom domain (optional but recommended)
5. ✅ Monitor the first few deployments

## 🎉 You're Done!

Your app is now:
- ✅ Deployed to production
- ✅ Automatically deploying on every push
- ✅ Accessible via a permanent URL
- ✅ Ready for TradingView webhooks

No more pulling into Replit! 🚀

