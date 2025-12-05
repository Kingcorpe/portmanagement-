#!/usr/bin/env node

/**
 * Migrate ALL data from Neon to Railway PostgreSQL
 * This is a complete data transfer script
 */

import pg from 'pg';
const { Pool } = pg;

// Database URLs
const NEON_URL = "postgresql://neondb_owner:npg_HT3Y4abjupMG@ep-twilight-field-a4j8bakn-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const RAILWAY_URL = "postgresql://postgres:CSpLEnEAiKZMWtYcMYkLHhtNtukmVmFq@shortline.proxy.rlwy.net:36448/railway";

const neonPool = new Pool({ connectionString: NEON_URL });
const railwayPool = new Pool({ connectionString: RAILWAY_URL });

// Tables to migrate in order (respects foreign key constraints)
const TABLES_IN_ORDER = [
  'users',
  'sessions',
  'universal_holdings',
  'households',
  'household_shares',
  'individuals',
  'corporations',
  'individual_accounts',
  'corporate_accounts',
  'joint_accounts',
  'joint_account_ownership',
  'positions',
  'account_target_allocations',
  'account_tasks',
  'audit_logs',
  'milestones',
  'milestone_completions',
  'planned_portfolios',
  'planned_portfolio_allocations',
  'freelance_portfolios',
  'freelance_portfolio_allocations',
  'trading_journal_entries',
  'trading_journal_images',
  'reference_links',
  'prospects',
  'dca_plans',
  'dcp_plans',
  'library_items',
  'kpi_targets',
  'roadmap_initiatives',
  'roadmap_tasks',
  'investment_revenue_records',
  'insurance_revenue_records',
  'alerts',
  'user_settings',
];

async function getTableColumns(pool, tableName) {
  const result = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows.map(r => r.column_name);
}

async function tableExists(pool, tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = $1
    )
  `, [tableName]);
  return result.rows[0].exists;
}

async function migrateTable(tableName) {
  try {
    // Check if table exists in both databases
    const existsInNeon = await tableExists(neonPool, tableName);
    const existsInRailway = await tableExists(railwayPool, tableName);
    
    if (!existsInNeon) {
      console.log(`  ⊘ ${tableName}: Not in Neon, skipping`);
      return { imported: 0, skipped: 0, errors: 0 };
    }
    
    if (!existsInRailway) {
      console.log(`  ⚠ ${tableName}: Not in Railway, skipping`);
      return { imported: 0, skipped: 0, errors: 0 };
    }
    
    // Get columns that exist in both
    const neonColumns = await getTableColumns(neonPool, tableName);
    const railwayColumns = await getTableColumns(railwayPool, tableName);
    const commonColumns = neonColumns.filter(c => railwayColumns.includes(c));
    
    if (commonColumns.length === 0) {
      console.log(`  ⚠ ${tableName}: No common columns, skipping`);
      return { imported: 0, skipped: 0, errors: 0 };
    }
    
    // Fetch all data from Neon
    const columnList = commonColumns.map(c => `"${c}"`).join(', ');
    const neonData = await neonPool.query(`SELECT ${columnList} FROM "${tableName}"`);
    
    if (neonData.rows.length === 0) {
      console.log(`  ⊘ ${tableName}: Empty, skipping`);
      return { imported: 0, skipped: 0, errors: 0 };
    }
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    // Determine primary key column (usually 'id')
    const pkColumn = commonColumns.includes('id') ? 'id' : commonColumns[0];
    
    for (const row of neonData.rows) {
      try {
        // Check if record already exists
        const existingCheck = await railwayPool.query(
          `SELECT 1 FROM "${tableName}" WHERE "${pkColumn}" = $1 LIMIT 1`,
          [row[pkColumn]]
        );
        
        if (existingCheck.rows.length > 0) {
          skipped++;
          continue;
        }
        
        // Build insert query
        const values = commonColumns.map(c => row[c]);
        const placeholders = commonColumns.map((_, i) => `$${i + 1}`).join(', ');
        
        await railwayPool.query(
          `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`,
          values
        );
        imported++;
      } catch (err) {
        errors++;
        if (errors <= 3) {
          console.log(`    ⚠ Error: ${err.message.substring(0, 80)}`);
        }
      }
    }
    
    const status = errors > 0 ? '⚠' : '✓';
    console.log(`  ${status} ${tableName}: ${imported} imported, ${skipped} skipped${errors > 0 ? `, ${errors} errors` : ''}`);
    return { imported, skipped, errors };
    
  } catch (err) {
    console.log(`  ✗ ${tableName}: ${err.message}`);
    return { imported: 0, skipped: 0, errors: 1 };
  }
}

async function main() {
  console.log('\n🚀 Migrating Data from Neon to Railway PostgreSQL');
  console.log('='.repeat(50) + '\n');
  
  const totals = { imported: 0, skipped: 0, errors: 0 };
  
  for (const table of TABLES_IN_ORDER) {
    const result = await migrateTable(table);
    totals.imported += result.imported;
    totals.skipped += result.skipped;
    totals.errors += result.errors;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Migration Complete!');
  console.log('='.repeat(50));
  console.log(`Total: ${totals.imported} records imported, ${totals.skipped} skipped, ${totals.errors} errors\n`);
  
  // Verify key tables
  console.log('📊 Verification:');
  const verifyTables = ['households', 'individuals', 'positions', 'account_tasks'];
  for (const table of verifyTables) {
    try {
      const neonCount = await neonPool.query(`SELECT COUNT(*) FROM "${table}"`);
      const railwayCount = await railwayPool.query(`SELECT COUNT(*) FROM "${table}"`);
      const match = neonCount.rows[0].count === railwayCount.rows[0].count ? '✓' : '⚠';
      console.log(`  ${match} ${table}: Neon=${neonCount.rows[0].count}, Railway=${railwayCount.rows[0].count}`);
    } catch (err) {
      console.log(`  ⚠ ${table}: Could not verify`);
    }
  }
  
  await neonPool.end();
  await railwayPool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

