# Backup Schedule - How Often Are Backups Created?

## ✅ Current Backup Schedule

**Frequency:** **Once per day (Daily)**

**Time:** **2:00 AM** (your local time)

**Method:** Automated via macOS launchd (scheduled task)

---

## 📅 Schedule Details

- **Runs:** Every day at 2:00 AM
- **Automation:** Configured and loaded
- **Retention:** Backups kept for 30 days (old ones auto-deleted)
- **Location:** `~/portmanagement-backups/`

---

## 🔍 How to Verify It's Running

**Check if automation is active:**
```bash
launchctl list | grep portmanagement
```

**See when backups were created:**
```bash
ls -lth ~/portmanagement-backups/backup-*.sql.gz
```

**Check backup logs:**
```bash
tail -20 ~/portmanagement-backups/backup.log
```

**Check automation logs:**
```bash
tail -20 ~/portmanagement-backups/launchd.log
tail -20 ~/portmanagement-backups/launchd-error.log
```

---

## 📊 Current Status

**Automation Status:** ✅ **Configured and Loaded**

**Last Backup:**
- Date: December 3, 2025 at 9:43 PM (21:43)
- File: `backup-20251203_214306.sql.gz`
- This was likely a manual test run

**Next Scheduled Backup:**
- Tomorrow at 2:00 AM (will run automatically)

---

## ⚙️ Change the Schedule

If you want to change when backups run:

**Option 1: Edit the plist file**
```bash
# Edit the schedule
nano ~/Library/LaunchAgents/com.portmanagement.backup.plist

# Change Hour (0-23) and Minute (0-59)
# Then reload:
launchctl unload ~/Library/LaunchAgents/com.portmanagement.backup.plist
launchctl load ~/Library/LaunchAgents/com.portmanagement.backup.plist
```

**Option 2: Re-run setup script**
```bash
./setup-daily-backup.sh
```

---

## 📧 Email Notifications

Backups are also emailed to: `ryan@crsolutions.ca`

- Small backups: Attached to email
- Large backups: Download link in email

---

## 🔄 Manual Backup

You can also create a backup manually anytime:

```bash
cd /Users/kingair/portmanagement-
./backup-database.sh
```

Or:
```bash
npm run backup
```

---

## 📋 Summary

**Your backups run:**
- ✅ **Daily** at **2:00 AM**
- ✅ **Automatically** (no action needed)
- ✅ **Retained** for 30 days
- ✅ **Emailed** to you
- ✅ **Saved** locally in `~/portmanagement-backups/`

**Total backups you'll have:** Up to 30 backup files (one per day for last 30 days)

---

## 🎯 Bottom Line

**Frequency:** Once per day  
**Time:** 2:00 AM  
**Status:** ✅ Automated and configured  
**Action Required:** None - it runs automatically! 🚀





