import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User settings table (for per-user configuration)
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  reportEmail: varchar("report_email"),
  webhookSecret: varchar("webhook_secret").notNull().default(sql`replace(gen_random_uuid()::text, '-', '')`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// Household category enum
export const householdCategoryEnum = pgEnum("household_category", [
  "evergreen",
  "anchor",
  "pulse",
  "emerging_pulse",
  "emerging_anchor",
]);

// Households table
export const households = pgTable("households", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }), // Owner of the household
  name: text("name").notNull(),
  category: householdCategoryEnum("category"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const householdsRelations = relations(households, ({ one, many }) => ({
  owner: one(users, {
    fields: [households.userId],
    references: [users.id],
  }),
  individuals: many(individuals),
  corporations: many(corporations),
  jointAccounts: many(jointAccounts),
  shares: many(householdShares),
}));

// Share access level enum
export const shareAccessLevelEnum = pgEnum("share_access_level", [
  "viewer",   // Can view household data only
  "editor",   // Can view and edit household data
]);

// Household shares table (for sharing households with specific users)
export const householdShares = pgTable("household_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: varchar("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  sharedWithUserId: varchar("shared_with_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessLevel: shareAccessLevelEnum("access_level").notNull().default("viewer"),
  sharedAt: timestamp("shared_at").defaultNow(),
}, (table) => [
  // Unique constraint to prevent duplicate shares
  uniqueIndex("idx_household_shares_unique").on(table.householdId, table.sharedWithUserId),
]);

export const householdSharesRelations = relations(householdShares, ({ one }) => ({
  household: one(households, {
    fields: [householdShares.householdId],
    references: [households.id],
  }),
  sharedWithUser: one(users, {
    fields: [householdShares.sharedWithUserId],
    references: [users.id],
  }),
}));

export type HouseholdShare = typeof householdShares.$inferSelect;
export type InsertHouseholdShare = typeof householdShares.$inferInsert;

// Individuals table
export const individuals = pgTable("individuals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: varchar("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  dateOfBirth: timestamp("date_of_birth"), // Used for RIF conversion date calculation (age 71)
  spouseDateOfBirth: timestamp("spouse_date_of_birth"), // Optional: younger spouse's DOB for RIF minimum withdrawal calculations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const individualsRelations = relations(individuals, ({ one, many }) => ({
  household: one(households, {
    fields: [individuals.householdId],
    references: [households.id],
  }),
  accounts: many(individualAccounts),
  jointAccountOwnerships: many(jointAccountOwnership),
}));

// Corporations table
export const corporations = pgTable("corporations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: varchar("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const corporationsRelations = relations(corporations, ({ one, many }) => ({
  household: one(households, {
    fields: [corporations.householdId],
    references: [households.id],
  }),
  accounts: many(corporateAccounts),
}));

// Risk tolerance enum for accounts (kept for backwards compatibility during migration)
export const riskToleranceEnum = pgEnum("risk_tolerance", [
  "conservative",
  "moderate", 
  "aggressive",
  "very_aggressive",
]);

// Account types enum (for individual accounts)
export const individualAccountTypeEnum = pgEnum("individual_account_type", [
  "cash",
  "tfsa",
  "fhsa",
  "rrsp",
  "lira",
  "liff",
  "rif",
]);

// Corporate account types enum
export const corporateAccountTypeEnum = pgEnum("corporate_account_type", [
  "cash",
  "ipp",
]);

// Joint account types enum
export const jointAccountTypeEnum = pgEnum("joint_account_type", [
  "joint_cash",
  "resp",
]);

// Individual accounts table
export const individualAccounts = pgTable("individual_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  individualId: varchar("individual_id").notNull().references(() => individuals.id, { onDelete: 'cascade' }),
  type: individualAccountTypeEnum("type").notNull(),
  nickname: varchar("nickname", { length: 100 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default('0'),
  performance: decimal("performance", { precision: 8, scale: 4 }).default('0'), // percentage
  // Risk tolerance as percentages (should sum to 100)
  riskMediumPct: decimal("risk_medium_pct", { precision: 5, scale: 2 }).notNull().default('0'),
  riskMediumHighPct: decimal("risk_medium_high_pct", { precision: 5, scale: 2 }).notNull().default('0'),
  riskHighPct: decimal("risk_high_pct", { precision: 5, scale: 2 }).notNull().default('0'),
  plannedPortfolioId: varchar("planned_portfolio_id").references(() => plannedPortfolios.id, { onDelete: 'set null' }),
  immediateNotes: text("immediate_notes"),
  upcomingNotes: text("upcoming_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const individualAccountsRelations = relations(individualAccounts, ({ one, many }) => ({
  individual: one(individuals, {
    fields: [individualAccounts.individualId],
    references: [individuals.id],
  }),
  plannedPortfolio: one(plannedPortfolios, {
    fields: [individualAccounts.plannedPortfolioId],
    references: [plannedPortfolios.id],
  }),
  positions: many(positions),
}));

// Corporate accounts table
export const corporateAccounts = pgTable("corporate_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  corporationId: varchar("corporation_id").notNull().references(() => corporations.id, { onDelete: 'cascade' }),
  type: corporateAccountTypeEnum("type").notNull(),
  nickname: varchar("nickname", { length: 100 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default('0'),
  performance: decimal("performance", { precision: 8, scale: 4 }).default('0'), // percentage
  // Risk tolerance as percentages (should sum to 100)
  riskMediumPct: decimal("risk_medium_pct", { precision: 5, scale: 2 }).notNull().default('0'),
  riskMediumHighPct: decimal("risk_medium_high_pct", { precision: 5, scale: 2 }).notNull().default('0'),
  riskHighPct: decimal("risk_high_pct", { precision: 5, scale: 2 }).notNull().default('0'),
  plannedPortfolioId: varchar("planned_portfolio_id").references(() => plannedPortfolios.id, { onDelete: 'set null' }),
  immediateNotes: text("immediate_notes"),
  upcomingNotes: text("upcoming_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const corporateAccountsRelations = relations(corporateAccounts, ({ one, many }) => ({
  corporation: one(corporations, {
    fields: [corporateAccounts.corporationId],
    references: [corporations.id],
  }),
  plannedPortfolio: one(plannedPortfolios, {
    fields: [corporateAccounts.plannedPortfolioId],
    references: [plannedPortfolios.id],
  }),
  positions: many(positions),
}));

// Joint accounts table
export const jointAccounts = pgTable("joint_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: varchar("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  type: jointAccountTypeEnum("type").notNull(),
  nickname: varchar("nickname", { length: 100 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default('0'),
  performance: decimal("performance", { precision: 8, scale: 4 }).default('0'),
  // Risk tolerance as percentages (should sum to 100)
  riskMediumPct: decimal("risk_medium_pct", { precision: 5, scale: 2 }).notNull().default('0'),
  riskMediumHighPct: decimal("risk_medium_high_pct", { precision: 5, scale: 2 }).notNull().default('0'),
  riskHighPct: decimal("risk_high_pct", { precision: 5, scale: 2 }).notNull().default('0'),
  plannedPortfolioId: varchar("planned_portfolio_id").references(() => plannedPortfolios.id, { onDelete: 'set null' }),
  immediateNotes: text("immediate_notes"),
  upcomingNotes: text("upcoming_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jointAccountsRelations = relations(jointAccounts, ({ one, many }) => ({
  household: one(households, {
    fields: [jointAccounts.householdId],
    references: [households.id],
  }),
  plannedPortfolio: one(plannedPortfolios, {
    fields: [jointAccounts.plannedPortfolioId],
    references: [plannedPortfolios.id],
  }),
  positions: many(positions),
  ownerships: many(jointAccountOwnership),
}));

// Joint account ownership (many-to-many join table)
export const jointAccountOwnership = pgTable("joint_account_ownership", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jointAccountId: varchar("joint_account_id").notNull().references(() => jointAccounts.id, { onDelete: 'cascade' }),
  individualId: varchar("individual_id").notNull().references(() => individuals.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jointAccountOwnershipRelations = relations(jointAccountOwnership, ({ one }) => ({
  jointAccount: one(jointAccounts, {
    fields: [jointAccountOwnership.jointAccountId],
    references: [jointAccounts.id],
  }),
  individual: one(individuals, {
    fields: [jointAccountOwnership.individualId],
    references: [individuals.id],
  }),
}));

// Positions/Holdings table (unified for all account types)
export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // One of these will be set depending on account type
  individualAccountId: varchar("individual_account_id").references(() => individualAccounts.id, { onDelete: 'cascade' }),
  corporateAccountId: varchar("corporate_account_id").references(() => corporateAccounts.id, { onDelete: 'cascade' }),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id, { onDelete: 'cascade' }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 15, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 2 }).notNull(),
  priceUpdatedAt: timestamp("price_updated_at"),
  purchaseDate: timestamp("purchase_date"),
  // Stop-limit protection fields (for tracking only)
  protectionPercent: decimal("protection_percent", { precision: 5, scale: 2 }), // e.g., 50.00 for 50%
  stopPrice: decimal("stop_price", { precision: 15, scale: 2 }), // Trigger price
  limitPrice: decimal("limit_price", { precision: 15, scale: 2 }), // Minimum sell price
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const positionsRelations = relations(positions, ({ one }) => ({
  individualAccount: one(individualAccounts, {
    fields: [positions.individualAccountId],
    references: [individualAccounts.id],
  }),
  corporateAccount: one(corporateAccounts, {
    fields: [positions.corporateAccountId],
    references: [corporateAccounts.id],
  }),
  jointAccount: one(jointAccounts, {
    fields: [positions.jointAccountId],
    references: [jointAccounts.id],
  }),
}));

// Risk level enum for Universal Holdings
export const riskLevelEnum = pgEnum("risk_level", ["low", "low_medium", "medium", "medium_high", "high"]);

// Dividend payout frequency enum
export const dividendPayoutEnum = pgEnum("dividend_payout", ["monthly", "quarterly", "semi_annual", "annual", "none"]);

// Holding category enum
export const holdingCategoryEnum = pgEnum("holding_category", ["basket_etf", "single_etf", "double_long_etf", "security", "auto_added", "misc"]);

// Universal Holdings table (ETF library)
export const universalHoldings = pgTable("universal_holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: varchar("ticker", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  category: holdingCategoryEnum("category").notNull().default("basket_etf"),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  dividendRate: decimal("dividend_rate", { precision: 8, scale: 4 }).default('0'), // Annual dividend per share
  dividendYield: decimal("dividend_yield", { precision: 8, scale: 4 }).default('0'), // Dividend yield as percentage
  dividendPayout: dividendPayoutEnum("dividend_payout").notNull().default("none"),
  exDividendDate: timestamp("ex_dividend_date"), // Next ex-dividend date
  dividendUpdatedAt: timestamp("dividend_updated_at"), // When dividend data was last fetched
  price: decimal("price", { precision: 15, scale: 2 }).default('0'), // Current price (auto-updated from Yahoo Finance)
  priceUpdatedAt: timestamp("price_updated_at"), // When price was last fetched
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Planned Portfolios table (reusable templates)
export const plannedPortfolios = pgTable("planned_portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Multi-tenant: owner of this portfolio
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const plannedPortfoliosRelations = relations(plannedPortfolios, ({ many }) => ({
  allocations: many(plannedPortfolioAllocations),
}));

// Planned Portfolio Allocations (target percentages for each holding)
export const plannedPortfolioAllocations = pgTable("planned_portfolio_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plannedPortfolioId: varchar("planned_portfolio_id").notNull().references(() => plannedPortfolios.id, { onDelete: 'cascade' }),
  universalHoldingId: varchar("universal_holding_id").notNull().references(() => universalHoldings.id, { onDelete: 'cascade' }),
  targetPercentage: decimal("target_percentage", { precision: 5, scale: 2 }).notNull(), // e.g., 25.00 for 25%
  createdAt: timestamp("created_at").defaultNow(),
});

export const plannedPortfolioAllocationsRelations = relations(plannedPortfolioAllocations, ({ one }) => ({
  portfolio: one(plannedPortfolios, {
    fields: [plannedPortfolioAllocations.plannedPortfolioId],
    references: [plannedPortfolios.id],
  }),
  holding: one(universalHoldings, {
    fields: [plannedPortfolioAllocations.universalHoldingId],
    references: [universalHoldings.id],
  }),
}));

// Freelance Portfolios table (custom one-off portfolios)
export const freelancePortfolios = pgTable("freelance_portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Multi-tenant: owner of this portfolio
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const freelancePortfoliosRelations = relations(freelancePortfolios, ({ many }) => ({
  allocations: many(freelancePortfolioAllocations),
}));

// Freelance Portfolio Allocations
export const freelancePortfolioAllocations = pgTable("freelance_portfolio_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  freelancePortfolioId: varchar("freelance_portfolio_id").notNull().references(() => freelancePortfolios.id, { onDelete: 'cascade' }),
  universalHoldingId: varchar("universal_holding_id").notNull().references(() => universalHoldings.id, { onDelete: 'cascade' }),
  targetPercentage: decimal("target_percentage", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const freelancePortfolioAllocationsRelations = relations(freelancePortfolioAllocations, ({ one }) => ({
  portfolio: one(freelancePortfolios, {
    fields: [freelancePortfolioAllocations.freelancePortfolioId],
    references: [freelancePortfolios.id],
  }),
  holding: one(universalHoldings, {
    fields: [freelancePortfolioAllocations.universalHoldingId],
    references: [universalHoldings.id],
  }),
}));

// Account Target Allocations (account-specific target percentages)
export const accountTargetAllocations = pgTable("account_target_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // One of these will be set depending on account type
  individualAccountId: varchar("individual_account_id").references(() => individualAccounts.id, { onDelete: 'cascade' }),
  corporateAccountId: varchar("corporate_account_id").references(() => corporateAccounts.id, { onDelete: 'cascade' }),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id, { onDelete: 'cascade' }),
  universalHoldingId: varchar("universal_holding_id").notNull().references(() => universalHoldings.id, { onDelete: 'cascade' }),
  targetPercentage: decimal("target_percentage", { precision: 5, scale: 2 }).notNull(), // e.g., 25.00 for 25%
  createdAt: timestamp("created_at").defaultNow(),
});

export const accountTargetAllocationsRelations = relations(accountTargetAllocations, ({ one }) => ({
  individualAccount: one(individualAccounts, {
    fields: [accountTargetAllocations.individualAccountId],
    references: [individualAccounts.id],
  }),
  corporateAccount: one(corporateAccounts, {
    fields: [accountTargetAllocations.corporateAccountId],
    references: [corporateAccounts.id],
  }),
  jointAccount: one(jointAccounts, {
    fields: [accountTargetAllocations.jointAccountId],
    references: [jointAccounts.id],
  }),
  holding: one(universalHoldings, {
    fields: [accountTargetAllocations.universalHoldingId],
    references: [universalHoldings.id],
  }),
}));

// Universal Holdings relations
export const universalHoldingsRelations = relations(universalHoldings, ({ many }) => ({
  plannedAllocations: many(plannedPortfolioAllocations),
  freelanceAllocations: many(freelancePortfolioAllocations),
  accountAllocations: many(accountTargetAllocations),
}));

// Alert signal enum
export const alertSignalEnum = pgEnum("alert_signal", ["BUY", "SELL"]);

// Alert status enum
export const alertStatusEnum = pgEnum("alert_status", ["pending", "executed", "dismissed"]);

// TradingView alerts table
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Multi-tenant: owner of this alert (nullable for legacy alerts)
  symbol: varchar("symbol", { length: 20 }).notNull(),
  signal: alertSignalEnum("signal").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  message: text("message"),
  status: alertStatusEnum("status").notNull().default("pending"),
  webhookData: jsonb("webhook_data"), // Store raw webhook payload
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trades table (manual trade records)
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // One of these will be set depending on account type
  individualAccountId: varchar("individual_account_id").references(() => individualAccounts.id, { onDelete: 'set null' }),
  corporateAccountId: varchar("corporate_account_id").references(() => corporateAccounts.id, { onDelete: 'set null' }),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id, { onDelete: 'set null' }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  action: varchar("action", { length: 10 }).notNull(), // BUY, SELL
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  executedAt: timestamp("executed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tradesRelations = relations(trades, ({ one }) => ({
  individualAccount: one(individualAccounts, {
    fields: [trades.individualAccountId],
    references: [individualAccounts.id],
  }),
  corporateAccount: one(corporateAccounts, {
    fields: [trades.corporateAccountId],
    references: [corporateAccounts.id],
  }),
  jointAccount: one(jointAccounts, {
    fields: [trades.jointAccountId],
    references: [jointAccounts.id],
  }),
}));

// Zod schemas for validation

// User Settings insert schema
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  webhookSecret: true, // Auto-generated
});

// Household Share insert schema
export const insertHouseholdShareSchema = createInsertSchema(householdShares).omit({
  id: true,
  sharedAt: true,
});

export const insertHouseholdSchema = createInsertSchema(households).pick({
  name: true,
  category: true,
}).extend({
  category: z.enum(["evergreen", "anchor", "pulse", "emerging_pulse", "emerging_anchor"], {
    required_error: "Please select a category",
  }),
});

export const insertIndividualSchema = createInsertSchema(individuals).pick({
  householdId: true,
  name: true,
  dateOfBirth: true,
  spouseDateOfBirth: true,
});

export const insertCorporationSchema = createInsertSchema(corporations).pick({
  householdId: true,
  name: true,
});

// Helper function to validate risk allocation sum equals 100%
function validateRiskAllocationSumEquals100(data: Record<string, any>): boolean {
  const medium = parseFloat(String(data.riskMediumPct ?? 0));
  const mediumHigh = parseFloat(String(data.riskMediumHighPct ?? 0));
  const high = parseFloat(String(data.riskHighPct ?? 0));
  const total = medium + mediumHigh + high;
  return Math.abs(total - 100) < 0.01;
}

// Base schemas without refine (for creating update schemas)
const baseIndividualAccountSchema = createInsertSchema(individualAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
  performance: true,
  riskMediumPct: true,
  riskMediumHighPct: true,
  riskHighPct: true,
}).extend({
  balance: z.coerce.number().nonnegative().default(0).transform(val => val.toString()),
  performance: z.coerce.number().optional().transform(val => val !== undefined ? val.toString() : undefined),
  riskMediumPct: z.coerce.number().min(0).max(100).default(0).transform(val => val.toString()),
  riskMediumHighPct: z.coerce.number().min(0).max(100).default(0).transform(val => val.toString()),
  riskHighPct: z.coerce.number().min(0).max(100).default(0).transform(val => val.toString()),
});

export const insertIndividualAccountSchema = baseIndividualAccountSchema.refine(validateRiskAllocationSumEquals100, {
  message: "Risk percentages must sum to 100%",
  path: ["riskMediumPct"],
});

const baseCorporateAccountSchema = createInsertSchema(corporateAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
  performance: true,
  riskMediumPct: true,
  riskMediumHighPct: true,
  riskHighPct: true,
}).extend({
  balance: z.coerce.number().nonnegative().default(0).transform(val => val.toString()),
  performance: z.coerce.number().optional().transform(val => val !== undefined ? val.toString() : undefined),
  riskMediumPct: z.coerce.number().min(0).max(100).default(0).transform(val => val.toString()),
  riskMediumHighPct: z.coerce.number().min(0).max(100).default(0).transform(val => val.toString()),
  riskHighPct: z.coerce.number().min(0).max(100).default(0).transform(val => val.toString()),
});

export const insertCorporateAccountSchema = baseCorporateAccountSchema.refine(validateRiskAllocationSumEquals100, {
  message: "Risk percentages must sum to 100%",
  path: ["riskMediumPct"],
});

const baseJointAccountSchema = createInsertSchema(jointAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
  performance: true,
  riskMediumPct: true,
  riskMediumHighPct: true,
  riskHighPct: true,
}).extend({
  balance: z.coerce.number().nonnegative().default(0).transform(val => val.toString()),
  performance: z.coerce.number().optional().transform(val => val !== undefined ? val.toString() : undefined),
  riskMediumPct: z.coerce.number().min(0).max(100).default(0).transform(val => val.toString()),
  riskMediumHighPct: z.coerce.number().min(0).max(100).default(0).transform(val => val.toString()),
  riskHighPct: z.coerce.number().min(0).max(100).default(0).transform(val => val.toString()),
});

export const insertJointAccountSchema = baseJointAccountSchema.refine(validateRiskAllocationSumEquals100, {
  message: "Risk percentages must sum to 100%",
  path: ["riskMediumPct"],
});

export const insertJointAccountOwnershipSchema = createInsertSchema(jointAccountOwnership).pick({
  jointAccountId: true,
  individualId: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  quantity: true,
  entryPrice: true,
  currentPrice: true,
  purchaseDate: true,
  protectionPercent: true,
  stopPrice: true,
  limitPrice: true,
}).extend({
  quantity: z.coerce.number().positive().transform(val => val.toString()),
  entryPrice: z.coerce.number().positive().transform(val => val.toString()),
  currentPrice: z.coerce.number().positive().optional().transform(val => val !== undefined ? val.toString() : undefined),
  purchaseDate: z.union([z.date(), z.string()]).optional().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
  protectionPercent: z.union([z.coerce.number(), z.string(), z.null()]).optional().transform(val => {
    if (val === null || val === undefined || val === '') return null;
    return String(val);
  }),
  stopPrice: z.union([z.coerce.number(), z.string(), z.null()]).optional().transform(val => {
    if (val === null || val === undefined || val === '') return null;
    return String(val);
  }),
  limitPrice: z.union([z.coerce.number(), z.string(), z.null()]).optional().transform(val => {
    if (val === null || val === undefined || val === '') return null;
    return String(val);
  }),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  price: true,
}).extend({
  price: z.coerce.number().positive().transform(val => val.toString()),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  quantity: true,
  price: true,
}).extend({
  quantity: z.coerce.number().positive().transform(val => val.toString()),
  price: z.coerce.number().positive().transform(val => val.toString()),
});

// Universal Holdings insert schema
export const insertUniversalHoldingSchema = createInsertSchema(universalHoldings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  dividendRate: true,
  price: true,
}).extend({
  dividendRate: z.coerce.number().nonnegative().default(0).transform(val => val.toString()),
  price: z.coerce.number().nonnegative().optional().default(0).transform(val => val.toString()),
});

// Planned Portfolio insert schema
export const insertPlannedPortfolioSchema = createInsertSchema(plannedPortfolios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Planned Portfolio Allocation insert schema
export const insertPlannedPortfolioAllocationSchema = createInsertSchema(plannedPortfolioAllocations).omit({
  id: true,
  createdAt: true,
  targetPercentage: true,
}).extend({
  targetPercentage: z.coerce.number().positive().max(100).transform(val => val.toString()),
});

// Freelance Portfolio insert schema
export const insertFreelancePortfolioSchema = createInsertSchema(freelancePortfolios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Freelance Portfolio Allocation insert schema
export const insertFreelancePortfolioAllocationSchema = createInsertSchema(freelancePortfolioAllocations).omit({
  id: true,
  createdAt: true,
  targetPercentage: true,
}).extend({
  targetPercentage: z.coerce.number().positive().max(100).transform(val => val.toString()),
});

// Account Target Allocation insert schema
export const insertAccountTargetAllocationSchema = createInsertSchema(accountTargetAllocations).omit({
  id: true,
  createdAt: true,
  targetPercentage: true,
}).extend({
  targetPercentage: z.coerce.number().positive().max(100).transform(val => val.toString()),
});

// Update schemas (partial versions of insert schemas)
export const updateHouseholdSchema = insertHouseholdSchema.partial();
export const updateIndividualSchema = insertIndividualSchema.partial();
export const updateCorporationSchema = insertCorporationSchema.partial();

function validateRiskAllocationSum(data: Record<string, any>): boolean {
  const medium = data.riskMediumPct != null ? parseFloat(String(data.riskMediumPct)) : undefined;
  const mediumHigh = data.riskMediumHighPct != null ? parseFloat(String(data.riskMediumHighPct)) : undefined;
  const high = data.riskHighPct != null ? parseFloat(String(data.riskHighPct)) : undefined;
  
  if (medium !== undefined || mediumHigh !== undefined || high !== undefined) {
    const m = medium ?? 100;
    const mh = mediumHigh ?? 0;
    const h = high ?? 0;
    const total = m + mh + h;
    return Math.abs(total - 100) < 0.01;
  }
  return true;
}

export const updateIndividualAccountSchema = baseIndividualAccountSchema.partial().refine(
  validateRiskAllocationSum,
  { message: "Risk percentages must sum to 100%" }
);
export const updateCorporateAccountSchema = baseCorporateAccountSchema.partial().refine(
  validateRiskAllocationSum,
  { message: "Risk percentages must sum to 100%" }
);
export const updateJointAccountSchema = baseJointAccountSchema.partial().refine(
  validateRiskAllocationSum,
  { message: "Risk percentages must sum to 100%" }
);
export const updatePositionSchema = insertPositionSchema.partial();
export const updateAlertSchema = z.object({
  status: z.enum(["pending", "executed", "dismissed"]).optional(),
  message: z.string().optional(),
});
export const updateUniversalHoldingSchema = insertUniversalHoldingSchema.partial();
export const updatePlannedPortfolioSchema = insertPlannedPortfolioSchema.partial();
export const updatePlannedPortfolioAllocationSchema = insertPlannedPortfolioAllocationSchema.partial();
export const updateFreelancePortfolioSchema = insertFreelancePortfolioSchema.partial();
export const updateFreelancePortfolioAllocationSchema = insertFreelancePortfolioAllocationSchema.partial();
export const updateAccountTargetAllocationSchema = insertAccountTargetAllocationSchema.partial();

// Webhook schema with validation
export const tradingViewWebhookSchema = z.object({
  symbol: z.string().min(1).max(20),
  signal: z.enum(["BUY", "SELL"]),
  price: z.number().positive(),
  message: z.string().optional(),
  email: z.string().email().optional(), // Optional email for report delivery
  secret: z.string().optional(), // Optional secret for validation
});

// Export types
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type Household = typeof households.$inferSelect;

export type InsertIndividual = z.infer<typeof insertIndividualSchema>;
export type Individual = typeof individuals.$inferSelect;

export type InsertCorporation = z.infer<typeof insertCorporationSchema>;
export type Corporation = typeof corporations.$inferSelect;

export type InsertIndividualAccount = z.infer<typeof insertIndividualAccountSchema>;
export type IndividualAccount = typeof individualAccounts.$inferSelect;

export type InsertCorporateAccount = z.infer<typeof insertCorporateAccountSchema>;
export type CorporateAccount = typeof corporateAccounts.$inferSelect;

export type InsertJointAccount = z.infer<typeof insertJointAccountSchema>;
export type JointAccount = typeof jointAccounts.$inferSelect;

export type InsertJointAccountOwnership = z.infer<typeof insertJointAccountOwnershipSchema>;
export type JointAccountOwnership = typeof jointAccountOwnership.$inferSelect;

export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type UpdateAlert = z.infer<typeof updateAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export type InsertUniversalHolding = z.infer<typeof insertUniversalHoldingSchema>;
export type UniversalHolding = typeof universalHoldings.$inferSelect;

export type InsertPlannedPortfolio = z.infer<typeof insertPlannedPortfolioSchema>;
export type PlannedPortfolio = typeof plannedPortfolios.$inferSelect;

export type InsertPlannedPortfolioAllocation = z.infer<typeof insertPlannedPortfolioAllocationSchema>;
export type PlannedPortfolioAllocation = typeof plannedPortfolioAllocations.$inferSelect;

export type InsertFreelancePortfolio = z.infer<typeof insertFreelancePortfolioSchema>;
export type FreelancePortfolio = typeof freelancePortfolios.$inferSelect;

export type InsertFreelancePortfolioAllocation = z.infer<typeof insertFreelancePortfolioAllocationSchema>;
export type FreelancePortfolioAllocation = typeof freelancePortfolioAllocations.$inferSelect;

export type InsertAccountTargetAllocation = z.infer<typeof insertAccountTargetAllocationSchema>;
export type AccountTargetAllocation = typeof accountTargetAllocations.$inferSelect;

// Account Target Allocation with holding details
export type AccountTargetAllocationWithHolding = AccountTargetAllocation & {
  holding: UniversalHolding;
};

// Portfolio with allocations types
export type PlannedPortfolioWithAllocations = PlannedPortfolio & {
  allocations: (PlannedPortfolioAllocation & { holding: UniversalHolding })[];
};

export type FreelancePortfolioWithAllocations = FreelancePortfolio & {
  allocations: (FreelancePortfolioAllocation & { holding: UniversalHolding })[];
};

// Nested household detail types
export type IndividualOwnerInfo = {
  id: string;
  name: string;
  initials: string;
  email: string | null;
};

export type IndividualWithAccounts = Individual & {
  accounts: IndividualAccount[];
};

export type CorporationWithAccounts = Corporation & {
  accounts: CorporateAccount[];
};

export type JointAccountWithOwners = JointAccount & {
  owners: IndividualOwnerInfo[];
};

export type HouseholdWithDetails = Household & {
  individuals: IndividualWithAccounts[];
  corporations: CorporationWithAccounts[];
  jointAccounts: JointAccountWithOwners[];
};

// Account task status enum
export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
]);

// Account task priority enum
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

// Account tasks table
export const accountTasks = pgTable("account_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // One of these will be set depending on account type
  individualAccountId: varchar("individual_account_id").references(() => individualAccounts.id, { onDelete: 'cascade' }),
  corporateAccountId: varchar("corporate_account_id").references(() => corporateAccounts.id, { onDelete: 'cascade' }),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("pending"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accountTasksRelations = relations(accountTasks, ({ one }) => ({
  individualAccount: one(individualAccounts, {
    fields: [accountTasks.individualAccountId],
    references: [individualAccounts.id],
  }),
  corporateAccount: one(corporateAccounts, {
    fields: [accountTasks.corporateAccountId],
    references: [corporateAccounts.id],
  }),
  jointAccount: one(jointAccounts, {
    fields: [accountTasks.jointAccountId],
    references: [jointAccounts.id],
  }),
}));

// Account task insert schema
export const insertAccountTaskSchema = createInsertSchema(accountTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const updateAccountTaskSchema = insertAccountTaskSchema.partial();

// Account task types
export type InsertAccountTask = z.infer<typeof insertAccountTaskSchema>;
export type AccountTask = typeof accountTasks.$inferSelect;

// Library document category enum
export const libraryDocumentCategoryEnum = pgEnum("library_document_category", [
  "reports",
  "strategies",
]);

// Library documents table (PDF storage metadata)
export const libraryDocuments = pgTable("library_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: libraryDocumentCategoryEnum("category").notNull(),
  objectPath: text("object_path").notNull(), // Path in object storage
  fileSize: decimal("file_size", { precision: 15, scale: 0 }), // Size in bytes
  mimeType: varchar("mime_type", { length: 100 }).default("application/pdf"),
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const libraryDocumentsRelations = relations(libraryDocuments, ({ one }) => ({
  uploader: one(users, {
    fields: [libraryDocuments.uploadedBy],
    references: [users.id],
  }),
}));

// Library documents insert schema
export const insertLibraryDocumentSchema = createInsertSchema(libraryDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  fileSize: true,
}).extend({
  fileSize: z.coerce.number().nonnegative().optional().transform(val => val?.toString()),
});

export const updateLibraryDocumentSchema = insertLibraryDocumentSchema.partial();

// Library document types
export type InsertLibraryDocument = z.infer<typeof insertLibraryDocumentSchema>;
export type LibraryDocument = typeof libraryDocuments.$inferSelect;

// Account audit action enum
export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update", 
  "delete",
  "position_add",
  "position_update",
  "position_delete",
  "position_bulk_upload",
  "target_add",
  "target_update",
  "target_delete",
  "task_add",
  "task_complete",
  "task_delete",
  "prices_refresh",
  "copy_from_model",
]);

// Account audit log table
export const accountAuditLog = pgTable("account_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // One of these will be set depending on account type
  individualAccountId: varchar("individual_account_id").references(() => individualAccounts.id, { onDelete: 'cascade' }),
  corporateAccountId: varchar("corporate_account_id").references(() => corporateAccounts.id, { onDelete: 'cascade' }),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  action: auditActionEnum("action").notNull(),
  changes: jsonb("changes").notNull(), // { field: { old: value, new: value } }
  createdAt: timestamp("created_at").defaultNow(),
});

export const accountAuditLogRelations = relations(accountAuditLog, ({ one }) => ({
  individualAccount: one(individualAccounts, {
    fields: [accountAuditLog.individualAccountId],
    references: [individualAccounts.id],
  }),
  corporateAccount: one(corporateAccounts, {
    fields: [accountAuditLog.corporateAccountId],
    references: [corporateAccounts.id],
  }),
  jointAccount: one(jointAccounts, {
    fields: [accountAuditLog.jointAccountId],
    references: [jointAccounts.id],
  }),
  user: one(users, {
    fields: [accountAuditLog.userId],
    references: [users.id],
  }),
}));

// Account audit log insert schema
export const insertAccountAuditLogSchema = createInsertSchema(accountAuditLog).omit({
  id: true,
  createdAt: true,
});

// Account audit log types
export type InsertAccountAuditLog = z.infer<typeof insertAccountAuditLogSchema>;
export type AccountAuditLog = typeof accountAuditLog.$inferSelect;
