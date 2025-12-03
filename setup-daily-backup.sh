#!/bin/bash

# Setup Daily Backup Automation
# This script sets up automated daily backups on macOS using launchd

set -e

PROJECT_DIR="/Users/kingair/portmanagement-"
PLIST_NAME="com.portmanagement.backup"
PLIST_FILE="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
BACKUP_SCRIPT="$PROJECT_DIR/backup-database.sh"

echo "🚀 Setting up daily backup automation..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not found in environment"
    echo ""
    echo "Please provide your Railway DATABASE_URL:"
    echo "  1. Go to Railway Dashboard → Your Project → PostgreSQL → Variables"
    echo "  2. Copy the DATABASE_URL value"
    echo ""
    read -p "Enter DATABASE_URL: " DATABASE_URL_INPUT
    export DATABASE_URL="$DATABASE_URL_INPUT"
fi

# Check if RESEND_API_KEY is set
if [ -z "$RESEND_API_KEY" ]; then
    echo "⚠️  RESEND_API_KEY not found in environment"
    echo ""
    echo "Please provide your Resend API Key:"
    echo "  1. Go to https://resend.com/api-keys"
    echo "  2. Create or copy an API key"
    echo ""
    read -p "Enter RESEND_API_KEY: " RESEND_API_KEY_INPUT
    export RESEND_API_KEY="$RESEND_API_KEY_INPUT"
fi

# Check if RESEND_FROM_EMAIL is set
if [ -z "$RESEND_FROM_EMAIL" ]; then
    echo ""
    echo "Please provide your Resend 'From' email address:"
    echo "  (This should be a verified domain in Resend)"
    echo ""
    read -p "Enter RESEND_FROM_EMAIL (or press Enter for default): " RESEND_FROM_EMAIL_INPUT
    export RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL_INPUT:-onboarding@resend.dev}"
fi

# Backup email (default to ryan@crsolutions.ca)
BACKUP_EMAIL="${BACKUP_EMAIL:-ryan@crsolutions.ca}"

echo ""
echo "📋 Configuration:"
echo "  DATABASE_URL: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo "  RESEND_API_KEY: ${RESEND_API_KEY:0:10}..."
echo "  RESEND_FROM_EMAIL: $RESEND_FROM_EMAIL"
echo "  BACKUP_EMAIL: $BACKUP_EMAIL"
echo ""

# Ask for backup time
echo "What time should backups run daily? (24-hour format)"
read -p "Enter hour (0-23) [default: 2]: " BACKUP_HOUR
BACKUP_HOUR=${BACKUP_HOUR:-2}

read -p "Enter minute (0-59) [default: 0]: " BACKUP_MINUTE
BACKUP_MINUTE=${BACKUP_MINUTE:-0}

echo ""
echo "Creating launchd plist file..."

# Create the plist file
cat > "$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${BACKUP_SCRIPT}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>DATABASE_URL</key>
        <string>${DATABASE_URL}</string>
        <key>RESEND_API_KEY</key>
        <string>${RESEND_API_KEY}</string>
        <key>RESEND_FROM_EMAIL</key>
        <string>${RESEND_FROM_EMAIL}</string>
        <key>BACKUP_EMAIL</key>
        <string>${BACKUP_EMAIL}</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>${BACKUP_HOUR}</integer>
        <key>Minute</key>
        <integer>${BACKUP_MINUTE}</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${HOME}/portmanagement-backups/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/portmanagement-backups/launchd-error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

echo "✓ Plist file created: $PLIST_FILE"
echo ""

# Unload existing job if it exists
if launchctl list | grep -q "$PLIST_NAME"; then
    echo "Unloading existing job..."
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
fi

# Load the new job
echo "Loading launchd job..."
launchctl load "$PLIST_FILE"

# Start it immediately to test
echo ""
read -p "Run backup now to test? (y/n) [default: y]: " RUN_NOW
RUN_NOW=${RUN_NOW:-y}

if [ "$RUN_NOW" = "y" ] || [ "$RUN_NOW" = "Y" ]; then
    echo ""
    echo "🧪 Running test backup..."
    cd "$PROJECT_DIR"
    "$BACKUP_SCRIPT"
    echo ""
    echo "✓ Test backup completed!"
    echo ""
    echo "Check your email at $BACKUP_EMAIL for the backup file."
fi

echo ""
echo "✅ Daily backup automation set up successfully!"
echo ""
echo "📋 Summary:"
echo "  • Backups will run daily at ${BACKUP_HOUR}:$(printf "%02d" ${BACKUP_MINUTE})"
echo "  • Backups are saved to: ~/portmanagement-backups/"
echo "  • Backups are emailed to: $BACKUP_EMAIL"
echo "  • Logs are saved to: ~/portmanagement-backups/launchd.log"
echo ""
echo "🔧 Management commands:"
echo "  • Check status: launchctl list | grep $PLIST_NAME"
echo "  • View logs: tail -f ~/portmanagement-backups/launchd.log"
echo "  • Stop: launchctl unload $PLIST_FILE"
echo "  • Start: launchctl load $PLIST_FILE"
echo "  • Manual backup: cd $PROJECT_DIR && ./backup-database.sh"
echo ""

