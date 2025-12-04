# Deployment Guide - Moving Beyond Replit

## 🎯 Recommended: Railway (Easiest Setup)

Railway is perfect for your Express + React app and has GitHub integration.

### Setup Steps:

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Sign up at Railway**:
   - Go to https://railway.app
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Configure Environment Variables**:
   In Railway dashboard, go to Variables tab and add:
   ```
   TRADINGVIEW_REPORT_EMAIL=ryan@crsolutions.ca
   TRADINGVIEW_WEBHOOK_SECRET=2e3cb66bdc008494d7d7c989072760e3
   TZ=America/Denver
   DATABASE_URL=your-neon-connection-string
   PORT=5000
   NODE_ENV=production
   ```

4. **Railway Auto-Detects**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Railway will automatically detect your `package.json` scripts

5. **Get Your Webhook URL**:
   - Railway gives you a domain like: `your-app.up.railway.app`
   - Your webhook URL: `https://your-app.up.railway.app/api/webhooks/tradingview`
   - Update this in TradingView alerts

6. **Custom Domain (Optional - Requires Paid Plan)**:
   - ⚠️ **Requires Hobby plan ($5/month) or higher** after trial period
   - Add your own domain in Railway settings
   - Point DNS to Railway's servers
   - Now your webhook URL is permanent: `https://yourdomain.com/api/webhooks/tradingview`
   - **Note**: Railway's provided domain (`.up.railway.app`) works perfectly fine and is permanent too

### Benefits:
- ✅ **Automatic deployments** from GitHub (push to main = deploy)
- ✅ **Free tier** ($5 credit/month, usually enough for small apps)
  - ⚠️ Note: Custom domains require Hobby plan ($5/month) after trial
  - Railway-provided domain works on free tier
- ✅ **Environment variables** managed in dashboard
- ✅ **Logs** visible in dashboard
- ✅ **No manual steps** - just push to GitHub
- ✅ **Permanent URLs** - Railway domain won't change unless you want it to

---

## 🚀 Alternative: Render (Similar to Railway)

1. Go to https://render.com
2. Sign up with GitHub
3. New → Web Service → Connect GitHub repo
4. Settings:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment: Node
5. Add environment variables
6. Deploy!

**Free tier**: Sleeps after 15min inactivity (wakes on first request)

---

## 🔧 Alternative: Fly.io (More Control)

Good if you want more control and don't mind CLI setup.

1. Install Fly CLI: `brew install flyctl`
2. Login: `fly auth login`
3. Launch: `fly launch` (in your project directory)
4. Follow prompts
5. Deploy: `fly deploy`

---

## 📋 Migration Checklist

### Before Deploying:
- [ ] Push all code to GitHub
- [ ] Create `.env.example` file (without secrets) for reference
- [ ] Test build locally: `npm run build && npm start`
- [ ] Verify all environment variables are documented

### After Deploying:
- [ ] Update TradingView webhook URLs to new domain
- [ ] Test webhook with a test alert
- [ ] Update any hardcoded URLs in your code
- [ ] Set up custom domain (optional but recommended)

### Environment Variables Needed:
```
TRADINGVIEW_REPORT_EMAIL=ryan@crsolutions.ca
TRADINGVIEW_WEBHOOK_SECRET=2e3cb66bdc008494d7d7c989072760e3
TZ=America/Denver
DATABASE_URL=postgresql://...
PORT=5000
NODE_ENV=production
```

---

## 🔄 Workflow Comparison

### Your Proposed (Cursor → GitHub → Replit):
```
1. Code in Cursor
2. Commit & push to GitHub
3. Pull into Replit
4. Deploy from Replit
```
**Issues**: Manual step, vendor lock-in, URLs can change

### Recommended (Cursor → GitHub → Auto-Deploy):
```
1. Code in Cursor
2. Commit & push to GitHub
3. Railway/Render auto-deploys
```
**Benefits**: Fully automated, no manual steps, permanent URLs

---

## 🎯 Recommendation

**Start with Railway** - it's the easiest migration path:
- Similar to Replit in ease of use
- Better long-term (not a dev environment, built for production)
- GitHub integration means zero manual deployment steps
- Free tier to start, scales as you grow

**Your workflow becomes**:
1. Code in Cursor
2. `git push` to GitHub
3. Railway automatically deploys
4. TradingView webhooks work immediately

No more pulling into Replit! 🎉

