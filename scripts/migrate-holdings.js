#!/usr/bin/env node

/**
 * Migrate Universal Holdings from Local to Railway Database
 * Usage: node scripts/migrate-holdings.js
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use dynamic imports for ESM modules
const { Pool } = await import('@neondatabase/serverless');
const ws = (await import('ws')).default;
const { drizzle } = await import('drizzle-orm/neon-serverless');
const { eq } = await import('drizzle-orm');
// Import schema using relative path (tsx will handle TypeScript)
const schemaModule = await import('../shared/schema.ts');
const { universalHoldings } = schemaModule;

const { neonConfig } = await import('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

// Get database URLs from environment
let LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL;
let RAILWAY_DB_URL = process.env.DATABASE_URL;

// Try to read from .env file if not set
if (!LOCAL_DB_URL) {
  try {
    const fs = await import('fs');
    const envFile = fs.readFileSync('.env', 'utf8');
    const match = envFile.match(/^DATABASE_URL=(.+)$/m);
    if (match) {
      LOCAL_DB_URL = match[1].trim().replace(/^["']|["']$/g, '');
      console.log('✓ Loaded LOCAL_DATABASE_URL from .env file');
    }
  } catch (e) {
    // .env file doesn't exist or can't be read, that's okay
  }
}

if (!LOCAL_DB_URL) {
  console.error('\n❌ ERROR: LOCAL_DATABASE_URL not found');
  console.error('\nPlease either:');
  console.error('  1. Set LOCAL_DATABASE_URL environment variable');
  console.error('  2. Or run: ./migrate-data.sh (which will prompt you)');
  console.error('\nExample:');
  console.error('  export LOCAL_DATABASE_URL="postgresql://user:pass@localhost:5432/db"');
  process.exit(1);
}

if (!RAILWAY_DB_URL) {
  console.error('\n❌ ERROR: DATABASE_URL (Railway) not found');
  console.error('\nPlease either:');
  console.error('  1. Set DATABASE_URL environment variable');
  console.error('  2. Or run: ./migrate-data.sh (which will prompt you)');
  console.error('\nGet it from: Railway Dashboard → PostgreSQL → Variables → DATABASE_URL');
  process.exit(1);
}

console.log('\n🔄 Migrating Universal Holdings from Local to Railway...');
console.log('========================================================\n');

// Connect to local database
const localPool = new Pool({ connectionString: LOCAL_DB_URL });
const localDb = drizzle({ client: localPool });

// Connect to Railway database
const railwayPool = new Pool({ connectionString: RAILWAY_DB_URL });
const railwayDb = drizzle({ client: railwayPool });

try {
  // Fetch all holdings from local database
  console.log('📥 Fetching holdings from local database...');
  const localHoldings = await localDb.select().from(universalHoldings);
  console.log(`✓ Found ${localHoldings.length} holdings\n`);

  if (localHoldings.length === 0) {
    console.log('No holdings to migrate.');
    process.exit(0);
  }

  // Import to Railway database
  console.log('📤 Importing holdings to Railway database...\n');
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const holding of localHoldings) {
    try {
      // Check if holding already exists
      const existing = await railwayDb
        .select()
        .from(universalHoldings)
        .where(eq(universalHoldings.ticker, holding.ticker))
        .limit(1);

      if (existing.length > 0) {
        // Update existing holding
        await railwayDb
          .update(universalHoldings)
          .set({
            name: holding.name,
            category: holding.category,
            riskLevel: holding.riskLevel,
            dividendRate: holding.dividendRate,
            dividendYield: holding.dividendYield,
            dividendPayout: holding.dividendPayout,
            exDividendDate: holding.exDividendDate,
            price: holding.price,
            fundFactsUrl: holding.fundFactsUrl,
            dividendSourceUrl: holding.dividendSourceUrl,
            description: holding.description,
            updatedAt: new Date(),
          })
          .where(eq(universalHoldings.ticker, holding.ticker));
        skipped++;
        console.log(`⊘ ${holding.ticker}: Updated existing`);
      } else {
        // Insert new holding
        await railwayDb.insert(universalHoldings).values({
          ticker: holding.ticker,
          name: holding.name,
          category: holding.category,
          riskLevel: holding.riskLevel,
          dividendRate: holding.dividendRate,
          dividendYield: holding.dividendYield,
          dividendPayout: holding.dividendPayout,
          exDividendDate: holding.exDividendDate,
          price: holding.price,
          fundFactsUrl: holding.fundFactsUrl,
          dividendSourceUrl: holding.dividendSourceUrl,
          description: holding.description,
        });
        imported++;
        console.log(`✓ ${holding.ticker}: ${holding.name}`);
      }
    } catch (error) {
      errors++;
      console.error(`✗ ${holding.ticker}: ${error.message}`);
    }
  }

  console.log('\n✅ Migration complete!');
  console.log(`   Imported: ${imported}`);
  console.log(`   Updated: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${localHoldings.length}`);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  await localPool.end();
  await railwayPool.end();
}

