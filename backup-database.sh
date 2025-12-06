#!/bin/bash

# Daily Database Backup Script
# This script backs up your Railway PostgreSQL database
# Run daily via cron or manually

set -e  # Exit on error

# Try to load DATABASE_URL from .env file if it exists (for convenience)
# But environment variable takes precedence
if [ -f .env ] && [ -z "$DATABASE_URL" ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

# Configuration
DATABASE_URL="${DATABASE_URL}"
BACKUP_DIR="${HOME}/portmanagement-backups"
RETENTION_DAYS=30  # Keep backups for 30 days
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    log "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    log "Please set it in your environment or .env file"
    log "Example: export DATABASE_URL='postgresql://user:pass@host/db'"
    exit 1
fi

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    log "${RED}ERROR: pg_dump command not found${NC}"
    log "Install PostgreSQL client tools:"
    log "  macOS: brew install postgresql"
    log "  Linux: sudo apt-get install postgresql-client"
    exit 1
fi

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.sql.gz"

log "${GREEN}Starting database backup...${NC}"
log "Database: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"  # Hide password in logs
log "Backup file: $BACKUP_FILE"

# Perform backup
if pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "${GREEN}✓ Backup completed successfully${NC}"
    log "  Size: $BACKUP_SIZE"
    log "  File: $BACKUP_FILE"
else
    log "${RED}✗ Backup failed!${NC}"
    rm -f "$BACKUP_FILE"  # Remove partial backup
    exit 1
fi

# Clean up old backups (keep only last N days)
log "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l | tr -d ' ')
if [ "$DELETED" -gt 0 ]; then
    log "${YELLOW}Deleted $DELETED old backup(s)${NC}"
else
    log "No old backups to delete"
fi

# List current backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f | wc -l | tr -d ' ')
log "${GREEN}Total backups: $BACKUP_COUNT${NC}"

# Show recent backups
log "Recent backups:"
find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f -printf "%T@ %p\n" | sort -rn | head -5 | while read timestamp file; do
    size=$(du -h "$file" | cut -f1)
    date=$(date -r "$timestamp" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file")
    log "  $date - $size - $(basename $file)"
done

# Email the backup
if [ -f "scripts/email-backup.js" ]; then
    log "Sending backup via email..."
    if node scripts/email-backup.js "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"; then
        log "${GREEN}✓ Backup emailed successfully${NC}"
    else
        log "${YELLOW}⚠ Email failed, but backup file is saved locally${NC}"
    fi
else
    log "${YELLOW}⚠ Email script not found, skipping email notification${NC}"
fi

log "${GREEN}Backup process completed${NC}"
echo ""

