# Subdomain Setup: app.www.completeretirementsolutions.com

## 🎯 Goal

Point `app.www.completeretirementsolutions.com` to your Railway app.

## ✅ What You Need

- Access to your domain's DNS settings (wherever you manage DNS for `completeretirementsolutions.com`)
- Railway account with your app deployed

## 🚀 Step-by-Step Setup

### Step 1: Add Custom Domain in Railway

1. **Go to Railway Dashboard**
   - Navigate to https://railway.app
   - Log in to your account
   - Select your project
   - Click on your service (the one running your app)

2. **Open Settings**
   - Click on the **"Settings"** tab
   - Scroll down to the **"Domains"** section

3. **Add Custom Domain**
   - Click **"Add Custom Domain"** or **"Custom Domain"** button
   - Enter: `app.www.completeretirementsolutions.com`
   - Click **"Add"** or **"Save"**

4. **Get DNS Instructions**
   - Railway will show you DNS configuration instructions
   - You'll see something like:
     - **Type:** CNAME
     - **Name:** `app.www` (or Railway might show the full subdomain)
     - **Value:** `your-app-production.up.railway.app` (Railway will provide this)
   - **Copy these details** - you'll need them in the next step

### Step 2: Configure DNS at Your Domain Provider

1. **Log in to Your DNS Provider**
   - This could be:
     - Your domain registrar (GoDaddy, Namecheap, etc.)
     - Cloudflare (if you use it)
     - Your hosting provider's DNS management
     - Anywhere you manage DNS for `completeretirementsolutions.com`

2. **Add CNAME Record**
   - Find the DNS management section
   - Look for "DNS Records", "DNS Management", or "DNS Settings"
   - Click **"Add Record"** or **"Create Record"**

3. **Enter the CNAME Details**
   - **Type:** Select `CNAME`
   - **Name/Host:** `app.www` (or just `app.www` - depends on your provider)
     - Some providers require the full subdomain: `app.www.completeretirementsolutions.com`
     - Some just need: `app.www`
     - Check your provider's documentation if unsure
   - **Value/Target/Points to:** The Railway domain (from Step 1)
     - Example: `your-app-production.up.railway.app`
   - **TTL:** `3600` (or leave as default/auto)

4. **Save the Record**
   - Click **"Save"** or **"Add Record"**
   - The record should now appear in your DNS list

### Step 3: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes** in most cases
- You can check status in Railway dashboard - it will show "Pending" → "Active"

**To check if DNS has propagated:**
```bash
# On Mac/Linux, run in terminal:
dig app.www.completeretirementsolutions.com

# Or use online tools:
# - https://dnschecker.org
# - https://www.whatsmydns.net
```

Look for the CNAME record pointing to your Railway domain.

### Step 4: SSL Certificate (Automatic!)

- Railway **automatically provisions SSL certificates** via Let's Encrypt
- Once DNS is active, Railway will detect it and issue the certificate
- This usually takes **5-10 minutes** after DNS is active
- Your site will be accessible via `https://app.www.completeretirementsolutions.com` automatically

### Step 5: Verify Everything Works

1. **Check Railway Status**
   - Go back to Railway → Settings → Domains
   - You should see `app.www.completeretirementsolutions.com` with status "Active" (green checkmark)

2. **Visit Your App**
   - Open browser and go to: `https://app.www.completeretirementsolutions.com`
   - Your app should load!

3. **Test Key Features**
   - ✅ Login/authentication works
   - ✅ Navigation works
   - ✅ API calls work (check browser console for errors)
   - ✅ Webhook URL shows correct domain (check Admin page)

## 🔧 Troubleshooting

### Domain Shows "Pending" for a Long Time

**Check:**
1. DNS record is correct (double-check the values)
2. DNS has propagated (use `dig` or online DNS checker)
3. No typos in the subdomain name
4. CNAME record type is correct (not A record)

**Common issues:**
- Wrong record type (using A instead of CNAME)
- Wrong value (typo in Railway domain)
- DNS not propagated yet (wait longer)
- Provider requires full subdomain vs. just the prefix

### SSL Certificate Not Issuing

**Check:**
1. DNS is fully propagated and active
2. Domain is accessible via HTTP (Railway needs this to verify)
3. Wait 10-15 minutes after DNS is active

**If still not working:**
- Remove and re-add the domain in Railway
- Check Railway logs for SSL errors
- Verify DNS is pointing correctly

### App Not Loading

**Check:**
1. Railway deployment is running (check Deployments tab)
2. DNS is pointing to Railway (verify with `dig`)
3. Try accessing via Railway domain first to confirm app works
4. Check browser console for errors
5. Verify you're using `https://` (not `http://`)

### "This site can't be reached" Error

**Possible causes:**
- DNS not propagated yet (wait longer)
- Wrong DNS record (check CNAME value)
- Railway service is down (check Railway dashboard)

## 📝 DNS Provider Examples

### Cloudflare
```
Type: CNAME
Name: app.www
Target: your-app-production.up.railway.app
Proxy status: DNS only (gray cloud) - important!
TTL: Auto
```

### GoDaddy
```
Type: CNAME
Host: app.www
Points to: your-app-production.up.railway.app
TTL: 1 Hour
```

### Namecheap
```
Type: CNAME Record
Host: app.www
Value: your-app-production.up.railway.app
TTL: Automatic
```

## ⚠️ Important Notes

### Don't Set BASE_PATH

Since you're using a subdomain, **you don't need to set `BASE_PATH`** in Railway. Your app will work at the root of the subdomain:
- ✅ `https://app.www.completeretirementsolutions.com/` → Your app
- ✅ `https://app.www.completeretirementsolutions.com/api/*` → Your API

### Webhook URLs

After setup, your webhook URL will be:
```
https://app.www.completeretirementsolutions.com/api/webhooks/tradingview
```

Update this in TradingView if needed. The Admin page in your app will automatically show the correct URL.

### Keep Railway Domain Active

- You can keep both domains active (Railway domain + custom subdomain)
- Both will point to the same app
- Useful for testing or as a backup

## ✅ Checklist

- [ ] Added `app.www.completeretirementsolutions.com` in Railway Settings → Domains
- [ ] Copied the CNAME value from Railway
- [ ] Added CNAME record at DNS provider
- [ ] Waited for DNS propagation (15-30 min)
- [ ] Verified DNS is active (Railway shows "Active")
- [ ] SSL certificate issued (automatic, wait 5-10 min after DNS active)
- [ ] Tested app at `https://app.www.completeretirementsolutions.com`
- [ ] Verified authentication works
- [ ] Updated webhook URLs if needed

## 🎉 You're Done!

Once DNS propagates and SSL is issued, your app will be live at:
**https://app.www.completeretirementsolutions.com**

No code changes needed - everything works automatically! 🚀


