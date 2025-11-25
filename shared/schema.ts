import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  pgEnum,
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

// Households table
export const households = pgTable("households", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const householdsRelations = relations(households, ({ many }) => ({
  individuals: many(individuals),
  corporations: many(corporations),
  jointAccounts: many(jointAccounts),
}));

// Individuals table
export const individuals = pgTable("individuals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: varchar("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
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
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default('0'),
  performance: decimal("performance", { precision: 8, scale: 4 }).default('0'), // percentage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const individualAccountsRelations = relations(individualAccounts, ({ one, many }) => ({
  individual: one(individuals, {
    fields: [individualAccounts.individualId],
    references: [individuals.id],
  }),
  positions: many(positions),
}));

// Corporate accounts table
export const corporateAccounts = pgTable("corporate_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  corporationId: varchar("corporation_id").notNull().references(() => corporations.id, { onDelete: 'cascade' }),
  type: corporateAccountTypeEnum("type").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default('0'),
  performance: decimal("performance", { precision: 8, scale: 4 }).default('0'), // percentage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const corporateAccountsRelations = relations(corporateAccounts, ({ one, many }) => ({
  corporation: one(corporations, {
    fields: [corporateAccounts.corporationId],
    references: [corporations.id],
  }),
  positions: many(positions),
}));

// Joint accounts table
export const jointAccounts = pgTable("joint_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: varchar("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  type: jointAccountTypeEnum("type").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default('0'),
  performance: decimal("performance", { precision: 8, scale: 4 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jointAccountsRelations = relations(jointAccounts, ({ one, many }) => ({
  household: one(households, {
    fields: [jointAccounts.householdId],
    references: [households.id],
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
  purchaseDate: timestamp("purchase_date"),
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

// Alert signal enum
export const alertSignalEnum = pgEnum("alert_signal", ["BUY", "SELL"]);

// Alert status enum
export const alertStatusEnum = pgEnum("alert_status", ["pending", "executed", "dismissed"]);

// TradingView alerts table
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
export const insertHouseholdSchema = createInsertSchema(households).pick({
  name: true,
});

export const insertIndividualSchema = createInsertSchema(individuals).pick({
  householdId: true,
  name: true,
});

export const insertCorporationSchema = createInsertSchema(corporations).pick({
  householdId: true,
  name: true,
});

export const insertIndividualAccountSchema = createInsertSchema(individualAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
  performance: true,
}).extend({
  balance: z.coerce.number().nonnegative().default(0).transform(val => val.toString()),
  performance: z.coerce.number().optional().transform(val => val !== undefined ? val.toString() : undefined),
});

export const insertCorporateAccountSchema = createInsertSchema(corporateAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
  performance: true,
}).extend({
  balance: z.coerce.number().nonnegative().default(0).transform(val => val.toString()),
  performance: z.coerce.number().optional().transform(val => val !== undefined ? val.toString() : undefined),
});

export const insertJointAccountSchema = createInsertSchema(jointAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
  performance: true,
}).extend({
  balance: z.coerce.number().nonnegative().default(0).transform(val => val.toString()),
  performance: z.coerce.number().optional().transform(val => val !== undefined ? val.toString() : undefined),
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
}).extend({
  quantity: z.coerce.number().positive().transform(val => val.toString()),
  entryPrice: z.coerce.number().positive().transform(val => val.toString()),
  currentPrice: z.coerce.number().positive().transform(val => val.toString()),
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

// Update schemas (partial versions of insert schemas)
export const updateHouseholdSchema = insertHouseholdSchema.partial();
export const updateIndividualSchema = insertIndividualSchema.partial();
export const updateCorporationSchema = insertCorporationSchema.partial();
export const updateIndividualAccountSchema = insertIndividualAccountSchema.partial();
export const updateCorporateAccountSchema = insertCorporateAccountSchema.partial();
export const updateJointAccountSchema = insertJointAccountSchema.partial();
export const updatePositionSchema = insertPositionSchema.partial();
export const updateAlertSchema = insertAlertSchema.partial();

// Webhook schema with validation
export const tradingViewWebhookSchema = z.object({
  symbol: z.string().min(1).max(20),
  signal: z.enum(["BUY", "SELL"]),
  price: z.number().positive(),
  message: z.string().optional(),
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
export type Alert = typeof alerts.$inferSelect;

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

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
