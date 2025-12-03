#!/bin/bash

# Automated Data Migration Script
# Migrates all data from local database to Railway

set -e

echo "🚀 Automated Data Migration Tool"
echo "================================="
echo ""
echo "This will migrate your data from local to Railway database."
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "📋 Found local .env file"
    # Try to load LOCAL_DATABASE_URL from .env
    if grep -q "DATABASE_URL" .env; then
        export LOCAL_DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        echo "✓ Loaded LOCAL_DATABASE_URL from .env"
    fi
fi

# Check if LOCAL_DATABASE_URL is set
if [ -z "$LOCAL_DATABASE_URL" ]; then
    echo ""
    echo "⚠️  Local database URL not found"
    echo ""
    echo "Please provide your LOCAL database URL:"
    echo "  (Usually in your .env file, or your local PostgreSQL connection string)"
    echo ""
    read -p "Enter LOCAL_DATABASE_URL: " LOCAL_DATABASE_URL_INPUT
    export LOCAL_DATABASE_URL="$LOCAL_DATABASE_URL_INPUT"
fi

# Check if Railway DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo ""
    echo "⚠️  Railway database URL not found"
    echo ""
    echo "Please provide your Railway DATABASE_URL:"
    echo "  1. Go to Railway Dashboard → Your Project → PostgreSQL → Variables"
    echo "  2. Copy the DATABASE_URL value"
    echo ""
    read -p "Enter Railway DATABASE_URL: " DATABASE_URL_INPUT
    export DATABASE_URL="$DATABASE_URL_INPUT"
fi

echo ""
echo "📋 Configuration:"
echo "  Local DB: $(echo $LOCAL_DATABASE_URL | sed 's/:[^:]*@/:***@/' | cut -d'@' -f1)@***"
echo "  Railway DB: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/' | cut -d'@' -f1)@***"
echo ""

read -p "Continue with migration? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🔄 Starting migration..."
echo ""

# Ask what to migrate
echo ""
echo "What would you like to migrate?"
echo "  1) Universal Holdings only (quick)"
echo "  2) All data (holdings, households, accounts, positions, portfolios)"
echo ""
read -p "Enter choice (1 or 2) [default: 2]: " MIGRATE_CHOICE
MIGRATE_CHOICE=${MIGRATE_CHOICE:-2}

if [ "$MIGRATE_CHOICE" = "1" ]; then
    echo ""
    echo "🔄 Migrating Universal Holdings only..."
    npx tsx scripts/migrate-holdings.js
else
    echo ""
    echo "🔄 Migrating ALL data..."
    npx tsx scripts/migrate-all-data.js
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Refresh your Railway app"
    echo "  2. Go to Model Portfolios page"
    echo "  3. Your holdings should now be visible!"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

