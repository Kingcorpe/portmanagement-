# Architecture Guide - What You Need to Know

This guide explains how your application is structured and what you need to know about data persistence, deployments, and architecture.

---

## 🏗️ The Big Picture

Your application has **three main components**:

1. **Code** (stored in GitHub)
2. **Database** (stored in Railway PostgreSQL)
3. **Environment Variables** (stored in Railway)

These are **completely separate** and managed independently.

---

## 📦 1. Code (GitHub)

### What it is:
- All your application files (`.ts`, `.tsx`, `.css`, etc.)
- Configuration files (`package.json`, `tsconfig.json`, etc.)
- UI components, pages, business logic
- Everything in your repository

### Where it lives:
- **Local:** On your computer in `/Users/kingair/portmanagement-`
- **GitHub:** In your repository (backed up in the cloud)
- **Railway:** Automatically deployed from GitHub

### What happens when you push to GitHub:
- ✅ Code is saved to GitHub (backed up)
- ✅ Railway automatically deploys the new code
- ❌ **Does NOT affect your database data**
- ❌ **Does NOT affect environment variables**

### Key Points:
- **Code changes** = Push to GitHub → Railway auto-deploys
- **Data changes** = Happen in the database (separate from code)
- Your code is safe in GitHub, but **your data is NOT in GitHub**

---

## 🗄️ 2. Database (Railway PostgreSQL)

### What it stores:
**ALL your application data:**
- Households
- Individuals & Corporations
- Accounts (Individual, Corporate, Joint)
- Positions (all holdings)
- Target Allocations
- Tasks
- TradingView Alerts
- Trading Journal entries
- Universal Holdings (master ticker list)
- Users
- Audit logs
- Planned Portfolios
- Freelance Portfolios
- Watchlists
- Dividends
- Reports
- **Everything you create through the app**

### Where it lives:
- **Local Development:** Separate database (SQLite or local PostgreSQL)
- **Railway Production:** Railway PostgreSQL (cloud database)
- **These are completely separate** - data in one doesn't exist in the other

### Critical Points:
- ✅ **Data persists** on Railway as long as Railway is active
- ✅ **Data is separate** from your code
- ⚠️ **Data is NOT in GitHub** - you must back it up separately
- ⚠️ **Local and Railway databases are different** - data doesn't sync automatically

### What happens when you:
- **Push code to GitHub:** Database is NOT affected
- **Create data on Railway:** Only exists on Railway (not local)
- **Create data locally:** Only exists locally (not Railway)
- **Stop using Railway:** You lose access unless you've backed up

### Backup Strategy:
- **Daily automated backups** (see `backup-database.sh`)
- **Manual backups** before major changes
- **Store backups** in multiple places (local + cloud)

---

## 🔐 3. Environment Variables (Railway)

### What they are:
Configuration values that change between environments:
- `DATABASE_URL` - Connection to your database
- `TRADINGVIEW_WEBHOOK_SECRET` - Security for webhooks
- `TRADINGVIEW_REPORT_EMAIL` - Email for alerts
- `SESSION_SECRET` - Session encryption
- `RESEND_API_KEY` - Email service API key
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email server settings
- `PORT` - Server port
- `TZ` - Timezone
- And more...

### Where they live:
- **Local:** In `.env` file (not in GitHub - in `.gitignore`)
- **Railway:** In Railway dashboard → Variables tab
- **These are separate** - local `.env` doesn't affect Railway

### Critical Points:
- ⚠️ **Environment variables are NOT in GitHub** (for security)
- ⚠️ **You must set them separately** in Railway
- ⚠️ **If you lose Railway access**, you need to document your env vars
- ✅ **Local `.env` file** is for development only

### What happens when you:
- **Push code to GitHub:** Environment variables are NOT affected
- **Change Railway env vars:** Only affects Railway (not local)
- **Change local `.env`:** Only affects local (not Railway)

---

## 📁 4. File Uploads (Object Storage)

### What it is:
Files uploaded through your app (if you have file upload features):
- PDFs
- Images
- Documents
- Any user-uploaded files

### Where it lives:
- Depends on your configuration
- Could be: Local filesystem, S3, Railway object storage, etc.
- **Separate from code and database**

### Critical Points:
- ⚠️ **File uploads are NOT in GitHub**
- ⚠️ **File uploads are NOT in the database** (usually)
- ⚠️ **Must be backed up separately** if important

---

## 🔄 Deployment Flow

### When you push to GitHub:

```
1. You: git push origin main
   ↓
2. GitHub: Receives your code
   ↓
3. Railway: Detects the push (webhook)
   ↓
4. Railway: Builds your application
   ↓
5. Railway: Deploys new code
   ↓
6. Your app: Restarts with new code
   ↓
7. Database: UNCHANGED (still has all your data)
   ↓
8. Environment Variables: UNCHANGED
```

### What gets updated:
- ✅ Application code
- ✅ UI changes
- ✅ Bug fixes
- ✅ New features

### What does NOT get updated:
- ❌ Database data (still there)
- ❌ Environment variables (still there)
- ❌ File uploads (still there)

---

## 🏠 Local vs Production

### Local Development (`localhost:5000`):
- **Code:** On your computer
- **Database:** Local database (separate from Railway)
- **Environment:** Uses `.env` file
- **Purpose:** Development and testing
- **Data:** Test data only (usually)

### Production (Railway):
- **Code:** Deployed from GitHub
- **Database:** Railway PostgreSQL (cloud)
- **Environment:** Uses Railway Variables
- **Purpose:** Real client data
- **Data:** All your actual data

### Key Differences:
- **Separate databases** - data doesn't sync
- **Separate environments** - config is different
- **Separate purposes** - local for dev, Railway for production

---

## ⚠️ Critical Gotchas

### 1. Data is NOT in GitHub
- Your code is safe in GitHub
- Your data is NOT in GitHub
- **You must back up your database separately**

### 2. Local and Production are Separate
- Creating data locally doesn't create it on Railway
- Creating data on Railway doesn't create it locally
- **They are completely independent**

### 3. Environment Variables are Separate
- Local `.env` doesn't affect Railway
- Railway variables don't affect local
- **You must set them in both places** (if needed)

### 4. Code Changes Don't Affect Data
- Pushing code doesn't delete or modify your data
- Your data is safe when you deploy
- **But you still need backups** (in case Railway has issues)

### 5. If You Switch Platforms
- You can take your code (it's in GitHub)
- You can take your data (export database)
- You can take your env vars (document them)
- **But you must do this manually**

---

## ✅ Best Practices

### 1. Code Management
- ✅ Commit and push regularly to GitHub
- ✅ Use meaningful commit messages
- ✅ Keep your code in sync with GitHub

### 2. Data Management
- ✅ **Set up daily automated backups** (see `backup-database.sh`)
- ✅ Test your backups periodically
- ✅ Store backups in multiple places
- ✅ Back up before major changes

### 3. Environment Variables
- ✅ Document your env vars (in a secure place)
- ✅ Keep local `.env` for development
- ✅ Keep Railway variables for production
- ✅ Don't commit `.env` to GitHub (it's in `.gitignore`)

### 4. Deployment
- ✅ Test locally before pushing
- ✅ Push to GitHub to deploy to Railway
- ✅ Verify deployment worked
- ✅ Check that data is still there

---

## 🆘 What to Do If...

### If Railway goes down:
- Your code is safe (in GitHub)
- Your data might be at risk (if Railway has issues)
- **Solution:** Restore from backup to new platform

### If you want to switch platforms:
- Export your database (see backup guide)
- Document your environment variables
- Deploy code to new platform
- Import database to new platform
- Set environment variables on new platform

### If you lose access to Railway:
- Your code is safe (in GitHub)
- Your data might be lost (if you can't access it)
- **Solution:** Restore from backup

### If you want to work from multiple computers:
- Code: Pull from GitHub (always in sync)
- Data: Use Railway (centralized, accessible from anywhere)
- **Don't use local database** for production data

---

## 📊 Summary Table

| Component | Where It Lives | In GitHub? | Backed Up? | Separate Local/Prod? |
|-----------|---------------|------------|------------|---------------------|
| **Code** | GitHub, Local, Railway | ✅ Yes | ✅ Yes (GitHub) | ❌ No (same code) |
| **Database** | Railway PostgreSQL, Local DB | ❌ No | ⚠️ You must backup | ✅ Yes (separate) |
| **Env Vars** | Railway, Local `.env` | ❌ No | ⚠️ You must document | ✅ Yes (separate) |
| **File Uploads** | Object Storage | ❌ No | ⚠️ You must backup | ✅ Yes (separate) |

---

## 🎯 Action Items

1. ✅ **Set up daily backups** - Run `backup-database.sh` daily
2. ✅ **Document env vars** - Keep a secure list of your Railway variables
3. ✅ **Test backups** - Periodically verify you can restore
4. ✅ **Use Railway for production** - Keep all real data on Railway
5. ✅ **Use local for development** - Test code changes locally first

---

## 📚 Related Guides

- `DATABASE_BACKUP_GUIDE.md` - How to backup/restore your database
- `backup-database.sh` - Automated daily backup script
- `RAILWAY_SETUP.md` - Railway deployment guide

---

**Remember:** Code is in GitHub, but data is in the database. Always back up your data separately!

