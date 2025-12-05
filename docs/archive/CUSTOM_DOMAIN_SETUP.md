# Custom Domain Setup for Railway

## ⚠️ Important: Custom Domains Require a Paid Plan

**Custom domains are a paid feature on Railway:**
- **Free Plan**: 1 custom domain during trial period only, then 0 custom domains
- **Hobby Plan** ($5/month): 2 custom domains included
- **Pro Plan** ($20/month): 20 custom domains included
- **Enterprise Plan**: Unlimited custom domains

The Railway-provided domain (like `your-app.up.railway.app`) works on all plans, but custom domains require at least the Hobby plan after the trial period.

## ✅ Yes, You Can Use Your Own Domain!

Your Railway production website can absolutely forward to your own custom domain and operate exactly as it does now. Railway handles all the routing, SSL certificates, and domain forwarding automatically.

## 🚀 Step-by-Step Setup

### Step 1: Add Custom Domain in Railway

1. **Go to Railway Dashboard**
   - Navigate to https://railway.app
   - Select your project
   - Click on your service (the one running your app)

2. **Open Settings**
   - Click on the **"Settings"** tab
   - Scroll down to the **"Domains"** section

3. **Add Your Domain**
   - Click **"Add Custom Domain"** or **"Custom Domain"**
   - Enter your domain (e.g., `yourdomain.com` or `app.yourdomain.com`)
   - Click **"Add"**

### Step 2: Configure DNS Records

Railway will show you the DNS records you need to add. You'll typically need one of these:

#### Option A: CNAME Record (Recommended for subdomains)
```
Type: CNAME
Name: app (or www, or whatever subdomain you want)
Value: [Railway will provide this - something like: your-app.up.railway.app]
TTL: 3600 (or auto)
```

#### Option B: A Record (For root domain)
```
Type: A
Name: @ (or leave blank for root domain)
Value: [Railway will provide the IP address]
TTL: 3600 (or auto)
```

**Where to add DNS records:**
- Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
- Find DNS management settings
- Add the record Railway provided
- Save changes

### Step 3: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes** in most cases
- Railway will show the status: "Pending" → "Active" when ready

### Step 4: SSL Certificate (Automatic!)

- Railway **automatically provisions SSL certificates** via Let's Encrypt
- Once DNS is active, Railway will detect it and issue the certificate
- This usually takes **5-10 minutes** after DNS is active
- Your site will be accessible via `https://yourdomain.com` automatically

### Step 5: Verify Everything Works

1. **Visit your custom domain**: `https://yourdomain.com`
2. **Check that the app loads** - should work exactly as before
3. **Test authentication** - login should work
4. **Check webhook URL** - Go to Admin page, the webhook URL should automatically update to use your custom domain

## ✅ What Works Automatically

Your app is already configured to work with any domain:

- ✅ **Webhook URLs** - Automatically use `window.location.origin`, so they'll update to your custom domain
- ✅ **Authentication callbacks** - Dynamically configured based on the domain
- ✅ **API endpoints** - All work the same regardless of domain
- ✅ **SSL/HTTPS** - Railway handles this automatically

## 🔄 After Domain Setup

### Update TradingView Webhooks (If Needed)

Your app's Admin page shows the webhook URL dynamically, but if you have TradingView alerts configured:

1. Go to TradingView
2. Edit your alert settings
3. Update the webhook URL to: `https://yourdomain.com/api/webhooks/tradingview`
4. Save the alert

### Keep Railway Domain Active (Optional)

- You can keep both domains active (Railway domain + custom domain)
- Both will point to the same app
- Useful for testing or as a backup

## 🐛 Troubleshooting

### Domain Shows "Pending" for a Long Time

**Check:**
1. DNS records are correct (double-check the values Railway provided)
2. DNS has propagated (use `dig yourdomain.com` or `nslookup yourdomain.com`)
3. No typos in the domain name

**Common DNS issues:**
- Wrong record type (CNAME vs A)
- Wrong value (typo in Railway domain)
- DNS not propagated yet (wait longer)

### SSL Certificate Not Issuing

**Check:**
1. DNS is fully propagated and active
2. Domain is accessible via HTTP (Railway needs this to verify)
3. Wait 10-15 minutes after DNS is active

**If still not working:**
- Remove and re-add the domain in Railway
- Check Railway logs for SSL errors

### App Not Loading on Custom Domain

**Check:**
1. Railway deployment is running (check Deployments tab)
2. DNS is pointing to Railway (verify with `dig` or `nslookup`)
3. Try accessing via Railway domain first to confirm app works
4. Check browser console for errors

### Authentication Not Working

**This should work automatically**, but if you have issues:

1. Check that `trust proxy` is enabled (it is in your code)
2. Verify the callback URL matches your domain
3. Check Railway logs for authentication errors

## 📝 Example DNS Configuration

### For `app.yourdomain.com`:

**At your DNS provider:**
```
Type: CNAME
Name: app
Value: your-app-production.up.railway.app
TTL: 3600
```

**Result:** `https://app.yourdomain.com` → Your Railway app

### For `yourdomain.com` (root domain):

**At your DNS provider:**
```
Type: A
Name: @
Value: [IP address Railway provides]
TTL: 3600
```

**Result:** `https://yourdomain.com` → Your Railway app

## 🎯 Summary

**To use your custom domain:**
1. ✅ Add domain in Railway Settings → Domains
2. ✅ Add DNS record at your domain registrar
3. ✅ Wait for DNS propagation (15-30 min usually)
4. ✅ Railway automatically issues SSL certificate
5. ✅ Your app works at `https://yourdomain.com`!

**No code changes needed** - your app already handles dynamic domains! 🚀

## 💡 Pro Tips

- **Use a subdomain** (like `app.yourdomain.com`) - easier DNS setup with CNAME
- **Keep Railway domain** as backup - both can work simultaneously
- **Test first** - verify app works on Railway domain before adding custom domain
- **Monitor Railway logs** - check for any domain-related errors

---

# Serving at a Path (e.g., `/app`)

If you want your Railway app accessible at `www.completeretirementsolutions.com/app` instead of a subdomain, you have two options:

## Option 1: Configure App to Serve from Base Path (Recommended)

This requires code changes to configure your app to serve from `/app` base path.

### What Needs to Change:

1. **Vite base path** - Configure Vite to build assets with `/app` prefix
2. **Express static serving** - Serve static files from `/app` path
3. **API routes** - Keep API routes at root (or adjust as needed)
4. **Router base** - Configure React Router to use `/app` base

### Implementation:

See `BASE_PATH_SETUP.md` for detailed implementation steps.

**Pros:**
- ✅ Works directly with Railway
- ✅ No additional infrastructure needed
- ✅ Full control

**Cons:**
- ⚠️ Requires code changes
- ⚠️ Need to rebuild and redeploy

## Option 2: Use Reverse Proxy (Easier, No Code Changes)

Set up a reverse proxy on your main domain that forwards `/app` requests to Railway.

### Setup Options:

#### A. Cloudflare Workers (Free, Easy)
- Create a Cloudflare Worker
- Forward `/app/*` requests to your Railway domain
- Keep your main site at root

#### B. Nginx/Proxy Server
- If you have a server running your main site
- Configure nginx to proxy `/app` to Railway
- Example config:
  ```nginx
  location /app {
    proxy_pass https://your-app.up.railway.app;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
  ```

#### C. Railway + Separate Service
- Deploy a simple proxy service on Railway
- Point `www.completeretirementsolutions.com` to the proxy
- Proxy forwards `/app` to your main app

**Pros:**
- ✅ No code changes to your app
- ✅ Can keep app working at Railway domain
- ✅ Flexible routing

**Cons:**
- ⚠️ Additional setup required
- ⚠️ May need additional service/hosting

## Recommendation

**For simplicity:** Use Option 2 with Cloudflare Workers (if you use Cloudflare) or a subdomain like `app.completeretirementsolutions.com`.

**For clean URLs:** Use Option 1 to configure the base path (requires code changes but cleaner long-term).


