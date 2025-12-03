# Database Backup & Migration Guide

## Important: Your Data is Separate from Your Code

**GitHub stores:** Your code (application files)  
**Railway/Neon stores:** Your database data (households, accounts, positions, alerts, etc.)

If you stop using Railway, you need to **export your database separately** to avoid losing data.

---

## How to Backup Your Database

### Option 1: Using pg_dump (Recommended)

1. **Get your Railway database connection string:**
   - Go to Railway dashboard → Your PostgreSQL service → Variables
   - Copy the `DATABASE_URL` value

2. **Export the database:**
   ```bash
   # Install PostgreSQL tools if needed (macOS)
   brew install postgresql
   
   # Extract connection details from DATABASE_URL
   # Format: postgresql://user:password@host:port/database
   
   # Export to SQL file
   pg_dump "your-database-url-here" > backup-$(date +%Y%m%d).sql
   
   # Or export to compressed file
   pg_dump "your-database-url-here" | gzip > backup-$(date +%Y%m%d).sql.gz
   ```

3. **Store the backup safely:**
   - Save to your computer
   - Upload to cloud storage (Google Drive, Dropbox, etc.)
   - Or commit to a private GitHub repository (if you want version control)

### Option 2: Using Neon Dashboard

1. Go to [Neon Console](https://console.neon.tech)
2. Select your database
3. Use the "Export" feature (if available)
4. Download the SQL dump

### Option 3: Automated Backups Script

Create a backup script that runs regularly:

```bash
#!/bin/bash
# backup-database.sh

DATABASE_URL="your-railway-database-url"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Create backup
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/backup-$DATE.sql.gz"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +30 -delete

echo "Backup created: $BACKUP_DIR/backup-$DATE.sql.gz"
```

Run it manually or set up a cron job:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup-database.sh
```

---

## How to Restore Your Database

When you move to a new platform (or restore from backup):

1. **Get your new database connection string**

2. **Restore from backup:**
   ```bash
   # For uncompressed SQL
   psql "new-database-url" < backup-20231203.sql
   
   # For compressed SQL
   gunzip < backup-20231203.sql.gz | psql "new-database-url"
   ```

3. **Update your application's DATABASE_URL** to point to the new database

---

## Best Practices

### Regular Backups
- **Daily backups** for active production data
- **Weekly backups** for less critical data
- **Before major changes** (migrations, updates, etc.)

### Backup Storage
- Store backups in **multiple locations**:
  - Local computer
  - Cloud storage (Google Drive, Dropbox, AWS S3)
  - Private GitHub repository (for version control)

### Test Your Backups
- Periodically test restoring from a backup
- Make sure the restore process works before you need it

---

## Quick Backup Commands

### One-time backup:
```bash
pg_dump "your-database-url" > backup-$(date +%Y%m%d).sql
```

### Compressed backup (smaller file):
```bash
pg_dump "your-database-url" | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Backup specific tables only:
```bash
pg_dump "your-database-url" -t households -t accounts -t positions > partial-backup.sql
```

---

## What Gets Backed Up

✅ **All your data:**
- Households
- Individuals & Corporations
- Accounts (Individual, Corporate, Joint)
- Positions
- Target Allocations
- Tasks
- Alerts
- Trading Journal entries
- Universal Holdings
- Users
- Audit logs
- Everything in your database

❌ **Not included:**
- Environment variables (stored separately in Railway)
- File uploads (if stored in object storage, backup separately)

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
- [ ] Update DNS/domain if needed
- [ ] Keep old database for 30 days (just in case)

---

## Need Help?

If you need to export/import your database and run into issues:
1. Check that PostgreSQL tools are installed (`pg_dump`, `psql`)
2. Verify your DATABASE_URL is correct
3. Check that you have network access to the database
4. For Neon databases, make sure connection pooling is configured correctly

