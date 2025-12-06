# Backup Guide

**Consolidated from:** 9 backup-related documentation files  
**Last Updated:** December 2025

---

## Quick Reference

| Item | Value |
|------|-------|
| **Backup Location** | `~/portmanagement-backups/` |
| **Backup Format** | `backup-YYYYMMDD_HHMMSS.sql.gz` |
| **Retention** | 30 days (auto-cleanup) |
| **Schedule** | Daily at 2:00 AM |
| **Method** | macOS launchd |

---

## Understanding Backups

### Database vs Backup

| Aspect | Database (Live) | Backup (Copy) |
|--------|----------------|---------------|
| **Location** | Railway PostgreSQL (cloud) | Your computer (local) |
| **Type** | Running database server | Static file (`.sql.gz`) |
| **Updates** | Real-time (as you use app) | Only when you run backup |
| **Purpose** | App uses this to run | Safety copy for emergencies |

**Key Point:** Database and backups are different things - the database is live in the cloud, backups are local snapshots.

### What Gets Backed Up

**Included:**
- Households, Individuals, Corporations
- Accounts (Individual, Corporate, Joint)
- Positions, Target Allocations
- Tasks, Alerts, Trading Journal entries
- Universal Holdings, Users, Audit logs
- Everything in your database

**NOT Included:**
- Environment variables (stored separately in Railway)
- File uploads (if stored in object storage)

---

## Quick Setup (5 minutes)

### Step 1: Get Your Railway Database URL

1. Go to [Railway Dashboard](https://railway.app)
2. Click on your project → PostgreSQL service
3. Go to **Variables** tab
4. Copy the `DATABASE_URL` value

### Step 2: Set Environment Variable

Add to your `~/.zshrc`:

```bash
# Open shell profile
nano ~/.zshrc

# Add this line:
export DATABASE_URL="postgresql://user:password@host:port/database"

# Reload
source ~/.zshrc
```

### Step 3: Test the Backup

```bash
cd /Users/kingair/portmanagement-
./backup-database.sh
```

You should see:
- Backup completed successfully
- New file in `~/portmanagement-backups/`

### Step 4: Set Up Automated Backups

Run the setup script:

```bash
./setup-daily-backup.sh
```

This will:
- Ask for your credentials
- Set the backup time (default: 2 AM)
- Create the automation
- Test immediately

---

## Manual Backup Commands

### Create a backup:
```bash
cd /Users/kingair/portmanagement-
./backup-database.sh
```

Or use npm:
```bash
npm run backup
```

### List recent backups:
```bash
ls -lh ~/portmanagement-backups/backup-*.sql.gz | tail -5
```

### View backup log:
```bash
tail -20 ~/portmanagement-backups/backup.log
```

### Open backup folder in Finder:
```bash
open ~/portmanagement-backups/
```

---

## Restore from Backup

### To restore a backup:

```bash
# For compressed SQL files:
gunzip < ~/portmanagement-backups/backup-YYYYMMDD_HHMMSS.sql.gz | psql "new-database-url"
```

### Test restore (recommended):
```bash
# Create a test database first, then:
gunzip < ~/portmanagement-backups/backup-YYYYMMDD_HHMMSS.sql.gz | psql "test-database-url"
```

---

## Managing Automated Backups

### Check if automation is running:
```bash
launchctl list | grep portmanagement
```

### View logs:
```bash
tail -f ~/portmanagement-backups/launchd.log
tail -f ~/portmanagement-backups/launchd-error.log
```

### Stop automation:
```bash
launchctl unload ~/Library/LaunchAgents/com.portmanagement.backup.plist
```

### Start automation:
```bash
launchctl load ~/Library/LaunchAgents/com.portmanagement.backup.plist
```

### Change schedule:
1. Edit `~/Library/LaunchAgents/com.portmanagement.backup.plist`
2. Change `Hour` and `Minute` values
3. Unload and reload

---

## Email Backups

When configured, backups are emailed automatically:

- **Small backups (< 20MB):** Attached to email
- **Large backups (> 20MB):** Download link (expires in 7 days)

### Required environment variables:
```bash
export RESEND_API_KEY="re_xxxxxxxxxxxxx"
export RESEND_FROM_EMAIL="your-email@yourdomain.com"  # Optional
export BACKUP_EMAIL="your@email.com"  # Optional
```

---

## Cloud Backup (Recommended)

Since local backups are vulnerable to hardware failure, consider cloud sync:

### Option 1: Sync to iCloud/Google Drive
```bash
ln -s ~/portmanagement-backups ~/Library/Mobile\ Documents/com~apple~CloudDocs/portmanagement-backups
```

### Option 2: Upload to S3
Add to backup script:
```bash
aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/
```

### Option 3: Private GitHub repo
```bash
cd ~/portmanagement-backups
git init
git remote add origin https://github.com/yourusername/backups-private.git
```

---

## Troubleshooting

### "pg_dump command not found"
```bash
brew install postgresql
```

### "DATABASE_URL not set"
```bash
echo $DATABASE_URL  # Check if set
# If empty, add to ~/.zshrc (see Step 2)
```

### "Permission denied"
```bash
chmod +x backup-database.sh
```

### Backups not running automatically
```bash
# Check status
launchctl list | grep portmanagement

# Check logs
tail -f ~/portmanagement-backups/launchd-error.log

# Reload
launchctl unload ~/Library/LaunchAgents/com.portmanagement.backup.plist
launchctl load ~/Library/LaunchAgents/com.portmanagement.backup.plist
```

### Backup file very small
This is normal if your database is empty or you're rebuilding. As you add data, backups will grow.

---

## Migration Checklist

When moving to a new platform:

- [ ] Export database backup
- [ ] Test restore on a test database
- [ ] Set up new database on new platform
- [ ] Restore backup to new database
- [ ] Update DATABASE_URL in new platform
- [ ] Test application with new database
- [ ] Verify all data is present
- [ ] Keep old database for 30 days (just in case)

---

## Security Notes

- Database backups contain **all your sensitive data**
- Keep backup files **secure**
- Don't share backup files
- `DATABASE_URL` contains credentials - never commit to GitHub
- Download email backup links before they expire (7 days)

---

## Related Files

- `backup-database.sh` - Main backup script
- `setup-daily-backup.sh` - Setup automation script
- `scripts/email-backup.js` - Email sending script
- `~/Library/LaunchAgents/com.portmanagement.backup.plist` - Automation config

---

*Backups run daily at 2:00 AM automatically. Check `~/portmanagement-backups/` for your backup files.*

