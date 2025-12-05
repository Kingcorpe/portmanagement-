# Daily Backup Setup Guide

This guide will help you set up automated daily backups of your Railway database.

---

## Quick Setup (5 minutes)

### Step 1: Get Your Railway Database URL

1. Go to [Railway Dashboard](https://railway.app)
2. Click on your project
3. Click on your PostgreSQL service
4. Go to the **Variables** tab
5. Copy the `DATABASE_URL` value

### Step 2: Set Up Environment Variable

**Option A: Add to your shell profile (Recommended)**

Add this to your `~/.zshrc` file (since you're on macOS with zsh):

```bash
# Open your shell profile
nano ~/.zshrc

# Add this line (replace with your actual DATABASE_URL):
export DATABASE_URL="postgresql://user:password@host:port/database"

# Save and exit (Ctrl+X, then Y, then Enter)

# Reload your shell
source ~/.zshrc
```

**Option B: Create a `.env` file in the project**

Create a `.env` file in your project root (it's already in `.gitignore`):

```bash
# In your project directory
echo 'DATABASE_URL="your-railway-database-url-here"' >> .env
```

Then modify the backup script to source it:
```bash
# Add this line at the top of backup-database.sh (after #!/bin/bash):
source .env 2>/dev/null || true
```

### Step 3: Test the Backup Script

```bash
# Make sure you're in the project directory
cd /Users/kingair/portmanagement-

# Run the backup script manually
./backup-database.sh
```

You should see:
- ✅ Backup completed successfully
- A new file in `~/portmanagement-backups/backup-YYYYMMDD_HHMMSS.sql.gz`

### Step 4: Set Up Daily Automated Backups

**Option A: Using cron (macOS/Linux)**

```bash
# Open your crontab
crontab -e

# Add this line to run backup daily at 2 AM:
0 2 * * * cd /Users/kingair/portmanagement- && /Users/kingair/portmanagement-/backup-database.sh >> /Users/kingair/portmanagement-backups/cron.log 2>&1

# Save and exit
```

**Option B: Using launchd (macOS - More Reliable)**

Create a plist file:

```bash
# Create the plist file
nano ~/Library/LaunchAgents/com.portmanagement.backup.plist
```

Paste this (adjust paths as needed):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.portmanagement.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/kingair/portmanagement-/backup-database.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/kingair/portmanagement-</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>DATABASE_URL</key>
        <string>your-railway-database-url-here</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/kingair/portmanagement-backups/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/kingair/portmanagement-backups/launchd-error.log</string>
</dict>
</plist>
```

Then load it:

```bash
# Load the job
launchctl load ~/Library/LaunchAgents/com.portmanagement.backup.plist

# Start it immediately (optional)
launchctl start com.portmanagement.backup

# Check if it's loaded
launchctl list | grep portmanagement
```

---

## Verify It's Working

### Check Recent Backups

```bash
# List recent backups
ls -lh ~/portmanagement-backups/backup-*.sql.gz | tail -5

# Check backup log
tail -20 ~/portmanagement-backups/backup.log
```

### Test Restore (Optional but Recommended)

```bash
# Create a test database or use a local one
# Then restore from a backup to verify it works:
gunzip < ~/portmanagement-backups/backup-YYYYMMDD_HHMMSS.sql.gz | psql "test-database-url"
```

---

## Backup Location

Backups are stored in: `~/portmanagement-backups/`

- **Backup files:** `backup-YYYYMMDD_HHMMSS.sql.gz`
- **Log file:** `backup.log`
- **Cron log:** `cron.log` (if using cron)

---

## Backup Retention

The script automatically:
- ✅ Keeps backups for **30 days**
- ✅ Deletes older backups automatically
- ✅ Logs all operations

You can change the retention period by editing `backup-database.sh`:
```bash
RETENTION_DAYS=30  # Change this number
```

---

## Manual Backup

You can run a backup manually anytime:

```bash
cd /Users/kingair/portmanagement-
./backup-database.sh
```

---

## Troubleshooting

### "pg_dump command not found"

Install PostgreSQL client tools:
```bash
brew install postgresql
```

### "DATABASE_URL not set"

Make sure you've set the environment variable:
```bash
# Check if it's set
echo $DATABASE_URL

# If empty, set it (see Step 2 above)
```

### "Permission denied"

Make the script executable:
```bash
chmod +x backup-database.sh
```

### Backups not running automatically

**For cron:**
```bash
# Check cron logs
tail -f ~/portmanagement-backups/cron.log

# Verify cron is running
ps aux | grep cron
```

**For launchd:**
```bash
# Check status
launchctl list | grep portmanagement

# Check logs
tail -f ~/portmanagement-backups/launchd.log
tail -f ~/portmanagement-backups/launchd-error.log
```

---

## Cloud Backup (Recommended)

After local backups are working, consider also backing up to cloud storage:

### Option 1: Sync to iCloud/Google Drive

```bash
# Create a symlink in your cloud folder
ln -s ~/portmanagement-backups ~/Library/Mobile\ Documents/com~apple~CloudDocs/portmanagement-backups
```

### Option 2: Upload to S3/Backblaze

Add to the backup script:
```bash
# After backup completes, upload to S3
aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/
```

---

## Security Notes

⚠️ **Important:**
- Your `DATABASE_URL` contains sensitive credentials
- Don't commit it to GitHub (it's in `.gitignore`)
- Don't share backup files (they contain all your data)
- Store backups securely

---

## Next Steps

1. ✅ Set up daily backups (follow steps above)
2. ✅ Test a restore (verify backups work)
3. ✅ Set up cloud backup (optional but recommended)
4. ✅ Review backups monthly (make sure they're running)

---

## Questions?

- Check `backup-database.sh` for script details
- Check `backup.log` for backup history
- Check `ARCHITECTURE_GUIDE.md` for architecture overview

