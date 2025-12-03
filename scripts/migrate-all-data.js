#!/usr/bin/env node

/**
 * Migrate ALL data from Local to Railway Database
 * This migrates: Holdings, Households, Accounts, Positions, Portfolios, etc.
 */

import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '../shared/schema.ts';

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

if (!LOCAL_DB_URL || !RAILWAY_DB_URL) {
  console.error('\n❌ ERROR: Database URLs not found');
  console.error('\nPlease set:');
  console.error('  LOCAL_DATABASE_URL - Your local database URL');
  console.error('  DATABASE_URL - Your Railway database URL');
  process.exit(1);
}

console.log('\n🔄 Migrating ALL data from Local to Railway...');
console.log('================================================\n');

// Connect to databases
const localPool = new Pool({ connectionString: LOCAL_DB_URL });
const localDb = drizzle({ client: localPool, schema });

const railwayPool = new Pool({ connectionString: RAILWAY_DB_URL });
const railwayDb = drizzle({ client: railwayPool, schema });

const stats = {
  holdings: { imported: 0, updated: 0, errors: 0 },
  households: { imported: 0, updated: 0, errors: 0 },
  individuals: { imported: 0, updated: 0, errors: 0 },
  corporations: { imported: 0, updated: 0, errors: 0 },
  accounts: { imported: 0, updated: 0, errors: 0 },
  positions: { imported: 0, updated: 0, errors: 0 },
  portfolios: { imported: 0, updated: 0, errors: 0 },
};

try {
  // 1. Migrate Universal Holdings
  console.log('📦 Migrating Universal Holdings...');
  const localHoldings = await localDb.select().from(schema.universalHoldings);
  for (const holding of localHoldings) {
    try {
      const existing = await railwayDb
        .select()
        .from(schema.universalHoldings)
        .where(eq(schema.universalHoldings.ticker, holding.ticker))
        .limit(1);
      
      if (existing.length > 0) {
        await railwayDb
          .update(schema.universalHoldings)
          .set({ ...holding, updatedAt: new Date() })
          .where(eq(schema.universalHoldings.ticker, holding.ticker));
        stats.holdings.updated++;
      } else {
        await railwayDb.insert(schema.universalHoldings).values(holding);
        stats.holdings.imported++;
        console.log(`  ✓ ${holding.ticker}`);
      }
    } catch (error) {
      stats.holdings.errors++;
      console.error(`  ✗ ${holding.ticker}: ${error.message}`);
    }
  }
  console.log(`  ✅ Holdings: ${stats.holdings.imported} imported, ${stats.holdings.updated} updated\n`);

  // Get the current user ID in Railway (for userId mapping) - do this once at the start
  const railwayUsers = await railwayDb.select().from(schema.users).limit(1);
  const railwayUserId = railwayUsers.length > 0 ? railwayUsers[0].id : null;
  console.log(`ℹ Using Railway user ID: ${railwayUserId || 'none'}\n`);

  // 2. Migrate Households
  console.log('🏠 Migrating Households...');
  const localHouseholds = await localDb
    .select()
    .from(schema.households)
    .where(isNull(schema.households.deletedAt)); // Only active households
  
  if (localHouseholds.length === 0) {
    console.log('  ℹ No households to migrate\n');
  } else {
    for (const household of localHouseholds) {
      try {
        // Check if household exists by name (since IDs might differ, and userId might differ)
        const existingByName = await railwayDb
          .select()
          .from(schema.households)
          .where(
            and(
              eq(schema.households.name, household.name),
              isNull(schema.households.deletedAt)
            )
          )
          .limit(1);
        
        if (existingByName.length > 0) {
          // Household with same name exists, update it
          await railwayDb
            .update(schema.households)
            .set({ 
              ...household, 
              userId: railwayUserId || household.userId, // Use Railway user ID
              updatedAt: new Date() 
            })
            .where(eq(schema.households.id, existingByName[0].id));
          stats.households.updated++;
          console.log(`  ⊘ ${household.name}: Already exists, updated`);
        } else {
          // Create new household, but update userId to match Railway user
          const householdData = {
            ...household,
            userId: railwayUserId || household.userId, // Use Railway user ID if available
          };
          await railwayDb.insert(schema.households).values(householdData);
          stats.households.imported++;
          console.log(`  ✓ ${household.name}`);
        }
      } catch (error) {
        stats.households.errors++;
        console.error(`  ✗ ${household.name}: ${error.message}`);
        // Log more details for debugging
        if (error.code) {
          console.error(`    Error code: ${error.code}, Detail: ${error.detail || 'N/A'}`);
        }
      }
    }
  }
  console.log(`  ✅ Households: ${stats.households.imported} imported, ${stats.households.updated} updated, ${stats.households.errors} errors\n`);

  // 3. Migrate Individuals
  console.log('👤 Migrating Individuals...');
  const localIndividuals = await localDb.select().from(schema.individuals);
  
  if (localIndividuals.length === 0) {
    console.log('  ℹ No individuals to migrate\n');
  } else {
    for (const individual of localIndividuals) {
      try {
        // Check if individual exists by name and householdId
        const existing = await railwayDb
          .select()
          .from(schema.individuals)
          .where(
            and(
              eq(schema.individuals.name, individual.name),
              eq(schema.individuals.householdId, individual.householdId)
            )
          )
          .limit(1);
        
        if (existing.length > 0) {
          await railwayDb
            .update(schema.individuals)
            .set({ ...individual, updatedAt: new Date() })
            .where(eq(schema.individuals.id, existing[0].id));
          stats.individuals.updated++;
        } else {
          await railwayDb.insert(schema.individuals).values(individual);
          stats.individuals.imported++;
          console.log(`  ✓ ${individual.name}`);
        }
      } catch (error) {
        stats.individuals.errors++;
        console.error(`  ✗ ${individual.name}: ${error.message}`);
        if (error.code) {
          console.error(`    Error code: ${error.code}, Detail: ${error.detail || 'N/A'}`);
        }
      }
    }
  }
  console.log(`  ✅ Individuals: ${stats.individuals.imported} imported, ${stats.individuals.updated} updated, ${stats.individuals.errors} errors\n`);

  // 4. Migrate Corporations
  console.log('🏢 Migrating Corporations...');
  const localCorporations = await localDb.select().from(schema.corporations);
  
  if (localCorporations.length === 0) {
    console.log('  ℹ No corporations to migrate\n');
  } else {
    for (const corp of localCorporations) {
      try {
        // Check if corporation exists by name and householdId
        const existing = await railwayDb
          .select()
          .from(schema.corporations)
          .where(
            and(
              eq(schema.corporations.name, corp.name),
              eq(schema.corporations.householdId, corp.householdId)
            )
          )
          .limit(1);
        
        if (existing.length > 0) {
          await railwayDb
            .update(schema.corporations)
            .set({ ...corp, updatedAt: new Date() })
            .where(eq(schema.corporations.id, existing[0].id));
          stats.corporations.updated++;
        } else {
          await railwayDb.insert(schema.corporations).values(corp);
          stats.corporations.imported++;
          console.log(`  ✓ ${corp.name}`);
        }
      } catch (error) {
        stats.corporations.errors++;
        console.error(`  ✗ ${corp.name}: ${error.message}`);
        if (error.code) {
          console.error(`    Error code: ${error.code}, Detail: ${error.detail || 'N/A'}`);
        }
      }
    }
  }
  console.log(`  ✅ Corporations: ${stats.corporations.imported} imported, ${stats.corporations.updated} updated, ${stats.corporations.errors} errors\n`);

  // 5. Migrate Accounts (Individual, Corporate, Joint)
  console.log('💼 Migrating Accounts...');
  
  // Individual Accounts
  const localIndividualAccounts = await localDb.select().from(schema.individualAccounts);
  for (const account of localIndividualAccounts) {
    try {
      const existing = await railwayDb
        .select()
        .from(schema.individualAccounts)
        .where(eq(schema.individualAccounts.id, account.id))
        .limit(1);
      
      if (existing.length === 0) {
        await railwayDb.insert(schema.individualAccounts).values(account);
        stats.accounts.imported++;
      }
    } catch (error) {
      stats.accounts.errors++;
    }
  }
  
  // Corporate Accounts
  const localCorporateAccounts = await localDb.select().from(schema.corporateAccounts);
  for (const account of localCorporateAccounts) {
    try {
      const existing = await railwayDb
        .select()
        .from(schema.corporateAccounts)
        .where(eq(schema.corporateAccounts.id, account.id))
        .limit(1);
      
      if (existing.length === 0) {
        await railwayDb.insert(schema.corporateAccounts).values(account);
        stats.accounts.imported++;
      }
    } catch (error) {
      stats.accounts.errors++;
    }
  }
  
  // Joint Accounts
  const localJointAccounts = await localDb.select().from(schema.jointAccounts);
  for (const account of localJointAccounts) {
    try {
      const existing = await railwayDb
        .select()
        .from(schema.jointAccounts)
        .where(eq(schema.jointAccounts.id, account.id))
        .limit(1);
      
      if (existing.length === 0) {
        await railwayDb.insert(schema.jointAccounts).values(account);
        stats.accounts.imported++;
      }
    } catch (error) {
      stats.accounts.errors++;
    }
  }
  console.log(`  ✅ Accounts: ${stats.accounts.imported} imported\n`);

  // 6. Migrate Positions
  console.log('📊 Migrating Positions...');
  const localPositions = await localDb.select().from(schema.positions);
  for (const position of localPositions) {
    try {
      const existing = await railwayDb
        .select()
        .from(schema.positions)
        .where(eq(schema.positions.id, position.id))
        .limit(1);
      
      if (existing.length === 0) {
        await railwayDb.insert(schema.positions).values(position);
        stats.positions.imported++;
      }
    } catch (error) {
      stats.positions.errors++;
    }
  }
  console.log(`  ✅ Positions: ${stats.positions.imported} imported\n`);

  // 7. Migrate Planned Portfolios
  console.log('📋 Migrating Planned Portfolios...');
  const localPortfolios = await localDb.select().from(schema.plannedPortfolios);
  
  for (const portfolio of localPortfolios) {
    try {
      // Check if portfolio exists by name (since IDs might differ)
      const existingByName = await railwayDb
        .select()
        .from(schema.plannedPortfolios)
        .where(eq(schema.plannedPortfolios.name, portfolio.name))
        .limit(1);
      
      let portfolioId = portfolio.id;
      
      if (existingByName.length > 0) {
        // Portfolio with same name exists, use that ID
        portfolioId = existingByName[0].id;
        stats.portfolios.updated++;
        console.log(`  ⊘ ${portfolio.name}: Already exists, updating allocations`);
      } else {
        // Create new portfolio, but update userId to match Railway user
        const portfolioData = {
          ...portfolio,
          userId: railwayUserId || portfolio.userId, // Use Railway user ID if available
        };
        await railwayDb.insert(schema.plannedPortfolios).values(portfolioData);
        stats.portfolios.imported++;
        console.log(`  ✓ ${portfolio.name}`);
      }
      
      // Migrate portfolio allocations
      const allocations = await localDb
        .select()
        .from(schema.plannedPortfolioAllocations)
        .where(eq(schema.plannedPortfolioAllocations.plannedPortfolioId, portfolio.id));
      
      let allocationsImported = 0;
      for (const allocation of allocations) {
        try {
          // Check if allocation already exists
          const existingAlloc = await railwayDb
            .select()
            .from(schema.plannedPortfolioAllocations)
            .where(
              and(
                eq(schema.plannedPortfolioAllocations.plannedPortfolioId, portfolioId),
                eq(schema.plannedPortfolioAllocations.universalHoldingId, allocation.universalHoldingId)
              )
            )
            .limit(1);
          
          if (existingAlloc.length === 0) {
            await railwayDb.insert(schema.plannedPortfolioAllocations).values({
              ...allocation,
              plannedPortfolioId: portfolioId, // Use the correct portfolio ID
            });
            allocationsImported++;
          }
        } catch (e) {
          // Skip if error (might be duplicate or foreign key issue)
          console.error(`    ⚠ Allocation error: ${e.message}`);
        }
      }
      if (allocationsImported > 0) {
        console.log(`    → ${allocationsImported} allocations imported`);
      }
    } catch (error) {
      stats.portfolios.errors++;
      console.error(`  ✗ ${portfolio.name}: ${error.message}`);
    }
  }
  console.log(`  ✅ Portfolios: ${stats.portfolios.imported} imported, ${stats.portfolios.updated} updated\n`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Migration Complete!');
  console.log('='.repeat(50));
  console.log(`Holdings:    ${stats.holdings.imported} imported, ${stats.holdings.updated} updated, ${stats.holdings.errors} errors`);
  console.log(`Households:  ${stats.households.imported} imported, ${stats.households.updated} updated, ${stats.households.errors} errors`);
  console.log(`Individuals: ${stats.individuals.imported} imported, ${stats.individuals.updated} updated, ${stats.individuals.errors} errors`);
  console.log(`Corporations: ${stats.corporations.imported} imported, ${stats.corporations.updated} updated, ${stats.corporations.errors} errors`);
  console.log(`Accounts:    ${stats.accounts.imported} imported, ${stats.accounts.errors} errors`);
  console.log(`Positions:   ${stats.positions.imported} imported, ${stats.positions.errors} errors`);
  console.log(`Portfolios:  ${stats.portfolios.imported} imported, ${stats.portfolios.errors} errors`);
  console.log('\nRefresh your Railway app to see the migrated data!');

} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
} finally {
  await localPool.end();
  await railwayPool.end();
}

