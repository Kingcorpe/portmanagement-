// Database connection - Railway PostgreSQL
console.log("[DB] Loading database module...");

import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

console.log("[DB] Imports completed");

if (!process.env.DATABASE_URL) {
  console.error("[DB] DATABASE_URL is not set!");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("[DB] DATABASE_URL is set, creating pool...");

// Configure SSL based on environment
const isRailway = process.env.DATABASE_URL?.includes('railway');
const poolConfig: any = { 
  connectionString: process.env.DATABASE_URL,
};

// For Railway Postgres, disable SSL verification
if (isRailway) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
  console.log("[DB] Railway Postgres detected, SSL verification disabled");
}

export const pool = new Pool(poolConfig);
console.log("[DB] Pool created, initializing drizzle...");

export const db = drizzle(pool, { schema });
console.log("[DB] Database module loaded successfully");
