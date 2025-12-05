# Deployment Guide

**Consolidated from:** 10+ deployment-related documentation files  
**Last Updated:** December 2025

---

## Quick Reference

| Item | Value |
|------|-------|
| **Platform** | Railway (recommended) |
| **Auto-Deploy** | Push to `origin main` |
| **Database** | Neon PostgreSQL |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |

---

## Environment Variables

**Required in Railway dashboard:**

```bash
# Core
NODE_ENV=production
DATABASE_URL=postgresql://...  # Your Neon connection string
SESSION_SECRET=your-random-secret-here

# TradingView
TRADINGVIEW_REPORT_EMAIL=your@email.com
TRADINGVIEW_WEBHOOK_SECRET=your-webhook-secret
TRADINGVIEW_IP_WHITELIST=1.2.3.4,5.6.7.8  # Get from TradingView

# Other
TZ=America/Denver
PORT=5000  # Optional - Railway sets automatically
LOCAL_DEV=false  # Must be false in production
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Quick Deploy (5 minutes)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
```

### Step 2: Create Railway Project
1. Go to https://railway.app
2. Sign up with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Select your repository
5. Click **Deploy**

### Step 3: Add Environment Variables
1. Click on your service → **Variables** tab
2. Add all required environment variables
3. Railway will automatically redeploy

### Step 4: Get Your URL
1. Go to **Settings** tab → **Domains**
2. Click **Generate Domain** (or use existing)
3. Your app: `https://your-app.up.railway.app`
4. Your webhook: `https://your-app.up.railway.app/api/webhooks/tradingview`

---

## Auto-Deployment

Once set up, every push to main triggers deployment:

```bash
git push origin main
# Railway automatically builds and deploys!
```

**What happens:**
1. Railway detects the push
2. Runs `npm install`
3. Runs `npm run build`
4. Runs `npm start`
5. App is live!

---

## Custom Domain Setup

### Pricing Note
- **Free Plan:** Railway domain only (`.up.railway.app`)
- **Hobby Plan ($5/month):** 2 custom domains
- **Pro Plan ($20/month):** 20 custom domains

### Add Custom Domain

1. **In Railway:** Settings → Domains → Add Custom Domain
2. Enter your domain (e.g., `app.yourdomain.com`)
3. Copy the DNS instructions Railway provides

### Configure DNS

**For subdomains (recommended):**
```
Type: CNAME
Name: app (or www)
Value: your-app.up.railway.app
TTL: 3600
```

**For root domain:**
```
Type: A
Name: @ (or blank)
Value: [IP from Railway]
TTL: 3600
```

### SSL Certificate
- Railway automatically issues SSL via Let's Encrypt
- Usually ready 5-10 minutes after DNS propagates
- Your site works at `https://yourdomain.com` automatically

---

## Post-Deployment Checklist

**Immediately:**
- [ ] App loads at Railway URL
- [ ] Environment variables are set
- [ ] Database connection works
- [ ] Authentication works

**Testing:**
- [ ] GET `/api/auth/user` - Returns user data
- [ ] GET `/api/csrf-token` - Returns CSRF token
- [ ] Webhook test (curl or TradingView)

**Monitoring:**
- [ ] Check Railway logs for errors
- [ ] Verify no sensitive data in logs
- [ ] Test all critical features

---

## Update TradingView Webhooks

After deployment, update your TradingView alerts:

1. Go to TradingView
2. Edit your alert settings
3. Update webhook URL:
   ```
   https://your-app.up.railway.app/api/webhooks/tradingview
   ```
4. Save the alert

**Test webhook:**
```bash
curl -X POST https://your-app.up.railway.app/api/webhooks/tradingview \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TEST","signal":"BUY","price":100,"secret":"your-webhook-secret"}'
```

---

## Monitoring & Logs

### View Logs
1. Railway dashboard → Deployments tab
2. Click on deployment → View Logs

### Log Files
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

### What to Monitor
- Error rates
- Webhook processing
- Authentication issues
- Performance metrics

---

## Troubleshooting

### Build Fails
- Check Deployments tab → Click failed deployment → View logs
- Verify all environment variables are set
- Check DATABASE_URL is correct

### App Won't Start
- Check deployment logs for errors
- Verify environment variables
- Test DATABASE_URL connection

### Webhook Not Working
- Verify app is running (Deployments tab)
- Test URL with curl
- Check logs for incoming requests
- Verify secret matches

### DNS Issues (Custom Domain)
- Wait for propagation (15-30 min typical)
- Verify CNAME value is correct
- Check with: `dig yourdomain.com`
- Railway domain should show "Active"

### Authentication Issues
- Verify SESSION_SECRET is set
- Check callback URLs match domain
- Review Railway logs

---

## Rollback

### Option 1: Railway Dashboard
1. Go to Deployments tab
2. Find previous successful deployment
3. Click **Redeploy**

### Option 2: Git Revert
```bash
git revert HEAD
git push origin main
```

---

## Security Checklist

**Before going live:**
- [ ] NODE_ENV=production
- [ ] LOCAL_DEV=false (or not set)
- [ ] SESSION_SECRET is random and secure
- [ ] DATABASE_URL is production database
- [ ] No hardcoded secrets in code
- [ ] HTTPS enabled (Railway default)

**Ongoing:**
- [ ] Keep dependencies updated
- [ ] Monitor error logs
- [ ] Review access patterns
- [ ] Test backups work

---

## Alternative Platforms

### Render
- Similar to Railway
- Free tier sleeps after 15min inactivity
- Setup: render.com → Web Service → Connect GitHub

### Fly.io
- More control, CLI-based
- Setup: `brew install flyctl` → `fly launch`

---

## Workflow Summary

**Your deployment workflow:**
1. Code in Cursor
2. `git commit` and `git push origin main`
3. Railway automatically deploys
4. TradingView webhooks work immediately

No manual steps needed after initial setup!

---

## Related Files

- `railway.json` - Railway configuration
- `nixpacks.toml` - Build configuration
- `server/index-prod.ts` - Production entry point
- `.env.example` - Environment variable template

---

*Push to `origin main` to deploy. Railway handles the rest!*

