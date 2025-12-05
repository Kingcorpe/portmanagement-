#!/bin/bash

# Trading Journal Migration Script
# This script runs database migrations to create the trading journal tables

echo "🚀 Trading Journal Migration Script"
echo "===================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it to your Railway database URL:"
    echo "  export DATABASE_URL='your-railway-database-url-here'"
    echo ""
    echo "Or run:"
    echo "  DATABASE_URL='your-url' ./migrate-trading-journal.sh"
    echo ""
    exit 1
fi

echo "✓ DATABASE_URL is set"
echo ""

# Check if we're pointing to a Railway database (optional warning)
if [[ "$DATABASE_URL" == *"railway"* ]] || [[ "$DATABASE_URL" == *"railway.app"* ]]; then
    echo "⚠️  Warning: This appears to be a Railway database"
    echo "   Make sure this is your PRODUCTION database!"
    echo ""
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Migration cancelled."
        exit 0
    fi
    echo ""
fi

echo "🔄 Running database migrations..."
echo ""

# Run the migration
npm run db:push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "The following tables should now exist:"
    echo "  - trading_journal_entries"
    echo "  - trading_journal_images"
    echo "  - trading_journal_tags"
    echo "  - trading_journal_entry_tags"
    echo ""
    echo "You can now access the Trading Journal at:"
    echo "  https://your-railway-domain/trading-journal"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi







