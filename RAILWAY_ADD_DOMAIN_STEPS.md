# How to Add Custom Domain in Railway - Step by Step

## ⚠️ Important: Custom Domains Require a Paid Plan

**Custom domains are a paid feature:**
- **Free Plan**: 1 custom domain during trial only, then 0
- **Hobby Plan** ($5/month): 2 custom domains included
- **Pro Plan** ($20/month): 20 custom domains included

If you see a message saying you've hit your custom domain limit, you'll need to upgrade to at least the Hobby plan.

## 🎯 Goal
Add `app.www.completeretirementsolutions.com` as a custom domain in Railway.

## 📋 Detailed Steps

### Step 1: Log into Railway

1. Go to **https://railway.app**
2. Click **"Log In"** (top right)
3. Sign in with your account (GitHub, Google, etc.)

### Step 2: Navigate to Your Project

1. You'll see your **Dashboard** with a list of projects
2. **Click on your project** (the one running your port management app)
   - It might be named something like "portmanagement" or whatever you named it

### Step 3: Select Your Service

1. Inside your project, you'll see one or more **services**
2. **Click on the service** that's running your app
   - This is usually the main service (not a database service)
   - It should show as "Running" or "Active"

### Step 4: Open Settings

1. At the top of the service page, you'll see tabs like:
   - **Deployments**
   - **Metrics**
   - **Logs**
   - **Variables**
   - **Settings** ← **Click this one**

2. Click on the **"Settings"** tab

### Step 5: Find the Domains Section

1. Scroll down in the Settings page
2. Look for a section called **"Domains"** or **"Custom Domains"**
   - It's usually near the bottom of the settings page
   - You might see your current Railway domain listed (like `your-app.up.railway.app`)

### Step 6: Add Custom Domain

1. In the Domains section, look for a button that says:
   - **"Add Custom Domain"** or
   - **"Custom Domain"** or
   - **"Generate Domain"** (but you want "Custom Domain")
   - Sometimes it's a **"+"** button or **"Add"** button

2. **Click the button** to add a custom domain

3. A dialog or input field will appear

4. **Enter your domain:**
   ```
   app.www.completeretirementsolutions.com
   ```

5. **Click "Add"** or **"Save"** or **"Confirm"**

### Step 7: Get DNS Instructions

After adding the domain, Railway will:

1. **Show you DNS configuration instructions**
   - You'll see something like:
     ```
     Type: CNAME
     Name: app.www
     Value: your-app-production.up.railway.app
     ```

2. **Copy these details** - you'll need them for the next step

3. The domain status will show as **"Pending"** (this is normal - it will change to "Active" once DNS is configured)

## 🖼️ What You'll See

### In Railway Settings → Domains:

```
┌─────────────────────────────────────────┐
│ Domains                                 │
├─────────────────────────────────────────┤
│                                         │
│ Railway Domain                          │
│ your-app-production.up.railway.app      │
│ ✅ Active                               │
│                                         │
│ Custom Domains                          │
│ ┌─────────────────────────────────────┐ │
│ │ app.www.completeretirementsolutions │ │
│ │ .com                                │ │
│ │ ⏳ Pending                          │ │
│ │                                     │ │
│ │ Configure DNS:                      │ │
│ │ Type: CNAME                         │ │
│ │ Name: app.www                       │ │
│ │ Value: your-app.up.railway.app      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Add Custom Domain]                   │
└─────────────────────────────────────────┘
```

## ⚠️ Common Issues

### "Add Custom Domain" Button Not Visible

**Possible reasons:**
- You're not on the Settings tab (make sure you clicked "Settings")
- You're looking at the project level instead of the service level (click into the service first)
- Your Railway plan doesn't support custom domains (requires Hobby plan or higher after trial)

**Solution:**
- Make sure you're in: **Project → Service → Settings → Domains**
- If you see a message about hitting your custom domain limit, you need to upgrade to Hobby ($5/month) or Pro ($20/month)

### Domain Already Exists Error

**If you see "Domain already exists":**
- The domain might already be added
- Check the Domains list to see if it's there
- If it's there but not working, check the DNS configuration

### Can't Find Settings Tab

**If you don't see a Settings tab:**
- Make sure you clicked on the **service** (not the project)
- The service should show tabs: Deployments, Metrics, Logs, Variables, Settings
- If you only see project-level options, click into the service first

## 📝 After Adding the Domain

Once you've added the domain in Railway:

1. ✅ **Domain is added** - Status shows "Pending"
2. ⏳ **Next step:** Configure DNS at your domain provider
3. ⏳ **Wait for DNS propagation** (15-30 minutes)
4. ✅ **Railway automatically issues SSL** (5-10 minutes after DNS is active)
5. ✅ **Status changes to "Active"** - Your app is live!

## 🔄 Alternative: Railway's New UI

Railway sometimes updates their UI. If the steps above don't match exactly:

1. Look for **"Networking"** or **"Domains"** in the left sidebar
2. Or look for a **"..."** menu (three dots) on your service
3. The domain settings might be under **"Configure"** or **"Network"**

## 💡 Pro Tip

If you're having trouble finding it:
- Railway's UI can vary slightly
- The key is: **Service → Settings → Domains**
- If you can't find it, Railway's support chat is very helpful!

## ✅ Next Steps

After adding the domain in Railway:

1. **Copy the DNS instructions** Railway provides
2. **Go to your DNS provider** (wherever you manage DNS for completeretirementsolutions.com)
3. **Add the CNAME record** Railway specified
4. **Wait for DNS propagation**
5. **Check Railway** - status should change to "Active"

See `SUBDOMAIN_SETUP.md` for the complete DNS configuration steps!

