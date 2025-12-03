#!/bin/bash

# Migrate Railway Database
# This script runs database migrations to create all tables in your Railway database

echo "🚀 Migrating Railway Database..."
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

echo "📋 Database: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo ""
echo "🔄 Running migrations..."
echo ""

# Run the migration
npm run db:push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "All database tables have been created."
    echo "You can now create households and use the application."
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

