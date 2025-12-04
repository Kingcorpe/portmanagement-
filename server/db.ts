// Based on blueprint:javascript_database
console.log("[DB] Loading database module...");

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

console.log("[DB] Imports completed");

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("[DB] DATABASE_URL is not set!");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("[DB] DATABASE_URL is set, creating pool...");

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
console.log("[DB] Pool created, initializing drizzle...");

export const db = drizzle({ client: pool, schema });
console.log("[DB] Database module loaded successfully");
