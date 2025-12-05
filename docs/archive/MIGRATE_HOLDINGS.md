# Migrate Holdings from Local to Railway

This guide will help you migrate your Universal Holdings from your local database to Railway.

## Quick Migration

**Run this command:**

```bash
cd /Users/kingair/portmanagement-

# Set your local database URL (from your local .env file)
export LOCAL_DATABASE_URL="your-local-database-url"

# Set your Railway database URL (from Railway dashboard)
export DATABASE_URL="your-railway-database-url"

# Run the migration
node scripts/migrate-holdings.js
```

## Step-by-Step

### Step 1: Get Your Local Database URL

Your local database URL is in your `.env` file:
```bash
# Check your local .env file
cat .env | grep DATABASE_URL
```

Or if you're using a local PostgreSQL:
```bash
# Usually something like:
export LOCAL_DATABASE_URL="postgresql://user:password@localhost:5432/portmanagement"
```

### Step 2: Get Your Railway Database URL

1. Go to [Railway Dashboard](https://railway.app)
2. Click on your project
3. Click on your PostgreSQL service
4. Go to **Variables** tab
5. Copy the `DATABASE_URL` value

### Step 3: Run the Migration

```bash
# Set both URLs
export LOCAL_DATABASE_URL="your-local-url"
export DATABASE_URL="your-railway-url"

# Run migration
node scripts/migrate-holdings.js
```

The script will:
- ✅ Fetch all holdings from your local database
- ✅ Import them to Railway
- ✅ Skip duplicates (if a ticker already exists)
- ✅ Show progress for each holding

## What Gets Migrated

- ✅ Ticker symbol
- ✅ Name
- ✅ Category
- ✅ Risk level
- ✅ Dividend information (rate, yield, payout frequency)
- ✅ Price
- ✅ Fund facts URL
- ✅ Description

## After Migration

1. Refresh your Railway app
2. Go to Model Portfolios page
3. Your holdings should now be visible!

## Troubleshooting

### "LOCAL_DATABASE_URL not set"
- Make sure you've exported the environment variable
- Check that your local database is running

### "DATABASE_URL not set"
- Get it from Railway dashboard → PostgreSQL → Variables
- Make sure you've exported it

### "Connection refused"
- Check that your local database is running
- Verify the database URL is correct

### Holdings not showing up
- Refresh the page
- Check Railway logs for errors
- Verify the migration completed successfully

