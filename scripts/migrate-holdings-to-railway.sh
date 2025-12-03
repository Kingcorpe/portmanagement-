#!/bin/bash

# Migrate Universal Holdings from Local to Railway
# This script exports holdings from your local database and imports them to Railway

set -e

echo "🔄 Migrating Universal Holdings to Railway..."
echo ""

# Check if local DATABASE_URL is set
if [ -z "$LOCAL_DATABASE_URL" ]; then
    echo "⚠️  LOCAL_DATABASE_URL not found"
    echo ""
    echo "Please provide your LOCAL database URL:"
    echo "  (This is usually in your local .env file)"
    echo ""
    read -p "Enter LOCAL_DATABASE_URL: " LOCAL_DATABASE_URL_INPUT
    export LOCAL_DATABASE_URL="$LOCAL_DATABASE_URL_INPUT"
fi

# Check if Railway DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL (Railway) not found"
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
echo "  Local DB: $(echo $LOCAL_DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo "  Railway DB: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo ""

read -p "Continue with migration? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🔄 Exporting holdings from local database..."

# Export holdings from local database
LOCAL_HOLDINGS=$(psql "$LOCAL_DATABASE_URL" -t -c "
SELECT json_agg(row_to_json(t))
FROM (
    SELECT 
        ticker,
        name,
        category,
        risk_level as \"riskLevel\",
        dividend_rate as \"dividendRate\",
        dividend_yield as \"dividendYield\",
        dividend_payout as \"dividendPayout\",
        ex_dividend_date as \"exDividendDate\",
        price,
        fund_facts_url as \"fundFactsUrl\",
        dividend_source_url as \"dividendSourceUrl\",
        description
    FROM universal_holdings
    ORDER BY ticker
) t;
" 2>/dev/null | tr -d '[:space:]')

if [ -z "$LOCAL_HOLDINGS" ] || [ "$LOCAL_HOLDINGS" = "null" ]; then
    echo "❌ No holdings found in local database"
    exit 1
fi

HOLDING_COUNT=$(echo "$LOCAL_HOLDINGS" | jq '. | length' 2>/dev/null || echo "0")
echo "✓ Found $HOLDING_COUNT holdings in local database"
echo ""

if [ "$HOLDING_COUNT" -eq 0 ]; then
    echo "No holdings to migrate."
    exit 0
fi

echo "🔄 Importing holdings to Railway database..."

# Create a Node.js script to import the holdings
cat > /tmp/import-holdings.js << 'EOF'
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

const { Pool: PgPool } = await import('pg');

const railwayUrl = process.env.DATABASE_URL;
const holdings = JSON.parse(process.env.HOLDINGS_JSON || '[]');

// Use regular pg for Railway (not serverless)
const pool = new PgPool({ connectionString: railwayUrl });

try {
  console.log(`Importing ${holdings.length} holdings...`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const holding of holdings) {
    try {
      // Try to insert, skip if duplicate
      await pool.query(`
        INSERT INTO universal_holdings (
          ticker, name, category, risk_level, 
          dividend_rate, dividend_yield, dividend_payout,
          ex_dividend_date, price, fund_facts_url,
          dividend_source_url, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (ticker) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          risk_level = EXCLUDED.risk_level,
          dividend_rate = EXCLUDED.dividend_rate,
          dividend_yield = EXCLUDED.dividend_yield,
          dividend_payout = EXCLUDED.dividend_payout,
          ex_dividend_date = EXCLUDED.ex_dividend_date,
          price = EXCLUDED.price,
          fund_facts_url = EXCLUDED.fund_facts_url,
          dividend_source_url = EXCLUDED.dividend_source_url,
          description = EXCLUDED.description,
          updated_at = NOW()
      `, [
        holding.ticker,
        holding.name,
        holding.category,
        holding.riskLevel,
        holding.dividendRate || 0,
        holding.dividendYield || 0,
        holding.dividendPayout || 'none',
        holding.exDividendDate || null,
        holding.price || 0,
        holding.fundFactsUrl || null,
        holding.dividendSourceUrl || null,
        holding.description || null
      ]);
      imported++;
      console.log(`✓ ${holding.ticker}: ${holding.name}`);
    } catch (error) {
      if (error.code === '23505') {
        skipped++;
        console.log(`⊘ ${holding.ticker}: Already exists, skipped`);
      } else {
        errors++;
        console.error(`✗ ${holding.ticker}: ${error.message}`);
      }
    }
  }
  
  console.log('');
  console.log(`✅ Migration complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates): ${skipped}`);
  console.log(`   Errors: ${errors}`);
} finally {
  await pool.end();
}
EOF

# Run the import script
HOLDINGS_JSON="$LOCAL_HOLDINGS" DATABASE_URL="$DATABASE_URL" node /tmp/import-holdings.js

echo ""
echo "✅ Migration complete!"
echo ""
echo "Your holdings should now be available in Railway."
echo "Refresh the Model Portfolios page to see them."

