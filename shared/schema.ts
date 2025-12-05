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
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (for authentication)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (for authentication)
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
  deletedAt: timestamp("deleted_at"), // Soft delete - null means active, timestamp means archived
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

// Investment style enum - determines trading/dividend strategy for the account
export const investmentStyleEnum = pgEnum("investment_style", [
  "dividend_focus",    // High yield ETFs, minimal trading, income-oriented (DCA heavy)
  "active_trading",    // Momentum/technical, frequent trades, growth focus (DCP heavy)
  "hybrid",            // Balanced - moderate dividends + active position management
  "conservative",      // Capital preservation, very low activity, stable holdings
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
  watchlistPortfolioId: varchar("watchlist_portfolio_id").references(() => freelancePortfolios.id, { onDelete: 'set null' }),
  immediateNotes: text("immediate_notes"),
  upcomingNotes: text("upcoming_notes"),
  deploymentMode: boolean("deployment_mode").notNull().default(false), // When true, allows target allocations > 100% for cash deployment
  withdrawalMode: boolean("withdrawal_mode").notNull().default(false), // When true, shows sell planning interface
  investmentStyle: investmentStyleEnum("investment_style"), // Trading/dividend strategy
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
  watchlistPortfolio: one(freelancePortfolios, {
    fields: [individualAccounts.watchlistPortfolioId],
    references: [freelancePortfolios.id],
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
  watchlistPortfolioId: varchar("watchlist_portfolio_id").references(() => freelancePortfolios.id, { onDelete: 'set null' }),
  immediateNotes: text("immediate_notes"),
  upcomingNotes: text("upcoming_notes"),
  deploymentMode: boolean("deployment_mode").notNull().default(false), // When true, allows target allocations > 100% for cash deployment
  withdrawalMode: boolean("withdrawal_mode").notNull().default(false), // When true, shows sell planning interface
  investmentStyle: investmentStyleEnum("investment_style"), // Trading/dividend strategy
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
  watchlistPortfolio: one(freelancePortfolios, {
    fields: [corporateAccounts.watchlistPortfolioId],
    references: [freelancePortfolios.id],
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
  watchlistPortfolioId: varchar("watchlist_portfolio_id").references(() => freelancePortfolios.id, { onDelete: 'set null' }),
  immediateNotes: text("immediate_notes"),
  upcomingNotes: text("upcoming_notes"),
  deploymentMode: boolean("deployment_mode").notNull().default(false), // When true, allows target allocations > 100% for cash deployment
  withdrawalMode: boolean("withdrawal_mode").notNull().default(false), // When true, shows sell planning interface
  investmentStyle: investmentStyleEnum("investment_style"), // Trading/dividend strategy
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
  watchlistPortfolio: one(freelancePortfolios, {
    fields: [jointAccounts.watchlistPortfolioId],
    references: [freelancePortfolios.id],
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
  // One of these will be set depending on account type (or freelancePortfolioId for watchlist positions)
  individualAccountId: varchar("individual_account_id").references(() => individualAccounts.id, { onDelete: 'cascade' }),
  corporateAccountId: varchar("corporate_account_id").references(() => corporateAccounts.id, { onDelete: 'cascade' }),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id, { onDelete: 'cascade' }),
  freelancePortfolioId: varchar("freelance_portfolio_id").references(() => freelancePortfolios.id, { onDelete: 'cascade' }),
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
  // Protection alert tracking (prevents duplicate tasks)
  lastAlertGainPercent: decimal("last_alert_gain_percent", { precision: 5, scale: 2 }), // Gain % when last alert was created
  protectionReviewedAt: timestamp("protection_reviewed_at"), // When user reviewed without setting protection
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
  freelancePortfolio: one(freelancePortfolios, {
    fields: [positions.freelancePortfolioId],
    references: [freelancePortfolios.id],
  }),
}));

// Risk level enum for Universal Holdings
export const riskLevelEnum = pgEnum("risk_level", ["low", "low_medium", "medium", "medium_high", "high"]);

// Dividend payout frequency enum
export const dividendPayoutEnum = pgEnum("dividend_payout", ["monthly", "quarterly", "semi_annual", "annual", "none"]);

// Holding category enum
export const holdingCategoryEnum = pgEnum("holding_category", ["basket_etf", "single_etf", "double_long_etf", "leveraged_etf", "security", "auto_added", "misc"]);

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
  fundFactsUrl: text("fund_facts_url"), // Link to fund facts document (primarily for CC Basket ETFs)
  dividendSourceUrl: text("dividend_source_url"), // Link to fund company's dividend update page for auto-fetching
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
  portfolioType: text("portfolio_type").default("standard").notNull(), // "standard" (must equal 100%) or "watchlist" (can exceed 100%)
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
  sourcePortfolioType: text("source_portfolio_type"), // "planned" or "freelance" - indicates which portfolio type these were copied from
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

// Trading journal outcome enum
export const journalEntryOutcomeEnum = pgEnum("journal_entry_outcome", [
  "pending",
  "win",
  "loss",
  "partial",
]);

// Trading journal entries table
export const tradingJournalEntries = pgTable("trading_journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  notes: text("notes"),
  symbol: varchar("symbol", { length: 20 }), // Optional ticker reference
  tradeId: varchar("trade_id").references(() => trades.id, { onDelete: 'set null' }), // Optional link to trades table
  entryDate: timestamp("entry_date").notNull().defaultNow(),
  convictionScore: integer("conviction_score"), // 1-10 scale
  modelVersion: text("model_version"), // Track strategy evolution
  hypothesis: text("hypothesis"), // Investment thesis
  outcome: journalEntryOutcomeEnum("outcome").notNull().default("pending"),
  realizedPnL: decimal("realized_pnl", { precision: 15, scale: 2 }), // When outcome is known
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tradingJournalEntriesRelations = relations(tradingJournalEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [tradingJournalEntries.userId],
    references: [users.id],
  }),
  trade: one(trades, {
    fields: [tradingJournalEntries.tradeId],
    references: [trades.id],
  }),
  images: many(tradingJournalImages),
  entryTags: many(tradingJournalEntryTags),
}));

// Trading journal images table
export const tradingJournalImages = pgTable("trading_journal_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: varchar("entry_id").notNull().references(() => tradingJournalEntries.id, { onDelete: 'cascade' }),
  objectPath: text("object_path").notNull(), // Path in object storage
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: decimal("file_size", { precision: 15, scale: 0 }), // Size in bytes
  mimeType: varchar("mime_type", { length: 100 }).default("image/jpeg"),
  caption: text("caption"), // Optional caption
  sortOrder: integer("sort_order").notNull().default(0),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const tradingJournalImagesRelations = relations(tradingJournalImages, ({ one }) => ({
  entry: one(tradingJournalEntries, {
    fields: [tradingJournalImages.entryId],
    references: [tradingJournalEntries.id],
  }),
}));

// Trading journal tags table
export const tradingJournalTags = pgTable("trading_journal_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }), // Hex color code
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Unique constraint: user can't have duplicate tag names
  uniqueIndex("idx_trading_journal_tags_user_name").on(table.userId, table.name),
]);

export const tradingJournalTagsRelations = relations(tradingJournalTags, ({ one, many }) => ({
  user: one(users, {
    fields: [tradingJournalTags.userId],
    references: [users.id],
  }),
  entryTags: many(tradingJournalEntryTags),
}));

// Trading journal entry tags (many-to-many relationship)
export const tradingJournalEntryTags = pgTable("trading_journal_entry_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: varchar("entry_id").notNull().references(() => tradingJournalEntries.id, { onDelete: 'cascade' }),
  tagId: varchar("tag_id").notNull().references(() => tradingJournalTags.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Unique constraint: prevent duplicate tag assignments
  uniqueIndex("idx_trading_journal_entry_tags_unique").on(table.entryId, table.tagId),
]);

export const tradingJournalEntryTagsRelations = relations(tradingJournalEntryTags, ({ one }) => ({
  entry: one(tradingJournalEntries, {
    fields: [tradingJournalEntryTags.entryId],
    references: [tradingJournalEntries.id],
  }),
  tag: one(tradingJournalTags, {
    fields: [tradingJournalEntryTags.tagId],
    references: [tradingJournalTags.id],
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
}).extend({
  dateOfBirth: z.union([z.date(), z.string()]).optional().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
  spouseDateOfBirth: z.union([z.date(), z.string()]).optional().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
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
  watchlistPortfolioId: z.string().optional().nullable(),
  investmentStyle: z.enum(["dividend_focus", "active_trading", "hybrid", "conservative"]).optional().nullable(),
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
  watchlistPortfolioId: z.string().optional().nullable(),
  investmentStyle: z.enum(["dividend_focus", "active_trading", "hybrid", "conservative"]).optional().nullable(),
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
  watchlistPortfolioId: z.string().optional().nullable(),
  investmentStyle: z.enum(["dividend_focus", "active_trading", "hybrid", "conservative"]).optional().nullable(),
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

// Trading Journal Entry insert schema
const _insertTradingJournalEntrySchemaBase = createInsertSchema(tradingJournalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  convictionScore: true,
  realizedPnL: true,
  entryDate: true,
});
export const insertTradingJournalEntrySchema = _insertTradingJournalEntrySchemaBase.extend({
  title: z.string().min(1, "Title is required").max(500, "Title must be 500 characters or less"),
  notes: z.string().max(10000, "Notes must be 10000 characters or less").optional().nullable(),
  symbol: z.string().max(20, "Symbol must be 20 characters or less").optional().nullable(),
  tradeId: z.string().optional().nullable(),
  convictionScore: z.coerce.number().min(1).max(10).int().optional().nullable(),
  modelVersion: z.string().max(200, "Model version must be 200 characters or less").optional().nullable(),
  hypothesis: z.string().max(2000, "Hypothesis must be 2000 characters or less").optional().nullable(),
  outcome: z.enum(["pending", "win", "loss", "partial"]).optional().default("pending"),
  realizedPnL: z.coerce.number().optional().nullable().transform(val => val !== null && val !== undefined ? val.toString() : null),
  entryDate: z.coerce.date().optional(),
});

// Trading Journal Entry update schema
export const updateTradingJournalEntrySchema = insertTradingJournalEntrySchema.partial();

// Trading Journal Image insert schema
const _insertTradingJournalImageSchemaBase = createInsertSchema(tradingJournalImages).omit({
  id: true,
  uploadedAt: true,
  sortOrder: true,
  fileSize: true,
});
export const insertTradingJournalImageSchema = _insertTradingJournalImageSchemaBase.extend({
  entryId: z.string().min(1, "Entry ID is required"),
  objectPath: z.string().min(1, "Object path is required"),
  fileName: z.string().min(1, "File name is required").max(255, "File name must be 255 characters or less"),
  fileSize: z.coerce.number().nonnegative().optional().transform(val => val?.toString()),
  mimeType: z.string().max(100, "MIME type must be 100 characters or less").optional().default("image/jpeg"),
  caption: z.string().max(500, "Caption must be 500 characters or less").optional().nullable(),
  sortOrder: z.coerce.number().int().nonnegative().optional().default(0),
});

// Trading Journal Tag insert schema
export const insertTradingJournalTagSchema = createInsertSchema(tradingJournalTags)
  .omit({
    id: true,
    createdAt: true,
    userId: true,
  })
  .extend({
    name: z.string().min(1, "Tag name is required").max(100, "Tag name must be 100 characters or less"),
    color: z.string().regex(/^#([A-Fa-f0-9]{6})$/, "Color must be a valid hex color code").optional().nullable(),
  });

// Trading Journal Entry Tag insert schema
export const insertTradingJournalEntryTagSchema = createInsertSchema(tradingJournalEntryTags).omit({
  id: true,
  createdAt: true,
}).extend({
  entryId: z.string().min(1, "Entry ID is required"),
  tagId: z.string().min(1, "Tag ID is required"),
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
}).extend({
  portfolioType: z.enum(["standard", "watchlist"]).default("standard"),
});

// Freelance Portfolio Allocation insert schema (allows up to 100% per holding, total validated at portfolio level)
export const insertFreelancePortfolioAllocationSchema = createInsertSchema(freelancePortfolioAllocations).omit({
  id: true,
  createdAt: true,
  targetPercentage: true,
}).extend({
  targetPercentage: z.coerce.number().positive().max(100).transform(val => val.toString()),
});

// Account Target Allocation insert schema
// Note: max(100) removed to support deployment mode where allocations can exceed 100%
export const insertAccountTargetAllocationSchema = createInsertSchema(accountTargetAllocations).omit({
  id: true,
  createdAt: true,
  targetPercentage: true,
}).extend({
  targetPercentage: z.coerce.number().positive().transform(val => val.toString()),
  sourcePortfolioType: z.enum(["planned", "freelance"]).optional().nullable(),
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
  "blocked",
  "on_hold",
  "completed",
  "cancelled",
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
  archivedAt: timestamp("archived_at"), // Soft delete - tasks archived for 30 days before permanent deletion
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
  "account_setup",
  "position_add",
  "position_update",
  "position_delete",
  "position_bulk_upload",
  "position_bulk_delete",
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

// Insurance revenue status enum
export const insuranceRevenueStatusEnum = pgEnum("insurance_revenue_status", [
  "planned",
  "pending",
  "received",
]);

// Insurance revenue table
export const insuranceRevenue = pgTable("insurance_revenue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  clientName: varchar("client_name").notNull(),
  policyType: varchar("policy_type").notNull(), // Life, Health, Disability, etc.
  carrier: varchar("carrier"), // Insurance company name
  policyNumber: varchar("policy_number"),
  premium: decimal("premium", { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }), // Percentage
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).notNull(),
  status: insuranceRevenueStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insuranceRevenueRelations = relations(insuranceRevenue, ({ one }) => ({
  user: one(users, {
    fields: [insuranceRevenue.userId],
    references: [users.id],
  }),
}));

// Insurance revenue insert schema
export const insertInsuranceRevenueSchema = createInsertSchema(insuranceRevenue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  clientName: z.string().min(1, "Client name is required").max(200, "Client name must be 200 characters or less"),
  policyType: z.string().min(1, "Policy type is required"),
  carrier: z.string().max(200, "Carrier must be 200 characters or less").optional().nullable(),
  policyNumber: z.string().max(100, "Policy number must be 100 characters or less").optional().nullable(),
  notes: z.string().max(1000, "Notes must be 1000 characters or less").optional().nullable(),
  premium: z.coerce.number().nonnegative("Premium must be a positive number"),
  commissionAmount: z.coerce.number().nonnegative("Commission amount must be a positive number"),
});

// Insurance revenue update schema
export const updateInsuranceRevenueSchema = createInsertSchema(insuranceRevenue).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// Insurance revenue types
export type InsertInsuranceRevenue = z.infer<typeof insertInsuranceRevenueSchema>;
export type UpdateInsuranceRevenue = z.infer<typeof updateInsuranceRevenueSchema>;
export type InsuranceRevenue = typeof insuranceRevenue.$inferSelect;

// Investment revenue entry type enum
export const investmentRevenueEntryTypeEnum = pgEnum("investment_revenue_entry_type", [
  "dividend",
  "new_aum",
]);

// Investment revenue status enum (reuses same concept as insurance)
export const investmentRevenueStatusEnum = pgEnum("investment_revenue_status", [
  "planned",
  "pending",
  "received",
]);

// Investment revenue table
export const investmentRevenue = pgTable("investment_revenue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  entryType: investmentRevenueEntryTypeEnum("entry_type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  sourceName: varchar("source_name").notNull(), // Ticker symbol for dividends, client name for AUM
  accountType: varchar("account_type"), // TFSA, RRSP, Cash, etc.
  description: text("description"), // Additional details
  status: investmentRevenueStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const investmentRevenueRelations = relations(investmentRevenue, ({ one }) => ({
  user: one(users, {
    fields: [investmentRevenue.userId],
    references: [users.id],
  }),
}));

// Investment revenue insert schema
export const insertInvestmentRevenueSchema = createInsertSchema(investmentRevenue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  sourceName: z.string().min(1, "Source name is required").max(200, "Source name must be 200 characters or less"),
  accountType: z.string().max(50, "Account type must be 50 characters or less").optional().nullable(),
  description: z.string().max(500, "Description must be 500 characters or less").optional().nullable(),
  notes: z.string().max(1000, "Notes must be 1000 characters or less").optional().nullable(),
  amount: z.coerce.number().positive("Amount must be a positive number"),
});

// Investment revenue update schema
export const updateInvestmentRevenueSchema = createInsertSchema(investmentRevenue).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// Investment revenue types
export type InsertInvestmentRevenue = z.infer<typeof insertInvestmentRevenueSchema>;
export type UpdateInvestmentRevenue = z.infer<typeof updateInvestmentRevenueSchema>;
export type InvestmentRevenue = typeof investmentRevenue.$inferSelect;

// KPI objective status enum
export const kpiObjectiveStatusEnum = pgEnum("kpi_objective_status", [
  "planned",
  "in_progress",
  "completed",
]);

// KPI objective type enum
export const kpiObjectiveTypeEnum = pgEnum("kpi_objective_type", [
  "personal",
  "business",
]);

// Daily tracker mode enum
export const dailyTrackerModeEnum = pgEnum("daily_tracker_mode", [
  "business_days",
  "every_day",
]);

// KPI objectives table
export const kpiObjectives = pgTable("kpi_objectives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  month: varchar("month").notNull(), // YYYY-MM format
  title: text("title").notNull(),
  description: text("description"),
  type: kpiObjectiveTypeEnum("type").notNull().default("business"), // personal or business
  targetMetric: varchar("target_metric"), // e.g., "$50k AUM", "50 calls"
  status: kpiObjectiveStatusEnum("status").notNull().default("planned"),
  assignedTo: varchar("assigned_to"), // Team member name
  dailyTrackerMode: dailyTrackerModeEnum("daily_tracker_mode"), // business_days or every_day
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const kpiObjectivesRelations = relations(kpiObjectives, ({ one }) => ({
  user: one(users, {
    fields: [kpiObjectives.userId],
    references: [users.id],
  }),
}));

// KPI objectives insert schema
export const insertKpiObjectiveSchema = createInsertSchema(kpiObjectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional().nullable(),
  targetMetric: z.string().max(100, "Target metric must be 100 characters or less").optional().nullable(),
  assignedTo: z.string().max(100, "Assigned to must be 100 characters or less").optional().nullable(),
});

// KPI objectives update schema
export const updateKpiObjectiveSchema = createInsertSchema(kpiObjectives).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// KPI objectives types
export type InsertKpiObjective = z.infer<typeof insertKpiObjectiveSchema>;
export type UpdateKpiObjective = z.infer<typeof updateKpiObjectiveSchema>;
export type KpiObjective = typeof kpiObjectives.$inferSelect;

// KPI daily tasks table (for tracking daily/business day checkboxes)
export const kpiDailyTasks = pgTable("kpi_daily_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectiveId: varchar("objective_id").notNull().references(() => kpiObjectives.id, { onDelete: 'cascade' }),
  dayNumber: integer("day_number").notNull(), // 1-31, represents the day of the month
  isCompleted: integer("is_completed").notNull().default(0), // 0 = incomplete, 1 = complete
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_kpi_daily_task_unique").on(table.objectiveId, table.dayNumber),
]);

export const kpiDailyTasksRelations = relations(kpiDailyTasks, ({ one }) => ({
  objective: one(kpiObjectives, {
    fields: [kpiDailyTasks.objectiveId],
    references: [kpiObjectives.id],
  }),
}));

// Add relation from objectives to daily tasks
export const kpiObjectivesDailyRelations = relations(kpiObjectives, ({ many }) => ({
  dailyTasks: many(kpiDailyTasks),
}));

// KPI daily tasks insert schema
export const insertKpiDailyTaskSchema = createInsertSchema(kpiDailyTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// KPI daily tasks types
export type InsertKpiDailyTask = z.infer<typeof insertKpiDailyTaskSchema>;
export type KpiDailyTask = typeof kpiDailyTasks.$inferSelect;

// Reference links table
export const referenceLinks = pgTable("reference_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  icon: varchar("icon"), // Icon key like "link", "globe", "briefcase"
  imageUrl: text("image_url"), // For custom logo images
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referenceLinksRelations = relations(referenceLinks, ({ one }) => ({
  user: one(users, {
    fields: [referenceLinks.userId],
    references: [users.id],
  }),
}));

// Reference links insert schema
export const insertReferenceLinkSchema = createInsertSchema(referenceLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  url: z.string().min(1, "URL is required").url("Please enter a valid URL"),
  description: z.string().max(500, "Description must be 500 characters or less").optional().nullable(),
});

// Reference links update schema
export const updateReferenceLinkSchema = createInsertSchema(referenceLinks).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// Reference links types
export type InsertReferenceLink = z.infer<typeof insertReferenceLinkSchema>;
export type UpdateReferenceLink = z.infer<typeof updateReferenceLinkSchema>;
export type ReferenceLink = typeof referenceLinks.$inferSelect;

// Milestone type enum (business vs personal)
export const milestoneTypeEnum = pgEnum("milestone_type", [
  "business",
  "personal",
]);

// Business milestone category enum
export const milestoneCategoryEnum = pgEnum("milestone_category", [
  "client_win",
  "technology",
  "business_milestone",
  "team_achievement",
  "process_improvement",
  "other",
]);

// Personal milestone category enum
export const personalMilestoneCategoryEnum = pgEnum("personal_milestone_category", [
  "health_fitness",
  "family",
  "learning",
  "hobbies",
  "travel",
  "financial",
  "relationships",
  "self_care",
  "personal_other",
]);

// Milestones table (for capturing wins and achievements)
export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  milestoneType: milestoneTypeEnum("milestone_type").notNull().default("business"),
  title: text("title").notNull(),
  description: text("description"),
  category: milestoneCategoryEnum("category").notNull().default("other"),
  personalCategory: personalMilestoneCategoryEnum("personal_category"),
  impactValue: varchar("impact_value"), // e.g., "$500K AUM", "20 new clients"
  achievedDate: timestamp("achieved_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const milestonesRelations = relations(milestones, ({ one }) => ({
  user: one(users, {
    fields: [milestones.userId],
    references: [users.id],
  }),
}));

// Milestones insert schema
export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  milestoneType: z.enum(["business", "personal"]).default("business"),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional().nullable(),
  category: z.enum(["client_win", "technology", "business_milestone", "team_achievement", "process_improvement", "other"]).optional().nullable(),
  personalCategory: z.enum(["health_fitness", "family", "learning", "hobbies", "travel", "financial", "relationships", "self_care", "personal_other"]).optional().nullable(),
  impactValue: z.string().max(100, "Impact value must be 100 characters or less").optional().nullable(),
  achievedDate: z.coerce.date(),
});

// Milestones update schema
export const updateMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  milestoneType: z.enum(["business", "personal"]).optional(),
  category: z.enum(["client_win", "technology", "business_milestone", "team_achievement", "process_improvement", "other"]).optional().nullable(),
  personalCategory: z.enum(["health_fitness", "family", "learning", "hobbies", "travel", "financial", "relationships", "self_care", "personal_other"]).optional().nullable(),
  achievedDate: z.coerce.date().optional(),
}).partial();

// Milestones types
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type UpdateMilestone = z.infer<typeof updateMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

// Prospect status enum
export const prospectStatusEnum = pgEnum("prospect_status", [
  "new",
  "contacted",
  "scheduled",
  "in_progress",
  "qualified",
  "converted",
  "not_qualified",
  "archived",
]);

// Prospect interest type enum
export const prospectInterestEnum = pgEnum("prospect_interest", [
  "wealth_management",
  "retirement_planning",
  "tax_planning",
  "insurance",
  "estate_planning",
  "education_savings",
  "general_consultation",
  "other",
]);

// Prospect referral source enum
export const prospectReferralSourceEnum = pgEnum("prospect_referral_source", [
  "website",
  "referral",
  "social_media",
  "event",
  "cold_outreach",
  "other",
]);

// Prospects table (for client intake forms)
export const prospects = pgTable("prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }), // Assigned advisor
  
  // Basic Information
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  preferredContact: varchar("preferred_contact", { length: 20 }).default("email"), // email, phone, either
  
  // Financial Profile
  interestType: prospectInterestEnum("interest_type").notNull().default("general_consultation"),
  estimatedAssets: varchar("estimated_assets", { length: 100 }), // e.g., "500k-1M", "1M-5M"
  currentlyWorkingWithAdvisor: boolean("currently_working_with_advisor").default(false),
  
  // Discussion Details
  bestTimeToContact: varchar("best_time_to_contact", { length: 100 }),
  urgency: varchar("urgency", { length: 50 }), // immediate, within_month, exploring
  goals: text("goals"), // What they hope to achieve
  questions: text("questions"), // Initial questions they have
  additionalNotes: text("additional_notes"),
  
  // Source and Tracking
  referralSource: prospectReferralSourceEnum("referral_source").default("website"),
  referredBy: varchar("referred_by", { length: 200 }), // Name of referrer if applicable
  
  // Status Tracking
  status: prospectStatusEnum("status").notNull().default("new"),
  followUpDate: timestamp("follow_up_date"),
  lastContactedAt: timestamp("last_contacted_at"),
  
  // Internal Notes
  internalNotes: text("internal_notes"), // Private notes for the advisor
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const prospectsRelations = relations(prospects, ({ one }) => ({
  assignedUser: one(users, {
    fields: [prospects.userId],
    references: [users.id],
  }),
}));

// Prospect insert schema (for public intake form - minimal validation)
export const insertProspectSchema = createInsertSchema(prospects).omit({
  id: true,
  userId: true,
  status: true,
  lastContactedAt: true,
  internalNotes: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  firstName: z.string().min(1, "First name is required").max(100, "First name must be 100 characters or less"),
  lastName: z.string().min(1, "Last name is required").max(100, "Last name must be 100 characters or less"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  phone: z.string().max(50, "Phone must be 50 characters or less").optional().nullable(),
  preferredContact: z.enum(["email", "phone", "either"]).optional().default("email"),
  interestType: z.enum([
    "wealth_management",
    "retirement_planning",
    "tax_planning",
    "insurance",
    "estate_planning",
    "education_savings",
    "general_consultation",
    "other"
  ]).optional().default("general_consultation"),
  estimatedAssets: z.string().max(100).optional().nullable(),
  currentlyWorkingWithAdvisor: z.boolean().optional().default(false),
  bestTimeToContact: z.string().max(100).optional().nullable(),
  urgency: z.enum(["immediate", "within_month", "exploring"]).optional().nullable(),
  goals: z.string().max(2000, "Goals must be 2000 characters or less").optional().nullable(),
  questions: z.string().max(2000, "Questions must be 2000 characters or less").optional().nullable(),
  additionalNotes: z.string().max(2000, "Additional notes must be 2000 characters or less").optional().nullable(),
  referralSource: z.enum(["website", "referral", "social_media", "event", "cold_outreach", "other"]).optional().default("website"),
  referredBy: z.string().max(200).optional().nullable(),
  followUpDate: z.coerce.date().optional().nullable(),
});

// Prospect update schema (for internal management)
export const updateProspectSchema = createInsertSchema(prospects).omit({
  id: true,
  createdAt: true,
}).extend({
  status: z.enum(["new", "contacted", "scheduled", "in_progress", "qualified", "converted", "not_qualified", "archived"]).optional(),
  followUpDate: z.coerce.date().optional().nullable(),
  lastContactedAt: z.coerce.date().optional().nullable(),
  internalNotes: z.string().max(5000).optional().nullable(),
}).partial();

// Prospect types
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type UpdateProspect = z.infer<typeof updateProspectSchema>;
export type Prospect = typeof prospects.$inferSelect;

// ==========================================
// DCA (Dollar Cost Averaging) Plans
// ==========================================

// DCA Plan status enum
export const dcaPlanStatusEnum = pgEnum("dca_plan_status", [
  "active",      // Currently executing
  "paused",      // Temporarily stopped
  "completed",   // Target reached
  "cancelled",   // User cancelled
]);

// DCA Plan frequency enum
export const dcaFrequencyEnum = pgEnum("dca_frequency", [
  "weekly",
  "bi_weekly",
  "monthly",
  "quarterly",
]);

// DCA Plans table - tracks systematic buying plans
export const dcaPlans = pgTable("dca_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  // One of these will be set depending on account type
  individualAccountId: varchar("individual_account_id").references(() => individualAccounts.id, { onDelete: 'cascade' }),
  corporateAccountId: varchar("corporate_account_id").references(() => corporateAccounts.id, { onDelete: 'cascade' }),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id, { onDelete: 'cascade' }),
  // Target holding
  universalHoldingId: varchar("universal_holding_id").references(() => universalHoldings.id, { onDelete: 'cascade' }),
  symbol: varchar("symbol", { length: 20 }).notNull(), // Store symbol for quick reference
  // DCA Configuration
  targetAllocationPct: decimal("target_allocation_pct", { precision: 5, scale: 2 }).notNull(), // Final target % (e.g., 20%)
  currentAllocationPct: decimal("current_allocation_pct", { precision: 5, scale: 2 }).notNull().default('0'), // Starting point (e.g., 12%)
  incrementPct: decimal("increment_pct", { precision: 5, scale: 2 }), // How much to add each period (e.g., 2%)
  amountPerPeriod: decimal("amount_per_period", { precision: 15, scale: 2 }), // Or fixed $ amount per period
  frequency: dcaFrequencyEnum("frequency").notNull().default("monthly"),
  dayOfPeriod: integer("day_of_period").default(15), // Day of week (1-7) or month (1-31)
  // Tracking
  status: dcaPlanStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  nextExecutionDate: timestamp("next_execution_date"),
  lastExecutionDate: timestamp("last_execution_date"),
  executionCount: integer("execution_count").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dcaPlansRelations = relations(dcaPlans, ({ one }) => ({
  user: one(users, {
    fields: [dcaPlans.userId],
    references: [users.id],
  }),
  individualAccount: one(individualAccounts, {
    fields: [dcaPlans.individualAccountId],
    references: [individualAccounts.id],
  }),
  corporateAccount: one(corporateAccounts, {
    fields: [dcaPlans.corporateAccountId],
    references: [corporateAccounts.id],
  }),
  jointAccount: one(jointAccounts, {
    fields: [dcaPlans.jointAccountId],
    references: [jointAccounts.id],
  }),
  holding: one(universalHoldings, {
    fields: [dcaPlans.universalHoldingId],
    references: [universalHoldings.id],
  }),
}));

// DCA Plans insert schema
export const insertDcaPlanSchema = createInsertSchema(dcaPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  executionCount: true,
  lastExecutionDate: true,
}).extend({
  symbol: z.string().min(1, "Symbol is required").max(20),
  targetAllocationPct: z.coerce.number().min(0).max(100),
  currentAllocationPct: z.coerce.number().min(0).max(100).default(0),
  incrementPct: z.coerce.number().min(0).max(100).optional().nullable(),
  amountPerPeriod: z.coerce.number().positive().optional().nullable(),
  dayOfPeriod: z.coerce.number().min(1).max(31).optional().default(15),
  startDate: z.coerce.date().optional(),
  nextExecutionDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateDcaPlanSchema = insertDcaPlanSchema.partial();

// DCA Plan types
export type InsertDcaPlan = z.infer<typeof insertDcaPlanSchema>;
export type UpdateDcaPlan = z.infer<typeof updateDcaPlanSchema>;
export type DcaPlan = typeof dcaPlans.$inferSelect;

// ==========================================
// DCP (Dollar Cost Profit) Plans
// ==========================================

// DCP Plan status enum
export const dcpPlanStatusEnum = pgEnum("dcp_plan_status", [
  "active",      // Currently monitoring/executing
  "paused",      // Temporarily stopped
  "completed",   // Position fully exited
  "cancelled",   // User cancelled
]);

// DCP Trigger type enum
export const dcpTriggerTypeEnum = pgEnum("dcp_trigger_type", [
  "scheduled",       // Time-based (like DCA)
  "price_target",    // Sell when price reaches X
  "percentage_gain", // Sell when gain reaches X%
  "trailing_stop",   // Dynamic trailing stop
]);

// DCP Plans table - tracks systematic selling/profit-taking plans
export const dcpPlans = pgTable("dcp_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  // One of these will be set depending on account type
  individualAccountId: varchar("individual_account_id").references(() => individualAccounts.id, { onDelete: 'cascade' }),
  corporateAccountId: varchar("corporate_account_id").references(() => corporateAccounts.id, { onDelete: 'cascade' }),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id, { onDelete: 'cascade' }),
  // Target position
  positionId: varchar("position_id").references(() => positions.id, { onDelete: 'cascade' }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  // DCP Configuration
  triggerType: dcpTriggerTypeEnum("trigger_type").notNull().default("percentage_gain"),
  // For scheduled sells
  frequency: dcaFrequencyEnum("frequency"), // Reuse DCA frequency
  dayOfPeriod: integer("day_of_period"),
  sellPercentage: decimal("sell_percentage", { precision: 5, scale: 2 }), // % of position to sell each time
  sellAmount: decimal("sell_amount", { precision: 15, scale: 2 }), // Or fixed $ amount
  // For price-based triggers
  targetPrice: decimal("target_price", { precision: 15, scale: 2 }),
  targetGainPct: decimal("target_gain_pct", { precision: 8, scale: 2 }), // % gain to trigger
  trailingStopPct: decimal("trailing_stop_pct", { precision: 5, scale: 2 }), // Trailing stop %
  // Target allocation reduction
  targetAllocationPct: decimal("target_allocation_pct", { precision: 5, scale: 2 }), // Target to reduce to (e.g., from 20% to 10%)
  // Tracking
  status: dcpPlanStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  nextExecutionDate: timestamp("next_execution_date"),
  lastExecutionDate: timestamp("last_execution_date"),
  executionCount: integer("execution_count").notNull().default(0),
  totalProfit: decimal("total_profit", { precision: 15, scale: 2 }).default('0'), // Running profit tally
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dcpPlansRelations = relations(dcpPlans, ({ one }) => ({
  user: one(users, {
    fields: [dcpPlans.userId],
    references: [users.id],
  }),
  individualAccount: one(individualAccounts, {
    fields: [dcpPlans.individualAccountId],
    references: [individualAccounts.id],
  }),
  corporateAccount: one(corporateAccounts, {
    fields: [dcpPlans.corporateAccountId],
    references: [corporateAccounts.id],
  }),
  jointAccount: one(jointAccounts, {
    fields: [dcpPlans.jointAccountId],
    references: [jointAccounts.id],
  }),
  position: one(positions, {
    fields: [dcpPlans.positionId],
    references: [positions.id],
  }),
}));

// DCP Plans insert schema
export const insertDcpPlanSchema = createInsertSchema(dcpPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  executionCount: true,
  lastExecutionDate: true,
  totalProfit: true,
}).extend({
  symbol: z.string().min(1, "Symbol is required").max(20),
  sellPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  sellAmount: z.coerce.number().positive().optional().nullable(),
  targetPrice: z.coerce.number().positive().optional().nullable(),
  targetGainPct: z.coerce.number().optional().nullable(),
  trailingStopPct: z.coerce.number().min(0).max(100).optional().nullable(),
  targetAllocationPct: z.coerce.number().min(0).max(100).optional().nullable(),
  dayOfPeriod: z.coerce.number().min(1).max(31).optional().nullable(),
  startDate: z.coerce.date().optional(),
  nextExecutionDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateDcpPlanSchema = insertDcpPlanSchema.partial();

// DCP Plan types
export type InsertDcpPlan = z.infer<typeof insertDcpPlanSchema>;
export type UpdateDcpPlan = z.infer<typeof updateDcpPlanSchema>;
export type DcpPlan = typeof dcpPlans.$inferSelect;

// ==========================================
// DCA/DCP Execution History
// ==========================================

// Execution type enum
export const executionTypeEnum = pgEnum("execution_type", [
  "dca",  // Dollar Cost Averaging (buy)
  "dcp",  // Dollar Cost Profit (sell)
]);

// Execution history table - tracks every execution of DCA/DCP plans
export const executionHistory = pgTable("execution_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  executionType: executionTypeEnum("execution_type").notNull(),
  // Reference to the plan
  dcaPlanId: varchar("dca_plan_id").references(() => dcaPlans.id, { onDelete: 'cascade' }),
  dcpPlanId: varchar("dcp_plan_id").references(() => dcpPlans.id, { onDelete: 'cascade' }),
  // Execution details
  symbol: varchar("symbol", { length: 20 }).notNull(),
  action: varchar("action", { length: 10 }).notNull(), // BUY or SELL
  quantity: decimal("quantity", { precision: 15, scale: 4 }), // Shares traded (if known)
  price: decimal("price", { precision: 15, scale: 2 }), // Price at execution (if known)
  amount: decimal("amount", { precision: 15, scale: 2 }), // Total $ amount
  // For DCA: allocation tracking
  previousAllocationPct: decimal("previous_allocation_pct", { precision: 5, scale: 2 }),
  newAllocationPct: decimal("new_allocation_pct", { precision: 5, scale: 2 }),
  // For DCP: profit tracking
  profit: decimal("profit", { precision: 15, scale: 2 }),
  // Metadata
  notes: text("notes"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const executionHistoryRelations = relations(executionHistory, ({ one }) => ({
  user: one(users, {
    fields: [executionHistory.userId],
    references: [users.id],
  }),
  dcaPlan: one(dcaPlans, {
    fields: [executionHistory.dcaPlanId],
    references: [dcaPlans.id],
  }),
  dcpPlan: one(dcpPlans, {
    fields: [executionHistory.dcpPlanId],
    references: [dcpPlans.id],
  }),
}));

// Execution history insert schema
export const insertExecutionHistorySchema = createInsertSchema(executionHistory).omit({
  id: true,
  createdAt: true,
}).extend({
  symbol: z.string().min(1).max(20),
  action: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive().optional().nullable(),
  price: z.coerce.number().positive().optional().nullable(),
  amount: z.coerce.number().positive().optional().nullable(),
  previousAllocationPct: z.coerce.number().min(0).max(100).optional().nullable(),
  newAllocationPct: z.coerce.number().min(0).max(100).optional().nullable(),
  profit: z.coerce.number().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  executedAt: z.coerce.date().optional(),
});

// Execution history types
export type InsertExecutionHistory = z.infer<typeof insertExecutionHistorySchema>;
export type ExecutionHistory = typeof executionHistory.$inferSelect;

// Trading Journal types
export type InsertTradingJournalEntry = z.infer<typeof insertTradingJournalEntrySchema>;
export type UpdateTradingJournalEntry = z.infer<typeof updateTradingJournalEntrySchema>;
export type TradingJournalEntry = typeof tradingJournalEntries.$inferSelect;

export type InsertTradingJournalImage = z.infer<typeof insertTradingJournalImageSchema>;
export type TradingJournalImage = typeof tradingJournalImages.$inferSelect;

export type InsertTradingJournalTag = z.infer<typeof insertTradingJournalTagSchema>;
export type TradingJournalTag = typeof tradingJournalTags.$inferSelect;

export type InsertTradingJournalEntryTag = z.infer<typeof insertTradingJournalEntryTagSchema>;
export type TradingJournalEntryTag = typeof tradingJournalEntryTags.$inferSelect;

// Trading Journal Entry with related data
export type TradingJournalEntryWithImages = TradingJournalEntry & {
  images: TradingJournalImage[];
};

export type TradingJournalEntryWithTags = TradingJournalEntry & {
  entryTags: (TradingJournalEntryTag & { tag: TradingJournalTag })[];
};

export type TradingJournalEntryWithDetails = TradingJournalEntry & {
  images: TradingJournalImage[];
  entryTags: (TradingJournalEntryTag & { tag: TradingJournalTag })[];
  trade?: Trade | null;
};
