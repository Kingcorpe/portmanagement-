# Base Path Quick Start Guide

## ✅ What's Been Done

Your app now supports serving from a base path like `/app`. The following changes have been made:

1. ✅ **Vite configuration** - Added base path support
2. ✅ **Express production server** - Serves static files from base path
3. ✅ **Express dev server** - Development mode also supports base path
4. ✅ **Wouter routing** - Works automatically (no changes needed)

## 🚀 How to Use

### Option 1: Serve at Root (Default - No Changes Needed)

If you don't set `BASE_PATH`, your app works exactly as before at the root:
- `https://yourdomain.com/` → Your app
- `https://yourdomain.com/api/*` → Your API

### Option 2: Serve at `/app` Path

To serve your app at `www.completeretirementsolutions.com/app`:

1. **Add environment variable in Railway:**
   ```
   BASE_PATH=/app
   ```

2. **Deploy:**
   ```bash
   git add .
   git commit -m "Add base path support"
   git push origin main
   ```

3. **Result:**
   - `https://www.completeretirementsolutions.com/app` → Your app
   - `https://www.completeretirementsolutions.com/api/*` → Your API (unchanged)

## 📋 Setup Steps for `/app` Path

### Step 1: Configure Railway

1. Go to Railway Dashboard
2. Select your service
3. Go to **Variables** tab
4. Click **"New Variable"**
5. Add:
   - **Name:** `BASE_PATH`
   - **Value:** `/app`
6. Save

### Step 2: Deploy

Railway will automatically rebuild with the new base path. Or push your code:

```bash
git push origin main
```

### Step 3: Configure Domain

1. In Railway, go to **Settings** → **Domains**
2. Add custom domain: `www.completeretirementsolutions.com`
3. Configure DNS as instructed by Railway
4. Wait for DNS propagation (15-30 minutes)

### Step 4: Test

- Visit `https://www.completeretirementsolutions.com/app` - should show your app
- Visit `https://www.completeretirementsolutions.com/api/...` - should work as before

## ⚠️ Important Notes

### API Routes Stay at Root

Your API routes (`/api/*`) will continue to work at the root level:
- ✅ `https://www.completeretirementsolutions.com/api/webhooks/tradingview` - Works
- ✅ `https://www.completeretirementsolutions.com/api/households` - Works

This is intentional - your API doesn't need the base path prefix.

### Webhook URLs

Your webhook URLs will be:
```
https://www.completeretirementsolutions.com/api/webhooks/tradingview
```

Update these in TradingView if needed.

### Authentication

Authentication callbacks will work automatically. The app detects the domain dynamically.

## 🧪 Testing Locally

To test with base path locally:

```bash
# Set base path
export BASE_PATH=/app

# Build
npm run build

# Start
npm start

# Visit: http://localhost:5000/app
```

## 🔄 Removing Base Path

To go back to serving at root:

1. Remove `BASE_PATH` variable from Railway (or set it to `/`)
2. Redeploy

## 📚 More Information

See `BASE_PATH_SETUP.md` for detailed technical information.




