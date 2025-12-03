# Automated Daily Backup Setup - Quick Start

This guide will help you set up automated daily backups that email you the backup file.

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Your Credentials

You'll need:
1. **Railway DATABASE_URL** - From Railway Dashboard → PostgreSQL → Variables
2. **Resend API Key** - From https://resend.com/api-keys
3. **Resend From Email** - Your verified domain email (or use default)

### Step 2: Run the Setup Script

```bash
cd /Users/kingair/portmanagement-
./setup-daily-backup.sh
```

The script will:
- ✅ Ask for your credentials
- ✅ Ask what time to run backups (default: 2 AM)
- ✅ Create the automation
- ✅ Test it immediately

### Step 3: Verify It Works

1. Check your email at `ryan@crsolutions.ca`
2. You should receive the backup file (or download link if large)

---

## 📧 How Email Works

### Small Backups (< 20MB)
- Backup file is **attached directly** to the email
- Download and save the `.sql.gz` file

### Large Backups (> 20MB)
- Backup is uploaded to **transfer.sh** (free file sharing)
- Email contains a **download link**
- Link expires in 7 days - download and save it!

---

## ⚙️ Configuration

### Environment Variables Needed

The setup script will ask for these, or you can set them manually:

```bash
export DATABASE_URL="postgresql://user:pass@host/db"
export RESEND_API_KEY="re_xxxxxxxxxxxxx"
export RESEND_FROM_EMAIL="your-email@yourdomain.com"  # Optional
export BACKUP_EMAIL="ryan@crsolutions.ca"  # Optional, defaults to ryan@crsolutions.ca
```

### Backup Schedule

- **Default:** Daily at 2:00 AM
- **Change:** Edit the plist file or re-run setup script

---

## 🔧 Management

### Check Status
```bash
launchctl list | grep portmanagement
```

### View Logs
```bash
# Recent backup logs
tail -f ~/portmanagement-backups/backup.log

# Automation logs
tail -f ~/portmanagement-backups/launchd.log
tail -f ~/portmanagement-backups/launchd-error.log
```

### Manual Backup
```bash
cd /Users/kingair/portmanagement-
./backup-database.sh
```

Or:
```bash
npm run backup
```

### Stop Automation
```bash
launchctl unload ~/Library/LaunchAgents/com.portmanagement.backup.plist
```

### Start Automation
```bash
launchctl load ~/Library/LaunchAgents/com.portmanagement.backup.plist
```

### Change Schedule
1. Edit `~/Library/LaunchAgents/com.portmanagement.backup.plist`
2. Change the `Hour` and `Minute` values
3. Unload and reload:
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.portmanagement.backup.plist
   launchctl load ~/Library/LaunchAgents/com.portmanagement.backup.plist
   ```

---

## 📁 Backup Storage

### Local Backups
- **Location:** `~/portmanagement-backups/`
- **Format:** `backup-YYYYMMDD_HHMMSS.sql.gz`
- **Retention:** 30 days (automatically cleaned up)

### Email Backups
- **Small files:** Attached to email
- **Large files:** Download link in email (expires in 7 days)

---

## 🆘 Troubleshooting

### "RESEND_API_KEY not found"
- Get your API key from https://resend.com/api-keys
- Set it: `export RESEND_API_KEY="your-key"`
- Or re-run setup script

### "DATABASE_URL not found"
- Get it from Railway Dashboard → PostgreSQL → Variables
- Set it: `export DATABASE_URL="your-url"`
- Or re-run setup script

### "pg_dump command not found"
```bash
brew install postgresql
```

### Email not received
1. Check spam folder
2. Check logs: `tail -f ~/portmanagement-backups/backup.log`
3. Verify Resend API key is correct
4. Check Resend dashboard for delivery status

### Backup not running automatically
1. Check if job is loaded:
   ```bash
   launchctl list | grep portmanagement
   ```
2. Check error logs:
   ```bash
   tail -f ~/portmanagement-backups/launchd-error.log
   ```
3. Reload the job:
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.portmanagement.backup.plist
   launchctl load ~/Library/LaunchAgents/com.portmanagement.backup.plist
   ```

---

## ✅ What You Get

Every day at your scheduled time:
1. ✅ Database backup is created
2. ✅ Backup is compressed (saves space)
3. ✅ Backup is saved locally (`~/portmanagement-backups/`)
4. ✅ Backup is emailed to you (or download link if large)
5. ✅ Old backups are cleaned up (keeps last 30 days)

---

## 🔒 Security Notes

- ⚠️ Backups contain **all your database data**
- ⚠️ Keep backup files **secure**
- ⚠️ Don't share backup files
- ⚠️ Download and save large backups before the link expires (7 days)

---

## 📚 Related Files

- `backup-database.sh` - Main backup script
- `scripts/email-backup.js` - Email sending script
- `setup-daily-backup.sh` - Setup automation script
- `BACKUP_SETUP.md` - Manual backup guide
- `ARCHITECTURE_GUIDE.md` - Architecture overview

---

**Ready to set up? Run:**
```bash
./setup-daily-backup.sh
```

