# Railway Deployment - Step-by-Step Guide

## 📋 Complete Checklist

Follow these steps in order:

---

## Step 1: Push Your Code to GitHub

**If you haven't already:**

1. Open terminal in your project directory
2. Check if you have a git repository:
   ```bash
   git status
   ```

3. If you need to initialize git (first time):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Railway deployment ready"
   ```

4. If you already have git, just add and commit the new files:
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   ```

5. **Push to GitHub:**
   ```bash
   # If you haven't set up remote yet:
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   
   # If remote already exists:
   git push origin main
   ```

**✅ Checkpoint:** Your code should now be on GitHub.

---

## Step 2: Sign Up / Login to Railway

1. Go to **https://railway.app** in your browser
2. Click **"Start a New Project"** or **"Login"**
3. Choose **"Login with GitHub"** (recommended - makes setup easier)
4. Authorize Railway to access your GitHub account

**✅ Checkpoint:** You should be logged into Railway.

---

## Step 3: Create New Project from GitHub

1. In Railway dashboard, click **"New Project"** (big button)
2. Select **"Deploy from GitHub repo"**
3. If prompted, authorize Railway to access your GitHub repositories
4. Find and select your repository (`portmanagement-` or whatever it's named)
5. Click **"Deploy Now"** or **"Add Service"**

**✅ Checkpoint:** Railway should start building your project (you'll see build logs).

---

## Step 4: Add Environment Variables

**While the build is running (or after it completes):**

1. In your Railway project, click on your **service** (the box with your app name)
2. Click the **"Variables"** tab at the top
3. Click **"+ New Variable"** button
4. Add each variable one by one:

   **Variable 1:**
   - Name: `TRADINGVIEW_REPORT_EMAIL`
   - Value: `ryan@crsolutions.ca`
   - Click **"Add"**

   **Variable 2:**
   - Name: `TRADINGVIEW_WEBHOOK_SECRET`
   - Value: `2e3cb66bdc008494d7d7c989072760e3`
   - Click **"Add"**

   **Variable 3:**
   - Name: `TZ`
   - Value: `America/Denver`
   - Click **"Add"**

   **Variable 4:**
   - Name: `DATABASE_URL`
   - Value: `your-neon-postgresql-connection-string-here`
   - ⚠️ **Replace with your actual Neon database connection string**
   - Click **"Add"**

   **Variable 5:**
   - Name: `NODE_ENV`
   - Value: `production`
   - Click **"Add"**

   **Variable 6 (optional but recommended):**
   - Name: `PORT`
   - Value: `5000`
   - Click **"Add"**

**✅ Checkpoint:** All environment variables should be listed in the Variables tab.

---

## Step 5: Wait for Deployment to Complete

1. Go to the **"Deployments"** tab
2. Watch the build logs - you should see:
   - Installing dependencies
   - Building your app
   - Starting your app
3. Wait until you see **"Deployment successful"** or a green checkmark

**✅ Checkpoint:** Your app should be deployed and running.

---

## Step 6: Get Your Webhook URL

1. Click on the **"Settings"** tab
2. Scroll down to the **"Domains"** section
3. Railway will show you a domain like:
   - `your-app-production.up.railway.app`
   - OR you can click **"Generate Domain"** to create one
4. **Copy this domain** (you'll need it for TradingView)

**Your webhook URL will be:**
```
https://YOUR-DOMAIN.up.railway.app/api/webhooks/tradingview
```

**Example:**
```
https://portmanagement-production.up.railway.app/api/webhooks/tradingview
```

**✅ Checkpoint:** You should have your Railway domain/URL.

---

## Step 7: Test Your Deployment

1. Open your Railway URL in a browser:
   ```
   https://YOUR-DOMAIN.up.railway.app
   ```
2. Your app should load (you might need to log in)
3. Check that the Admin page shows the correct webhook URL

**✅ Checkpoint:** Your app should be accessible and working.

---

## Step 8: Update TradingView Alerts

1. Go to **TradingView.com** and log in
2. Open the chart with your indicator
3. Right-click on the chart → **"Add Alert"** (or edit existing alert)
4. In the alert settings:
   - **Condition:** Your indicator ("Ryan's Perfect Alerts...")
   - **Webhook URL:** Paste your Railway webhook URL:
     ```
     https://YOUR-DOMAIN.up.railway.app/api/webhooks/tradingview
     ```
   - **Message:** Leave as `{{alert_message}}` (your Pine Script sends the JSON)
5. Click **"Create"** or **"Save"**

**✅ Checkpoint:** TradingView alerts should now send to your Railway app.

---

## Step 9: Test a Webhook (Optional but Recommended)

**Option A: Test from TradingView**
- Wait for your alert conditions to trigger
- Check your app's Alerts page to see if it appears
- Check your email (ryan@crsolutions.ca) for notifications

**Option B: Test with curl (in terminal)**
```bash
curl -X POST https://YOUR-DOMAIN.up.railway.app/api/webhooks/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TEST",
    "signal": "BUY",
    "price": 100,
    "email": "ryan@crsolutions.ca",
    "secret": "2e3cb66bdc008494d7d7c989072760e3"
  }'
```

You should get a success response.

**✅ Checkpoint:** Webhooks should be working.

---

## Step 10: (Optional) Set Up Custom Domain

If you want a custom domain instead of `*.up.railway.app`:

1. In Railway **Settings** → **Domains**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Railway will give you DNS records to add
5. Add those records to your domain's DNS settings
6. Wait for DNS to propagate (can take a few minutes to hours)
7. Update TradingView webhook URL to use your custom domain

**✅ Checkpoint:** (Optional) Custom domain should be working.

---

## 🎉 You're Done!

### What Happens Now:

✅ **Automatic Deployments:** Every time you push to GitHub:
```bash
git push origin main
```
Railway automatically builds and deploys your app!

✅ **Permanent URL:** Your webhook URL won't change (unless you want it to)

✅ **No More Manual Steps:** No more pulling into Replit!

---

## 🐛 Troubleshooting

### Build Fails
- Check the **Deployments** tab → Click failed deployment → View logs
- Common issues:
  - Missing environment variables → Add them in Variables tab
  - Database connection → Verify `DATABASE_URL` is correct

### App Won't Start
- Check **Deployments** → **Logs** for error messages
- Verify all environment variables are set
- Make sure `DATABASE_URL` is accessible

### Webhook Not Working
- Verify your Railway app is running (check Deployments tab)
- Test the webhook URL with curl (see Step 9)
- Check Railway logs for incoming requests
- Verify the secret matches in both Railway and Pine Script

### Need Help?
- Railway has great docs: https://docs.railway.app
- Check Railway logs for detailed error messages
- Make sure all environment variables match what's in your `.env` file

---

## 📝 Quick Reference

**Your Railway Dashboard:**
- https://railway.app/dashboard

**Your Webhook URL:**
```
https://YOUR-DOMAIN.up.railway.app/api/webhooks/tradingview
```

**Environment Variables Needed:**
- `TRADINGVIEW_REPORT_EMAIL`
- `TRADINGVIEW_WEBHOOK_SECRET`
- `TZ`
- `DATABASE_URL`
- `NODE_ENV`
- `PORT` (optional)

**Future Deployments:**
Just push to GitHub - Railway handles the rest!

