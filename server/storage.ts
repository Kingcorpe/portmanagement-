// Database storage layer
import {
  users,
  households,
  householdShares,
  userSettings,
  individuals,
  corporations,
  individualAccounts,
  corporateAccounts,
  jointAccounts,
  jointAccountOwnership,
  positions,
  alerts,
  trades,
  universalHoldings,
  plannedPortfolios,
  plannedPortfolioAllocations,
  freelancePortfolios,
  freelancePortfolioAllocations,
  accountTargetAllocations,
  libraryDocuments,
  accountTasks,
  accountAuditLog,
  insuranceRevenue,
  investmentRevenue,
  kpiObjectives,
  kpiDailyTasks,
  referenceLinks,
  milestones,
  tradingJournalEntries,
  tradingJournalImages,
  tradingJournalTags,
  tradingJournalEntryTags,
  prospects,
  type User,
  type UpsertUser,
  type Household,
  type InsertHousehold,
  type HouseholdShare,
  type InsertHouseholdShare,
  type UserSettings,
  type InsertUserSettings,
  type Individual,
  type InsertIndividual,
  type Corporation,
  type InsertCorporation,
  type IndividualAccount,
  type InsertIndividualAccount,
  type CorporateAccount,
  type InsertCorporateAccount,
  type JointAccount,
  type InsertJointAccount,
  type JointAccountOwnership,
  type InsertJointAccountOwnership,
  type Position,
  type InsertPosition,
  type Alert,
  type InsertAlert,
  type UpdateAlert,
  type Trade,
  type InsertTrade,
  type HouseholdWithDetails,
  type UniversalHolding,
  type InsertUniversalHolding,
  type PlannedPortfolio,
  type InsertPlannedPortfolio,
  type PlannedPortfolioAllocation,
  type InsertPlannedPortfolioAllocation,
  type PlannedPortfolioWithAllocations,
  type FreelancePortfolio,
  type InsertFreelancePortfolio,
  type FreelancePortfolioAllocation,
  type InsertFreelancePortfolioAllocation,
  type FreelancePortfolioWithAllocations,
  type AccountTargetAllocation,
  type InsertAccountTargetAllocation,
  type AccountTargetAllocationWithHolding,
  type LibraryDocument,
  type InsertLibraryDocument,
  type AccountTask,
  type InsertAccountTask,
  type AccountAuditLog,
  type InsertAccountAuditLog,
  type InsuranceRevenue,
  type InsertInsuranceRevenue,
  type UpdateInsuranceRevenue,
  type InvestmentRevenue,
  type InsertInvestmentRevenue,
  type UpdateInvestmentRevenue,
  type KpiObjective,
  type InsertKpiObjective,
  type UpdateKpiObjective,
  type KpiDailyTask,
  type InsertKpiDailyTask,
  type ReferenceLink,
  type InsertReferenceLink,
  type UpdateReferenceLink,
  type Milestone,
  type InsertMilestone,
  type UpdateMilestone,
  type TradingJournalEntry,
  type InsertTradingJournalEntry,
  type UpdateTradingJournalEntry,
  type TradingJournalEntryWithDetails,
  type TradingJournalImage,
  type InsertTradingJournalImage,
  type TradingJournalTag,
  type InsertTradingJournalTag,
  type TradingJournalEntryTag,
  type InsertTradingJournalEntryTag,
  type Trade,
  type Prospect,
  type InsertProspect,
  type UpdateProspect,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, inArray, ilike, or, and, sql, isNull, isNotNull, lt } from "drizzle-orm";

export interface IStorage {
  // User operations (required for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // User Settings operations
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  getUserSettingsByWebhookSecret(secret: string): Promise<UserSettings | undefined>;
  regenerateWebhookSecret(userId: string): Promise<UserSettings>;

  // Household Sharing operations
  shareHousehold(share: InsertHouseholdShare): Promise<HouseholdShare>;
  getHouseholdShares(householdId: string): Promise<(HouseholdShare & { sharedWithUser: User })[]>;
  removeHouseholdShare(householdId: string, sharedWithUserId: string): Promise<void>;
  getSharedHouseholdsForUser(userId: string): Promise<string[]>; // Returns household IDs

  // Household operations (with optional user filtering)
  createHousehold(household: InsertHousehold & { userId?: string }): Promise<Household>;
  getHousehold(id: string): Promise<Household | undefined>;
  getAllHouseholds(userId?: string): Promise<Household[]>;
  getAllHouseholdsWithDetails(userId?: string): Promise<HouseholdWithDetails[]>;
  getHouseholdWithDetails(id: string): Promise<HouseholdWithDetails | null>;
  updateHousehold(id: string, household: Partial<InsertHousehold>): Promise<Household>;
  deleteHousehold(id: string): Promise<void>;
  getAllArchivedHouseholds(userId?: string): Promise<Household[]>;
  restoreHousehold(id: string): Promise<Household>;
  canUserAccessHousehold(userId: string, householdId: string): Promise<boolean>;
  canUserEditHousehold(userId: string, householdId: string): Promise<boolean>;
  getHouseholdIdFromAccount(accountType: 'individual' | 'corporate' | 'joint', accountId: string): Promise<string | null>;
  getHouseholdIdFromPosition(positionId: string): Promise<string | null>;
  getHouseholdIdFromTrade(tradeId: string): Promise<string | null>;
  getHouseholdIdFromTargetAllocation(allocationId: string): Promise<string | null>;

  // Individual operations
  createIndividual(individual: InsertIndividual): Promise<Individual>;
  getIndividual(id: string): Promise<Individual | undefined>;
  getIndividualsByHousehold(householdId: string): Promise<Individual[]>;
  updateIndividual(id: string, individual: Partial<InsertIndividual>): Promise<Individual>;
  deleteIndividual(id: string): Promise<void>;

  // Corporation operations
  createCorporation(corporation: InsertCorporation): Promise<Corporation>;
  getCorporation(id: string): Promise<Corporation | undefined>;
  getCorporationsByHousehold(householdId: string): Promise<Corporation[]>;
  updateCorporation(id: string, corporation: Partial<InsertCorporation>): Promise<Corporation>;
  deleteCorporation(id: string): Promise<void>;

  // Individual account operations
  createIndividualAccount(account: InsertIndividualAccount): Promise<IndividualAccount>;
  getIndividualAccount(id: string): Promise<IndividualAccount | undefined>;
  getIndividualAccountsByIndividual(individualId: string): Promise<IndividualAccount[]>;
  updateIndividualAccount(id: string, account: Partial<InsertIndividualAccount>): Promise<IndividualAccount>;
  deleteIndividualAccount(id: string): Promise<void>;

  // Corporate account operations
  createCorporateAccount(account: InsertCorporateAccount): Promise<CorporateAccount>;
  getCorporateAccount(id: string): Promise<CorporateAccount | undefined>;
  getCorporateAccountsByCorporation(corporationId: string): Promise<CorporateAccount[]>;
  updateCorporateAccount(id: string, account: Partial<InsertCorporateAccount>): Promise<CorporateAccount>;
  deleteCorporateAccount(id: string): Promise<void>;

  // Joint account operations
  createJointAccount(jointAccount: InsertJointAccount): Promise<JointAccount>;
  getJointAccount(id: string): Promise<JointAccount | undefined>;
  getJointAccountsByHousehold(householdId: string): Promise<JointAccount[]>;
  updateJointAccount(id: string, jointAccount: Partial<InsertJointAccount>): Promise<JointAccount>;
  deleteJointAccount(id: string): Promise<void>;

  // Joint account ownership operations
  addJointAccountOwner(ownership: InsertJointAccountOwnership): Promise<JointAccountOwnership>;
  getJointAccountOwners(jointAccountId: string): Promise<Individual[]>;
  removeJointAccountOwner(jointAccountId: string, individualId: string): Promise<void>;

  // Position operations
  createPosition(position: InsertPosition): Promise<Position>;
  getPosition(id: string): Promise<Position | undefined>;
  getPositionsByIndividualAccount(accountId: string): Promise<Position[]>;
  getPositionsByCorporateAccount(accountId: string): Promise<Position[]>;
  getPositionsByJointAccount(accountId: string): Promise<Position[]>;
  getPositionsBySymbol(symbol: string): Promise<Position[]>;
  getAllPositionsWithAccountInfo(): Promise<Array<Position & { accountType: 'individual' | 'corporate' | 'joint'; accountId: string }>>;
  updatePosition(id: string, position: Partial<InsertPosition>): Promise<Position>;
  deletePosition(id: string): Promise<void>;
  calculateIndividualAccountBalance(accountId: string): Promise<number>;
  calculateCorporateAccountBalance(accountId: string): Promise<number>;
  calculateJointAccountBalance(accountId: string): Promise<number>;
  getWatchlistPositionsByIndividualAccount(accountId: string): Promise<Position[]>;
  getWatchlistPositionsByCorporateAccount(accountId: string): Promise<Position[]>;
  getWatchlistPositionsByJointAccount(accountId: string): Promise<Position[]>;
  createWatchlistForAccount(accountType: 'individual' | 'corporate' | 'joint', accountId: string, portfolioName: string): Promise<FreelancePortfolio>;

  // Alert operations
  createAlert(alert: InsertAlert): Promise<Alert>;
  getAlert(id: string): Promise<Alert | undefined>;
  getAllAlerts(): Promise<Alert[]>;
  getAlertsByStatus(status: "pending" | "executed" | "dismissed"): Promise<Alert[]>;
  updateAlert(id: string, alert: UpdateAlert): Promise<Alert>;
  deleteAlert(id: string): Promise<void>;

  // Trade operations
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTrade(id: string): Promise<Trade | undefined>;
  getAllTrades(): Promise<Trade[]>;

  // Universal Holdings operations
  createUniversalHolding(holding: InsertUniversalHolding): Promise<UniversalHolding>;
  getUniversalHolding(id: string): Promise<UniversalHolding | undefined>;
  getUniversalHoldingByTicker(ticker: string): Promise<UniversalHolding | undefined>;
  getAllUniversalHoldings(): Promise<UniversalHolding[]>;
  updateUniversalHolding(id: string, holding: Partial<InsertUniversalHolding>): Promise<UniversalHolding>;
  deleteUniversalHolding(id: string): Promise<void>;

  // Planned Portfolio operations
  createPlannedPortfolio(portfolio: InsertPlannedPortfolio): Promise<PlannedPortfolio>;
  getPlannedPortfolio(id: string): Promise<PlannedPortfolio | undefined>;
  getPlannedPortfolioWithAllocations(id: string): Promise<PlannedPortfolioWithAllocations | null>;
  getAllPlannedPortfolios(userId?: string): Promise<PlannedPortfolio[]>;
  getAllPlannedPortfoliosWithAllocations(userId?: string): Promise<PlannedPortfolioWithAllocations[]>;
  updatePlannedPortfolio(id: string, portfolio: Partial<InsertPlannedPortfolio>): Promise<PlannedPortfolio>;
  deletePlannedPortfolio(id: string): Promise<void>;

  // Planned Portfolio Allocation operations
  createPlannedPortfolioAllocation(allocation: InsertPlannedPortfolioAllocation): Promise<PlannedPortfolioAllocation>;
  updatePlannedPortfolioAllocation(id: string, allocation: Partial<InsertPlannedPortfolioAllocation>): Promise<PlannedPortfolioAllocation>;
  deletePlannedPortfolioAllocation(id: string): Promise<void>;
  getPlannedPortfolioAllocations(portfolioId: string): Promise<PlannedPortfolioAllocation[]>;

  // Freelance Portfolio operations
  createFreelancePortfolio(portfolio: InsertFreelancePortfolio): Promise<FreelancePortfolio>;
  getFreelancePortfolio(id: string): Promise<FreelancePortfolio | undefined>;
  getFreelancePortfolioWithAllocations(id: string): Promise<FreelancePortfolioWithAllocations | null>;
  getAllFreelancePortfolios(userId?: string): Promise<FreelancePortfolio[]>;
  getAllFreelancePortfoliosWithAllocations(userId?: string): Promise<FreelancePortfolioWithAllocations[]>;
  updateFreelancePortfolio(id: string, portfolio: Partial<InsertFreelancePortfolio>): Promise<FreelancePortfolio>;
  deleteFreelancePortfolio(id: string): Promise<void>;

  // Freelance Portfolio Allocation operations
  createFreelancePortfolioAllocation(allocation: InsertFreelancePortfolioAllocation): Promise<FreelancePortfolioAllocation>;
  updateFreelancePortfolioAllocation(id: string, allocation: Partial<InsertFreelancePortfolioAllocation>): Promise<FreelancePortfolioAllocation>;
  deleteFreelancePortfolioAllocation(id: string): Promise<void>;
  getFreelancePortfolioAllocations(portfolioId: string): Promise<FreelancePortfolioAllocation[]>;

  // Account Target Allocation operations
  createAccountTargetAllocation(allocation: InsertAccountTargetAllocation): Promise<AccountTargetAllocation>;
  updateAccountTargetAllocation(id: string, allocation: Partial<InsertAccountTargetAllocation>): Promise<AccountTargetAllocation>;
  deleteAccountTargetAllocation(id: string): Promise<void>;
  getAccountTargetAllocationsByIndividualAccount(accountId: string): Promise<AccountTargetAllocationWithHolding[]>;
  getAccountTargetAllocationsByCorporateAccount(accountId: string): Promise<AccountTargetAllocationWithHolding[]>;
  getAccountTargetAllocationsByJointAccount(accountId: string): Promise<AccountTargetAllocationWithHolding[]>;
  getAccountTargetAllocationsBySymbol(symbol: string): Promise<Array<AccountTargetAllocationWithHolding & { accountType: string; accountId: string }>>;
  deleteAllAccountTargetAllocations(accountType: 'individual' | 'corporate' | 'joint', accountId: string): Promise<void>;

  // Library document operations
  createLibraryDocument(document: InsertLibraryDocument): Promise<LibraryDocument>;
  getLibraryDocument(id: string): Promise<LibraryDocument | undefined>;
  getAllLibraryDocuments(userId?: string): Promise<LibraryDocument[]>;
  getLibraryDocumentsByCategory(category: 'reports' | 'strategies', userId?: string): Promise<LibraryDocument[]>;
  updateLibraryDocument(id: string, document: Partial<InsertLibraryDocument>): Promise<LibraryDocument>;
  deleteLibraryDocument(id: string): Promise<void>;

  // Account task operations
  createAccountTask(task: InsertAccountTask): Promise<AccountTask>;
  getAccountTask(id: string): Promise<AccountTask | undefined>;
  getTasksByIndividualAccount(accountId: string): Promise<AccountTask[]>;
  getTasksByCorporateAccount(accountId: string): Promise<AccountTask[]>;
  getTasksByJointAccount(accountId: string): Promise<AccountTask[]>;
  getAllTasksForUser(userId: string): Promise<any[]>;
  getTasksBySymbol(userId: string, symbol: string): Promise<AccountTask[]>;
  updateAccountTask(id: string, task: Partial<InsertAccountTask>): Promise<AccountTask>;
  deleteAccountTask(id: string): Promise<void>;
  archiveAccountTask(id: string): Promise<AccountTask>;
  restoreAccountTask(id: string): Promise<AccountTask>;
  getArchivedTasksForUser(userId: string): Promise<any[]>;
  permanentlyDeleteArchivedTasks(olderThanDays: number): Promise<number>;
  completeAccountTask(id: string): Promise<AccountTask>;

  // Account audit log operations
  createAuditLogEntry(entry: InsertAccountAuditLog): Promise<AccountAuditLog>;
  getAuditLogByIndividualAccount(accountId: string, limit?: number): Promise<AccountAuditLog[]>;
  getAuditLogByCorporateAccount(accountId: string, limit?: number): Promise<AccountAuditLog[]>;
  getAuditLogByJointAccount(accountId: string, limit?: number): Promise<AccountAuditLog[]>;

  // Investment revenue operations
  createInvestmentRevenue(data: InsertInvestmentRevenue): Promise<InvestmentRevenue>;
  getInvestmentRevenueByUser(userId: string): Promise<InvestmentRevenue[]>;
  getInvestmentRevenueById(id: string): Promise<InvestmentRevenue | undefined>;
  updateInvestmentRevenue(id: string, data: UpdateInvestmentRevenue): Promise<InvestmentRevenue>;
  deleteInvestmentRevenue(id: string): Promise<void>;

  // Milestones operations
  createMilestone(data: InsertMilestone): Promise<Milestone>;
  getMilestonesByUser(userId: string, milestoneType?: 'business' | 'personal'): Promise<Milestone[]>;
  getMilestoneById(id: string): Promise<Milestone | undefined>;
  updateMilestone(id: string, data: UpdateMilestone): Promise<Milestone>;
  deleteMilestone(id: string): Promise<void>;

  // Trading Journal Entry operations
  createJournalEntry(userId: string, data: InsertTradingJournalEntry): Promise<TradingJournalEntry>;
  getJournalEntries(
    userId: string,
    filters?: {
      symbol?: string;
      tagIds?: string[];
      startDate?: Date;
      endDate?: Date;
      outcome?: "pending" | "win" | "loss" | "partial";
      search?: string;
    }
  ): Promise<TradingJournalEntry[]>;
  getJournalEntryById(id: string): Promise<TradingJournalEntry | undefined>;
  getJournalEntryWithDetails(id: string): Promise<TradingJournalEntryWithDetails | undefined>;
  updateJournalEntry(id: string, data: UpdateTradingJournalEntry): Promise<TradingJournalEntry>;
  deleteJournalEntry(id: string): Promise<void>;

  // Trading Journal Image operations
  addJournalImage(data: InsertTradingJournalImage): Promise<TradingJournalImage>;
  getJournalImages(entryId: string): Promise<TradingJournalImage[]>;
  updateJournalImageSortOrder(imageId: string, sortOrder: number): Promise<TradingJournalImage>;
  removeJournalImage(imageId: string): Promise<void>;

  // Trading Journal Tag operations
  createTag(userId: string, data: InsertTradingJournalTag): Promise<TradingJournalTag>;
  getTags(userId: string): Promise<TradingJournalTag[]>;
  getTagById(id: string): Promise<TradingJournalTag | undefined>;
  linkTagToEntry(entryId: string, tagId: string): Promise<TradingJournalEntryTag>;
  unlinkTagFromEntry(entryId: string, tagId: string): Promise<void>;
  getEntryTags(entryId: string): Promise<(TradingJournalEntryTag & { tag: TradingJournalTag })[]>;
  updateEntryTags(entryId: string, tagIds: string[]): Promise<void>;

  // Trading Journal Analytics
  getJournalAnalytics(userId: string): Promise<{
    totalEntries: number;
    winCount: number;
    lossCount: number;
    pendingCount: number;
    partialCount: number;
    totalRealizedPnL: number;
    averageConvictionScore: number;
    entriesBySymbol: Array<{ symbol: string; count: number }>;
    entriesByTag: Array<{ tagId: string; tagName: string; count: number }>;
    entriesByOutcome: Array<{ outcome: string; count: number }>;
  }>;

  // Prospect operations
  createProspect(data: InsertProspect): Promise<Prospect>;
  getProspects(userId?: string): Promise<Prospect[]>;
  getProspectById(id: string): Promise<Prospect | undefined>;
  updateProspect(id: string, data: UpdateProspect): Promise<Prospect>;
  deleteProspect(id: string): Promise<void>;
  getProspectsByStatus(status: string): Promise<Prospect[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User Settings operations
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async createUserSettings(settingsData: InsertUserSettings): Promise<UserSettings> {
    const [settings] = await db.insert(userSettings).values(settingsData).returning();
    return settings;
  }

  async updateUserSettings(userId: string, settingsData: Partial<InsertUserSettings>): Promise<UserSettings> {
    const [settings] = await db
      .update(userSettings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return settings;
  }

  async getUserSettingsByWebhookSecret(secret: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.webhookSecret, secret));
    return settings;
  }

  async regenerateWebhookSecret(userId: string): Promise<UserSettings> {
    const newSecret = crypto.randomUUID().replace(/-/g, '');
    const [settings] = await db
      .update(userSettings)
      .set({ webhookSecret: newSecret, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return settings;
  }

  // Household Sharing operations
  async shareHousehold(shareData: InsertHouseholdShare): Promise<HouseholdShare> {
    const [share] = await db.insert(householdShares).values(shareData).returning();
    return share;
  }

  async getHouseholdShares(householdId: string): Promise<(HouseholdShare & { sharedWithUser: User })[]> {
    const shares = await db
      .select({
        id: householdShares.id,
        householdId: householdShares.householdId,
        sharedWithUserId: householdShares.sharedWithUserId,
        accessLevel: householdShares.accessLevel,
        sharedAt: householdShares.sharedAt,
        sharedWithUser: users,
      })
      .from(householdShares)
      .innerJoin(users, eq(householdShares.sharedWithUserId, users.id))
      .where(eq(householdShares.householdId, householdId));
    return shares;
  }

  async removeHouseholdShare(householdId: string, sharedWithUserId: string): Promise<void> {
    await db
      .delete(householdShares)
      .where(and(
        eq(householdShares.householdId, householdId),
        eq(householdShares.sharedWithUserId, sharedWithUserId)
      ));
  }

  async getSharedHouseholdsForUser(userId: string): Promise<string[]> {
    const shares = await db
      .select({ householdId: householdShares.householdId })
      .from(householdShares)
      .where(eq(householdShares.sharedWithUserId, userId));
    return shares.map(s => s.householdId);
  }

  async canUserAccessHousehold(userId: string, householdId: string): Promise<boolean> {
    // Check if user owns the household
    const [household] = await db
      .select()
      .from(households)
      .where(and(eq(households.id, householdId), eq(households.userId, userId)));
    if (household) return true;

    // Check if household is shared with user
    const [share] = await db
      .select()
      .from(householdShares)
      .where(and(
        eq(householdShares.householdId, householdId),
        eq(householdShares.sharedWithUserId, userId)
      ));
    return !!share;
  }

  async canUserEditHousehold(userId: string, householdId: string): Promise<boolean> {
    // Check if user owns the household (owners have full edit access)
    const [household] = await db
      .select()
      .from(households)
      .where(and(eq(households.id, householdId), eq(households.userId, userId)));
    if (household) return true;

    // Check if household is shared with user with editor access
    const [share] = await db
      .select()
      .from(householdShares)
      .where(and(
        eq(householdShares.householdId, householdId),
        eq(householdShares.sharedWithUserId, userId),
        eq(householdShares.accessLevel, 'editor')
      ));
    return !!share;
  }

  async getHouseholdIdFromAccount(accountType: 'individual' | 'corporate' | 'joint', accountId: string): Promise<string | null> {
    if (accountType === 'individual') {
      const [account] = await db.select().from(individualAccounts).where(eq(individualAccounts.id, accountId));
      if (!account) return null;
      const [individual] = await db.select().from(individuals).where(eq(individuals.id, account.individualId));
      return individual?.householdId || null;
    } else if (accountType === 'corporate') {
      const [account] = await db.select().from(corporateAccounts).where(eq(corporateAccounts.id, accountId));
      if (!account) return null;
      const [corporation] = await db.select().from(corporations).where(eq(corporations.id, account.corporationId));
      return corporation?.householdId || null;
    } else if (accountType === 'joint') {
      const [account] = await db.select().from(jointAccounts).where(eq(jointAccounts.id, accountId));
      return account?.householdId || null;
    }
    return null;
  }

  async getHouseholdIdFromPosition(positionId: string): Promise<string | null> {
    const [position] = await db.select().from(positions).where(eq(positions.id, positionId));
    if (!position) return null;

    if (position.individualAccountId) {
      return this.getHouseholdIdFromAccount('individual', position.individualAccountId);
    } else if (position.corporateAccountId) {
      return this.getHouseholdIdFromAccount('corporate', position.corporateAccountId);
    } else if (position.jointAccountId) {
      return this.getHouseholdIdFromAccount('joint', position.jointAccountId);
    }
    return null;
  }

  async getHouseholdIdFromTrade(tradeId: string): Promise<string | null> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, tradeId));
    if (!trade) return null;

    if (trade.individualAccountId) {
      return this.getHouseholdIdFromAccount('individual', trade.individualAccountId);
    } else if (trade.corporateAccountId) {
      return this.getHouseholdIdFromAccount('corporate', trade.corporateAccountId);
    } else if (trade.jointAccountId) {
      return this.getHouseholdIdFromAccount('joint', trade.jointAccountId);
    }
    return null;
  }

  async getHouseholdIdFromTargetAllocation(allocationId: string): Promise<string | null> {
    const [allocation] = await db.select().from(accountTargetAllocations).where(eq(accountTargetAllocations.id, allocationId));
    if (!allocation) return null;

    if (allocation.individualAccountId) {
      return this.getHouseholdIdFromAccount('individual', allocation.individualAccountId);
    } else if (allocation.corporateAccountId) {
      return this.getHouseholdIdFromAccount('corporate', allocation.corporateAccountId);
    } else if (allocation.jointAccountId) {
      return this.getHouseholdIdFromAccount('joint', allocation.jointAccountId);
    }
    return null;
  }

  // Household operations
  async checkHouseholdNameExists(name: string, userId: string, excludeId?: string): Promise<boolean> {
    const normalizedName = name.trim().toLowerCase();
    const userHouseholds = await db
      .select()
      .from(households)
      .where(eq(households.userId, userId));
    
    return userHouseholds.some(h => 
      h.name.trim().toLowerCase() === normalizedName && 
      (excludeId ? h.id !== excludeId : true)
    );
  }

  async createHousehold(householdData: InsertHousehold & { userId?: string }): Promise<Household> {
    const [household] = await db.insert(households).values(householdData).returning();
    return household;
  }

  async getHousehold(id: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.id, id));
    return household;
  }

  async getAllHouseholds(userId?: string): Promise<Household[]> {
    if (!userId) {
      // No user filter - return all active households (excluding archived)
      return await db.select().from(households).where(isNull(households.deletedAt)).orderBy(desc(households.createdAt));
    }

    // Get households owned by user (active only)
    const ownedHouseholds = await db
      .select()
      .from(households)
      .where(and(eq(households.userId, userId), isNull(households.deletedAt)))
      .orderBy(desc(households.createdAt));

    // Get households shared with user (active only)
    const sharedHouseholdIds = await this.getSharedHouseholdsForUser(userId);
    
    if (sharedHouseholdIds.length === 0) {
      return ownedHouseholds;
    }

    const sharedHouseholds = await db
      .select()
      .from(households)
      .where(and(inArray(households.id, sharedHouseholdIds), isNull(households.deletedAt)))
      .orderBy(desc(households.createdAt));

    // Combine and deduplicate
    const allHouseholds = [...ownedHouseholds];
    for (const shared of sharedHouseholds) {
      if (!allHouseholds.find(h => h.id === shared.id)) {
        allHouseholds.push(shared);
      }
    }

    return allHouseholds.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getAllArchivedHouseholds(userId?: string): Promise<Household[]> {
    if (!userId) {
      return await db.select().from(households).where(isNotNull(households.deletedAt)).orderBy(desc(households.deletedAt));
    }

    // Get archived households owned by user
    const ownedArchived = await db
      .select()
      .from(households)
      .where(and(eq(households.userId, userId), isNotNull(households.deletedAt)))
      .orderBy(desc(households.deletedAt));

    // Get shared archived households (optionally)
    return ownedArchived;
  }

  async getAllHouseholdsWithDetails(userId?: string): Promise<HouseholdWithDetails[]> {
    // Fetch all households (filtered by user if provided)
    const allHouseholds = await this.getAllHouseholds(userId);
    
    if (allHouseholds.length === 0) {
      return [];
    }

    const householdIds = allHouseholds.map(h => h.id);

    // Batch fetch all individuals for all households
    const allIndividuals = await db
      .select()
      .from(individuals)
      .where(inArray(individuals.householdId, householdIds));

    const individualIds = allIndividuals.map(i => i.id);

    // Batch fetch all individual accounts
    const allIndividualAccounts = individualIds.length > 0
      ? await db
          .select()
          .from(individualAccounts)
          .where(inArray(individualAccounts.individualId, individualIds))
      : [];

    // Batch fetch all corporations
    const allCorporations = await db
      .select()
      .from(corporations)
      .where(inArray(corporations.householdId, householdIds));

    const corporationIds = allCorporations.map(c => c.id);

    // Batch fetch all corporate accounts
    const allCorporateAccounts = corporationIds.length > 0
      ? await db
          .select()
          .from(corporateAccounts)
          .where(inArray(corporateAccounts.corporationId, corporationIds))
      : [];

    // Batch fetch all joint accounts
    const allJointAccounts = await db
      .select()
      .from(jointAccounts)
      .where(inArray(jointAccounts.householdId, householdIds));

    const jointAccountIds = allJointAccounts.map(ja => ja.id);

    // Batch fetch all joint account ownerships
    const allOwnerships = jointAccountIds.length > 0
      ? await db
          .select({
            jointAccountId: jointAccountOwnership.jointAccountId,
            individualId: jointAccountOwnership.individualId,
            individual: individuals
          })
          .from(jointAccountOwnership)
          .innerJoin(individuals, eq(jointAccountOwnership.individualId, individuals.id))
          .where(inArray(jointAccountOwnership.jointAccountId, jointAccountIds))
      : [];

    // Group data by household with calculated balances
    return await Promise.all(
      allHouseholds.map(async (household) => {
        // Get individuals for this household
        const householdIndividuals = allIndividuals.filter(i => i.householdId === household.id);
        
        const individualsWithAccounts = await Promise.all(
          householdIndividuals.map(async (individual) => {
            const accounts = allIndividualAccounts.filter(a => a.individualId === individual.id);
            const accountsWithBalance = await Promise.all(
              accounts.map(async (account) => {
                const calculatedBalance = await this.calculateIndividualAccountBalance(account.id);
                return {
                  ...account,
                  calculatedBalance: calculatedBalance.toString(),
                };
              })
            );
            return {
              ...individual,
              accounts: accountsWithBalance
            };
          })
        );

        // Get corporations for this household
        const householdCorporations = allCorporations.filter(c => c.householdId === household.id);
        
        const corporationsWithAccounts = await Promise.all(
          householdCorporations.map(async (corporation) => {
            const accounts = allCorporateAccounts.filter(a => a.corporationId === corporation.id);
            const accountsWithBalance = await Promise.all(
              accounts.map(async (account) => {
                const calculatedBalance = await this.calculateCorporateAccountBalance(account.id);
                return {
                  ...account,
                  calculatedBalance: calculatedBalance.toString(),
                };
              })
            );
            return {
              ...corporation,
              accounts: accountsWithBalance
            };
          })
        );

        // Get joint accounts for this household
        const householdJointAccounts = allJointAccounts.filter(ja => ja.householdId === household.id);
        
        const jointAccountsWithOwners = await Promise.all(
          householdJointAccounts.map(async (jointAccount) => {
            const owners = allOwnerships
              .filter(o => o.jointAccountId === jointAccount.id)
              .map(o => ({
                id: o.individual.id,
                name: o.individual.name,
                initials: o.individual.name.split(' ').map(n => n[0]).join('').toUpperCase(),
                email: null,
              }));
            const calculatedBalance = await this.calculateJointAccountBalance(jointAccount.id);
            return {
              ...jointAccount,
              calculatedBalance: calculatedBalance.toString(),
              owners
            };
          })
        );

        return {
          ...household,
          individuals: individualsWithAccounts,
          corporations: corporationsWithAccounts,
          jointAccounts: jointAccountsWithOwners
        };
      })
    );
  }

  async getHouseholdWithDetails(id: string): Promise<HouseholdWithDetails | null> {
    const household = await this.getHousehold(id);
    if (!household) {
      return null;
    }

    // Fetch all individuals for this household
    const individualsData = await this.getIndividualsByHousehold(id);
    
    // Fetch accounts for each individual with calculated balances
    const individualsWithAccounts = await Promise.all(
      individualsData.map(async (individual) => {
        const accounts = await this.getIndividualAccountsByIndividual(individual.id);
        const accountsWithBalance = await Promise.all(
          accounts.map(async (account) => {
            const calculatedBalance = await this.calculateIndividualAccountBalance(account.id);
            return {
              ...account,
              calculatedBalance: calculatedBalance.toString(),
            };
          })
        );
        return {
          ...individual,
          accounts: accountsWithBalance
        };
      })
    );

    // Fetch all corporations for this household
    const corporationsData = await this.getCorporationsByHousehold(id);
    
    // Fetch accounts for each corporation with calculated balances
    const corporationsWithAccounts = await Promise.all(
      corporationsData.map(async (corporation) => {
        const accounts = await this.getCorporateAccountsByCorporation(corporation.id);
        const accountsWithBalance = await Promise.all(
          accounts.map(async (account) => {
            const calculatedBalance = await this.calculateCorporateAccountBalance(account.id);
            return {
              ...account,
              calculatedBalance: calculatedBalance.toString(),
            };
          })
        );
        return {
          ...corporation,
          accounts: accountsWithBalance
        };
      })
    );

    // Fetch all joint accounts for this household
    const jointAccountsData = await this.getJointAccountsByHousehold(id);
    
    // Fetch full owner details for each joint account with calculated balances
    const jointAccountsWithOwners = await Promise.all(
      jointAccountsData.map(async (jointAccount) => {
        const owners = await this.getJointAccountOwners(jointAccount.id);
        const calculatedBalance = await this.calculateJointAccountBalance(jointAccount.id);
        return {
          ...jointAccount,
          calculatedBalance: calculatedBalance.toString(),
          owners: owners.map(owner => ({
            id: owner.id,
            name: owner.name,
            initials: owner.name.split(' ').map(n => n[0]).join('').toUpperCase(),
            email: null,
          }))
        };
      })
    );

    return {
      ...household,
      individuals: individualsWithAccounts,
      corporations: corporationsWithAccounts,
      jointAccounts: jointAccountsWithOwners
    };
  }

  async updateHousehold(id: string, householdData: Partial<InsertHousehold>): Promise<Household> {
    const [household] = await db
      .update(households)
      .set({ ...householdData, updatedAt: new Date() })
      .where(eq(households.id, id))
      .returning();
    return household;
  }

  async deleteHousehold(id: string): Promise<void> {
    // Soft delete - mark as archived instead of actually deleting
    await db
      .update(households)
      .set({ deletedAt: new Date() })
      .where(eq(households.id, id));
  }

  async restoreHousehold(id: string): Promise<Household> {
    const [household] = await db
      .update(households)
      .set({ deletedAt: null })
      .where(eq(households.id, id))
      .returning();
    return household;
  }

  // Individual operations
  async createIndividual(individualData: InsertIndividual): Promise<Individual> {
    const [individual] = await db.insert(individuals).values(individualData).returning();
    return individual;
  }

  async getIndividual(id: string): Promise<Individual | undefined> {
    const [individual] = await db.select().from(individuals).where(eq(individuals.id, id));
    return individual;
  }

  async getIndividualsByHousehold(householdId: string): Promise<Individual[]> {
    return await db.select().from(individuals).where(eq(individuals.householdId, householdId));
  }

  async updateIndividual(id: string, individualData: Partial<InsertIndividual>): Promise<Individual> {
    const [individual] = await db
      .update(individuals)
      .set({ ...individualData, updatedAt: new Date() })
      .where(eq(individuals.id, id))
      .returning();
    return individual;
  }

  async deleteIndividual(id: string): Promise<void> {
    await db.delete(individuals).where(eq(individuals.id, id));
  }

  // Corporation operations
  async createCorporation(corporationData: InsertCorporation): Promise<Corporation> {
    const [corporation] = await db.insert(corporations).values(corporationData).returning();
    return corporation;
  }

  async getCorporation(id: string): Promise<Corporation | undefined> {
    const [corporation] = await db.select().from(corporations).where(eq(corporations.id, id));
    return corporation;
  }

  async getCorporationsByHousehold(householdId: string): Promise<Corporation[]> {
    return await db.select().from(corporations).where(eq(corporations.householdId, householdId));
  }

  async updateCorporation(id: string, corporationData: Partial<InsertCorporation>): Promise<Corporation> {
    const [corporation] = await db
      .update(corporations)
      .set({ ...corporationData, updatedAt: new Date() })
      .where(eq(corporations.id, id))
      .returning();
    return corporation;
  }

  async deleteCorporation(id: string): Promise<void> {
    await db.delete(corporations).where(eq(corporations.id, id));
  }

  // Individual account operations
  async createIndividualAccount(accountData: InsertIndividualAccount): Promise<IndividualAccount> {
    const [account] = await db.insert(individualAccounts).values(accountData).returning();
    return account;
  }

  async getIndividualAccount(id: string): Promise<IndividualAccount | undefined> {
    const [account] = await db.select().from(individualAccounts).where(eq(individualAccounts.id, id));
    return account;
  }

  async getIndividualAccountsByIndividual(individualId: string): Promise<IndividualAccount[]> {
    return await db.select().from(individualAccounts).where(eq(individualAccounts.individualId, individualId));
  }

  async updateIndividualAccount(id: string, accountData: Partial<InsertIndividualAccount>): Promise<IndividualAccount> {
    const [account] = await db
      .update(individualAccounts)
      .set({ ...accountData, updatedAt: new Date() })
      .where(eq(individualAccounts.id, id))
      .returning();
    return account;
  }

  async deleteIndividualAccount(id: string): Promise<void> {
    await db.delete(individualAccounts).where(eq(individualAccounts.id, id));
  }

  // Corporate account operations
  async createCorporateAccount(accountData: InsertCorporateAccount): Promise<CorporateAccount> {
    const [account] = await db.insert(corporateAccounts).values(accountData).returning();
    return account;
  }

  async getCorporateAccount(id: string): Promise<CorporateAccount | undefined> {
    const [account] = await db.select().from(corporateAccounts).where(eq(corporateAccounts.id, id));
    return account;
  }

  async getCorporateAccountsByCorporation(corporationId: string): Promise<CorporateAccount[]> {
    return await db.select().from(corporateAccounts).where(eq(corporateAccounts.corporationId, corporationId));
  }

  async updateCorporateAccount(id: string, accountData: Partial<InsertCorporateAccount>): Promise<CorporateAccount> {
    const [account] = await db
      .update(corporateAccounts)
      .set({ ...accountData, updatedAt: new Date() })
      .where(eq(corporateAccounts.id, id))
      .returning();
    return account;
  }

  async deleteCorporateAccount(id: string): Promise<void> {
    await db.delete(corporateAccounts).where(eq(corporateAccounts.id, id));
  }

  // Joint account operations
  async createJointAccount(jointAccountData: InsertJointAccount): Promise<JointAccount> {
    const [jointAccount] = await db.insert(jointAccounts).values(jointAccountData).returning();
    return jointAccount;
  }

  async getJointAccount(id: string): Promise<JointAccount | undefined> {
    const [jointAccount] = await db.select().from(jointAccounts).where(eq(jointAccounts.id, id));
    return jointAccount;
  }

  async getJointAccountsByHousehold(householdId: string): Promise<JointAccount[]> {
    return await db.select().from(jointAccounts).where(eq(jointAccounts.householdId, householdId));
  }

  async updateJointAccount(id: string, jointAccountData: Partial<InsertJointAccount>): Promise<JointAccount> {
    const [jointAccount] = await db
      .update(jointAccounts)
      .set({ ...jointAccountData, updatedAt: new Date() })
      .where(eq(jointAccounts.id, id))
      .returning();
    return jointAccount;
  }

  async deleteJointAccount(id: string): Promise<void> {
    await db.delete(jointAccounts).where(eq(jointAccounts.id, id));
  }

  // Joint account ownership operations
  async addJointAccountOwner(ownershipData: InsertJointAccountOwnership): Promise<JointAccountOwnership> {
    const [ownership] = await db.insert(jointAccountOwnership).values(ownershipData).returning();
    return ownership;
  }

  async getJointAccountOwners(jointAccountId: string): Promise<Individual[]> {
    const ownerships = await db
      .select({ individual: individuals })
      .from(jointAccountOwnership)
      .innerJoin(individuals, eq(jointAccountOwnership.individualId, individuals.id))
      .where(eq(jointAccountOwnership.jointAccountId, jointAccountId));
    
    return ownerships.map(o => o.individual);
  }

  async removeJointAccountOwner(jointAccountId: string, individualId: string): Promise<void> {
    await db
      .delete(jointAccountOwnership)
      .where(
        eq(jointAccountOwnership.jointAccountId, jointAccountId) &&
        eq(jointAccountOwnership.individualId, individualId)
      );
  }

  // Position operations
  async createPosition(positionData: InsertPosition): Promise<Position> {
    // If currentPrice is not provided, default it to entryPrice
    const dataWithDefaults = {
      ...positionData,
      currentPrice: positionData.currentPrice || positionData.entryPrice,
    };
    
    // Check if this is a cash position - aggregate with existing cash
    const cashSymbols = ['CASH', 'CAD', 'USD', 'MONEY MARKET'];
    const symbolUpper = dataWithDefaults.symbol?.toUpperCase() || '';
    const isCashPosition = cashSymbols.includes(symbolUpper);
    
    if (isCashPosition) {
      // Find existing cash position in the same account
      let existingPositions: Position[] = [];
      
      if (dataWithDefaults.individualAccountId) {
        existingPositions = await db.select().from(positions)
          .where(eq(positions.individualAccountId, dataWithDefaults.individualAccountId));
      } else if (dataWithDefaults.corporateAccountId) {
        existingPositions = await db.select().from(positions)
          .where(eq(positions.corporateAccountId, dataWithDefaults.corporateAccountId));
      } else if (dataWithDefaults.jointAccountId) {
        existingPositions = await db.select().from(positions)
          .where(eq(positions.jointAccountId, dataWithDefaults.jointAccountId));
      }
      
      // Find existing cash position with the same symbol
      const existingCash = existingPositions.find(p => 
        p.symbol?.toUpperCase() === symbolUpper
      );
      
      if (existingCash) {
        // Aggregate: add new quantity to existing cash position
        const existingQty = parseFloat(existingCash.quantity || '0');
        const newQty = parseFloat(dataWithDefaults.quantity || '0');
        const aggregatedQty = (existingQty + newQty).toString();
        
        const [updatedPosition] = await db
          .update(positions)
          .set({ quantity: aggregatedQty, updatedAt: new Date() })
          .where(eq(positions.id, existingCash.id))
          .returning();
        return updatedPosition;
      }
    }
    
    // For non-cash positions or if no existing cash, create new position
    const [position] = await db.insert(positions).values(dataWithDefaults).returning();
    return position;
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position;
  }

  async getPositionsByIndividualAccount(accountId: string): Promise<Position[]> {
    return await db.select().from(positions)
      .where(eq(positions.individualAccountId, accountId))
      .orderBy(positions.symbol);
  }

  async getPositionsByCorporateAccount(accountId: string): Promise<Position[]> {
    return await db.select().from(positions)
      .where(eq(positions.corporateAccountId, accountId))
      .orderBy(positions.symbol);
  }

  async getPositionsByJointAccount(accountId: string): Promise<Position[]> {
    return await db.select().from(positions)
      .where(eq(positions.jointAccountId, accountId))
      .orderBy(positions.symbol);
  }

  async getPositionsBySymbol(symbol: string): Promise<Position[]> {
    // Normalize the input symbol (remove exchange suffixes and dashes for crypto)
    const normalizedSymbol = symbol.toUpperCase()
      .replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '') // Remove exchange suffixes
      .replace(/-/g, ''); // Remove dashes (for crypto like BTC-USD -> BTCUSD)
    
    // Get all positions and filter for matching symbols (case-insensitive, normalized)
    const allPositions = await db.select().from(positions);
    return allPositions.filter(pos => {
      const normalizedPosSymbol = pos.symbol.toUpperCase()
        .replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '') // Remove exchange suffixes
        .replace(/-/g, ''); // Remove dashes (for crypto like BTC-USD -> BTCUSD)
      return normalizedPosSymbol === normalizedSymbol;
    });
  }

  async getAllPositionsWithAccountInfo(): Promise<Array<Position & { accountType: 'individual' | 'corporate' | 'joint'; accountId: string }>> {
    // Get all positions that belong to actual accounts (not watchlist/freelance portfolios)
    const allPositions = await db.select().from(positions)
      .where(
        or(
          isNotNull(positions.individualAccountId),
          isNotNull(positions.corporateAccountId),
          isNotNull(positions.jointAccountId)
        )
      );
    
    // Map positions with their account type and ID
    return allPositions.map(pos => {
      if (pos.individualAccountId) {
        return { ...pos, accountType: 'individual' as const, accountId: pos.individualAccountId };
      } else if (pos.corporateAccountId) {
        return { ...pos, accountType: 'corporate' as const, accountId: pos.corporateAccountId };
      } else if (pos.jointAccountId) {
        return { ...pos, accountType: 'joint' as const, accountId: pos.jointAccountId };
      }
      // This shouldn't happen given our where clause, but TypeScript needs it
      return { ...pos, accountType: 'individual' as const, accountId: '' };
    }).filter(pos => pos.accountId !== '');
  }

  async updatePosition(id: string, positionData: Partial<InsertPosition>): Promise<Position> {
    const [position] = await db
      .update(positions)
      .set({ ...positionData, updatedAt: new Date() })
      .where(eq(positions.id, id))
      .returning();
    return position;
  }

  async deletePosition(id: string): Promise<void> {
    await db.delete(positions).where(eq(positions.id, id));
  }

  async calculateIndividualAccountBalance(accountId: string): Promise<number> {
    const accountPositions = await this.getPositionsByIndividualAccount(accountId);
    return accountPositions.reduce((total, position) => {
      const quantity = parseFloat(position.quantity || '0');
      const currentPrice = parseFloat(position.currentPrice || '0');
      // Validate: ensure non-negative values and handle NaN
      if (isNaN(quantity) || isNaN(currentPrice) || quantity < 0 || currentPrice < 0) {
        console.warn(`[Balance Calculation] Invalid position values: qty=${quantity}, price=${currentPrice} for position ${position.id}`);
        return total;
      }
      return total + (quantity * currentPrice);
    }, 0);
  }

  async calculateCorporateAccountBalance(accountId: string): Promise<number> {
    const accountPositions = await this.getPositionsByCorporateAccount(accountId);
    return accountPositions.reduce((total, position) => {
      const quantity = parseFloat(position.quantity || '0');
      const currentPrice = parseFloat(position.currentPrice || '0');
      // Validate: ensure non-negative values and handle NaN
      if (isNaN(quantity) || isNaN(currentPrice) || quantity < 0 || currentPrice < 0) {
        console.warn(`[Balance Calculation] Invalid position values: qty=${quantity}, price=${currentPrice} for position ${position.id}`);
        return total;
      }
      return total + (quantity * currentPrice);
    }, 0);
  }

  async calculateJointAccountBalance(accountId: string): Promise<number> {
    const accountPositions = await this.getPositionsByJointAccount(accountId);
    return accountPositions.reduce((total, position) => {
      const quantity = parseFloat(position.quantity || '0');
      const currentPrice = parseFloat(position.currentPrice || '0');
      // Validate: ensure non-negative values and handle NaN
      if (isNaN(quantity) || isNaN(currentPrice) || quantity < 0 || currentPrice < 0) {
        console.warn(`[Balance Calculation] Invalid position values: qty=${quantity}, price=${currentPrice} for position ${position.id}`);
        return total;
      }
      return total + (quantity * currentPrice);
    }, 0);
  }

  async getWatchlistPositionsByIndividualAccount(accountId: string): Promise<Position[]> {
    const account = await this.getIndividualAccount(accountId);
    if (!account?.watchlistPortfolioId) return [];
    return await db.select().from(positions)
      .where(eq(positions.freelancePortfolioId, account.watchlistPortfolioId))
      .orderBy(positions.symbol);
  }

  async getWatchlistPositionsByCorporateAccount(accountId: string): Promise<Position[]> {
    const account = await this.getCorporateAccount(accountId);
    if (!account?.watchlistPortfolioId) return [];
    return await db.select().from(positions)
      .where(eq(positions.freelancePortfolioId, account.watchlistPortfolioId))
      .orderBy(positions.symbol);
  }

  async getWatchlistPositionsByJointAccount(accountId: string): Promise<Position[]> {
    const account = await this.getJointAccount(accountId);
    if (!account?.watchlistPortfolioId) return [];
    return await db.select().from(positions)
      .where(eq(positions.freelancePortfolioId, account.watchlistPortfolioId))
      .orderBy(positions.symbol);
  }

  async createWatchlistForAccount(accountType: 'individual' | 'corporate' | 'joint', accountId: string, portfolioName: string): Promise<FreelancePortfolio> {
    // Create a new watchlist portfolio
    const watchlistPortfolio = await this.createFreelancePortfolio({
      name: portfolioName,
      portfolioType: 'watchlist'
    });

    // Link it to the account
    if (accountType === 'individual') {
      await db.update(individualAccounts).set({ watchlistPortfolioId: watchlistPortfolio.id }).where(eq(individualAccounts.id, accountId));
    } else if (accountType === 'corporate') {
      await db.update(corporateAccounts).set({ watchlistPortfolioId: watchlistPortfolio.id }).where(eq(corporateAccounts.id, accountId));
    } else if (accountType === 'joint') {
      await db.update(jointAccounts).set({ watchlistPortfolioId: watchlistPortfolio.id }).where(eq(jointAccounts.id, accountId));
    }

    return watchlistPortfolio;
  }

  // Alert operations
  async createAlert(alertData: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(alertData).returning();
    return alert;
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }

  async getAllAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async getAlertsByStatus(status: "pending" | "executed" | "dismissed"): Promise<Alert[]> {
    return await db.select().from(alerts).where(eq(alerts.status, status)).orderBy(desc(alerts.createdAt));
  }

  async updateAlert(id: string, alertData: UpdateAlert): Promise<Alert> {
    const [alert] = await db
      .update(alerts)
      .set({ ...alertData, updatedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  async deleteAlert(id: string): Promise<void> {
    await db.delete(alerts).where(eq(alerts.id, id));
  }

  // Trade operations
  async createTrade(tradeData: InsertTrade): Promise<Trade> {
    const [trade] = await db.insert(trades).values(tradeData).returning();
    return trade;
  }

  async getTrade(id: string): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade;
  }

  async getAllTrades(): Promise<Trade[]> {
    return await db.select().from(trades).orderBy(desc(trades.executedAt));
  }

  // Universal Holdings operations
  async createUniversalHolding(holdingData: InsertUniversalHolding): Promise<UniversalHolding> {
    const [holding] = await db.insert(universalHoldings).values(holdingData).returning();
    return holding;
  }

  async getUniversalHolding(id: string): Promise<UniversalHolding | undefined> {
    const [holding] = await db.select().from(universalHoldings).where(eq(universalHoldings.id, id));
    return holding;
  }

  async getUniversalHoldingByTicker(ticker: string): Promise<UniversalHolding | undefined> {
    // First try exact match
    const [exactMatch] = await db.select().from(universalHoldings).where(eq(universalHoldings.ticker, ticker));
    if (exactMatch) return exactMatch;
    
    // Normalize ticker - remove any existing suffix first
    const baseTicker = ticker.replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '').toUpperCase();
    
    // Try common Canadian exchange suffixes if no exact match
    const suffixes = ['.TO', '.V', '.CN', '.NE', ''];
    for (const suffix of suffixes) {
      const tickerWithSuffix = baseTicker + suffix;
      if (tickerWithSuffix !== ticker) { // Don't re-check exact match
        const [holding] = await db.select().from(universalHoldings).where(eq(universalHoldings.ticker, tickerWithSuffix));
        if (holding) return holding;
      }
    }
    
    return undefined;
  }

  async getAllUniversalHoldings(): Promise<UniversalHolding[]> {
    return await db.select().from(universalHoldings).orderBy(universalHoldings.ticker);
  }

  async updateUniversalHolding(id: string, holdingData: Partial<InsertUniversalHolding>): Promise<UniversalHolding> {
    const [holding] = await db
      .update(universalHoldings)
      .set({ ...holdingData, updatedAt: new Date() })
      .where(eq(universalHoldings.id, id))
      .returning();
    return holding;
  }

  async deleteUniversalHolding(id: string): Promise<void> {
    await db.delete(universalHoldings).where(eq(universalHoldings.id, id));
  }

  // Planned Portfolio operations
  async createPlannedPortfolio(portfolioData: InsertPlannedPortfolio): Promise<PlannedPortfolio> {
    const [portfolio] = await db.insert(plannedPortfolios).values(portfolioData).returning();
    return portfolio;
  }

  async getPlannedPortfolio(id: string): Promise<PlannedPortfolio | undefined> {
    const [portfolio] = await db.select().from(plannedPortfolios).where(eq(plannedPortfolios.id, id));
    return portfolio;
  }

  async getPlannedPortfolioWithAllocations(id: string): Promise<PlannedPortfolioWithAllocations | null> {
    const portfolio = await this.getPlannedPortfolio(id);
    if (!portfolio) return null;

    const allocations = await db
      .select()
      .from(plannedPortfolioAllocations)
      .where(eq(plannedPortfolioAllocations.plannedPortfolioId, id));

    const allocationsWithHoldings = await Promise.all(
      allocations.map(async (allocation) => {
        const holding = await this.getUniversalHolding(allocation.universalHoldingId);
        return {
          ...allocation,
          holding: holding!,
        };
      })
    );

    return {
      ...portfolio,
      allocations: allocationsWithHoldings,
    };
  }

  async getAllPlannedPortfolios(userId?: string): Promise<PlannedPortfolio[]> {
    if (userId) {
      return await db.select().from(plannedPortfolios)
        .where(eq(plannedPortfolios.userId, userId))
        .orderBy(plannedPortfolios.sortOrder, plannedPortfolios.name);
    }
    return await db.select().from(plannedPortfolios).orderBy(plannedPortfolios.sortOrder, plannedPortfolios.name);
  }

  async reorderPlannedPortfolios(orderedIds: string[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(plannedPortfolios)
          .set({ sortOrder: index })
          .where(eq(plannedPortfolios.id, id))
      )
    );
  }

  async getAllPlannedPortfoliosWithAllocations(userId?: string): Promise<PlannedPortfolioWithAllocations[]> {
    const portfolios = await this.getAllPlannedPortfolios(userId);
    
    const allAllocations = await db.select().from(plannedPortfolioAllocations);
    const allHoldings = await this.getAllUniversalHoldings();
    
    const holdingsMap = new Map(allHoldings.map(h => [h.id, h]));

    return portfolios.map(portfolio => {
      const allocations = allAllocations
        .filter(a => a.plannedPortfolioId === portfolio.id)
        .map(allocation => ({
          ...allocation,
          holding: holdingsMap.get(allocation.universalHoldingId)!,
        }));

      return {
        ...portfolio,
        allocations,
      };
    });
  }

  async updatePlannedPortfolio(id: string, portfolioData: Partial<InsertPlannedPortfolio>): Promise<PlannedPortfolio> {
    const [portfolio] = await db
      .update(plannedPortfolios)
      .set({ ...portfolioData, updatedAt: new Date() })
      .where(eq(plannedPortfolios.id, id))
      .returning();
    return portfolio;
  }

  async deletePlannedPortfolio(id: string): Promise<void> {
    await db.delete(plannedPortfolios).where(eq(plannedPortfolios.id, id));
  }

  // Planned Portfolio Allocation operations
  async createPlannedPortfolioAllocation(allocationData: InsertPlannedPortfolioAllocation): Promise<PlannedPortfolioAllocation> {
    const [allocation] = await db.insert(plannedPortfolioAllocations).values(allocationData).returning();
    return allocation;
  }

  async updatePlannedPortfolioAllocation(id: string, allocationData: Partial<InsertPlannedPortfolioAllocation>): Promise<PlannedPortfolioAllocation> {
    const [allocation] = await db
      .update(plannedPortfolioAllocations)
      .set(allocationData)
      .where(eq(plannedPortfolioAllocations.id, id))
      .returning();
    return allocation;
  }

  async deletePlannedPortfolioAllocation(id: string): Promise<void> {
    await db.delete(plannedPortfolioAllocations).where(eq(plannedPortfolioAllocations.id, id));
  }

  async getPlannedPortfolioAllocations(portfolioId: string): Promise<PlannedPortfolioAllocation[]> {
    return await db.select().from(plannedPortfolioAllocations).where(eq(plannedPortfolioAllocations.plannedPortfolioId, portfolioId));
  }

  // Freelance Portfolio operations
  async createFreelancePortfolio(portfolioData: InsertFreelancePortfolio): Promise<FreelancePortfolio> {
    const [portfolio] = await db.insert(freelancePortfolios).values(portfolioData).returning();
    return portfolio;
  }

  async getFreelancePortfolio(id: string): Promise<FreelancePortfolio | undefined> {
    const [portfolio] = await db.select().from(freelancePortfolios).where(eq(freelancePortfolios.id, id));
    return portfolio;
  }

  async getFreelancePortfolioWithAllocations(id: string): Promise<FreelancePortfolioWithAllocations | null> {
    const portfolio = await this.getFreelancePortfolio(id);
    if (!portfolio) return null;

    const allocations = await db
      .select()
      .from(freelancePortfolioAllocations)
      .where(eq(freelancePortfolioAllocations.freelancePortfolioId, id));

    const allocationsWithHoldings = await Promise.all(
      allocations.map(async (allocation) => {
        const holding = await this.getUniversalHolding(allocation.universalHoldingId);
        return {
          ...allocation,
          holding: holding!,
        };
      })
    );

    return {
      ...portfolio,
      allocations: allocationsWithHoldings,
    };
  }

  async getAllFreelancePortfolios(userId?: string): Promise<FreelancePortfolio[]> {
    if (userId) {
      return await db.select().from(freelancePortfolios)
        .where(eq(freelancePortfolios.userId, userId))
        .orderBy(freelancePortfolios.sortOrder, freelancePortfolios.name);
    }
    return await db.select().from(freelancePortfolios).orderBy(freelancePortfolios.sortOrder, freelancePortfolios.name);
  }

  async reorderFreelancePortfolios(orderedIds: string[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(freelancePortfolios)
          .set({ sortOrder: index })
          .where(eq(freelancePortfolios.id, id))
      )
    );
  }

  async getAllFreelancePortfoliosWithAllocations(userId?: string): Promise<FreelancePortfolioWithAllocations[]> {
    const portfolios = await this.getAllFreelancePortfolios(userId);
    
    const allAllocations = await db.select().from(freelancePortfolioAllocations);
    const allHoldings = await this.getAllUniversalHoldings();
    
    const holdingsMap = new Map(allHoldings.map(h => [h.id, h]));

    return portfolios.map(portfolio => {
      const allocations = allAllocations
        .filter(a => a.freelancePortfolioId === portfolio.id)
        .map(allocation => ({
          ...allocation,
          holding: holdingsMap.get(allocation.universalHoldingId)!,
        }));

      return {
        ...portfolio,
        allocations,
      };
    });
  }

  async updateFreelancePortfolio(id: string, portfolioData: Partial<InsertFreelancePortfolio>): Promise<FreelancePortfolio> {
    const [portfolio] = await db
      .update(freelancePortfolios)
      .set({ ...portfolioData, updatedAt: new Date() })
      .where(eq(freelancePortfolios.id, id))
      .returning();
    return portfolio;
  }

  async deleteFreelancePortfolio(id: string): Promise<void> {
    await db.delete(freelancePortfolios).where(eq(freelancePortfolios.id, id));
  }

  // Freelance Portfolio Allocation operations
  async createFreelancePortfolioAllocation(allocationData: InsertFreelancePortfolioAllocation): Promise<FreelancePortfolioAllocation> {
    const [allocation] = await db.insert(freelancePortfolioAllocations).values(allocationData).returning();
    return allocation;
  }

  async updateFreelancePortfolioAllocation(id: string, allocationData: Partial<InsertFreelancePortfolioAllocation>): Promise<FreelancePortfolioAllocation> {
    const [allocation] = await db
      .update(freelancePortfolioAllocations)
      .set(allocationData)
      .where(eq(freelancePortfolioAllocations.id, id))
      .returning();
    return allocation;
  }

  async deleteFreelancePortfolioAllocation(id: string): Promise<void> {
    await db.delete(freelancePortfolioAllocations).where(eq(freelancePortfolioAllocations.id, id));
  }

  async getFreelancePortfolioAllocations(portfolioId: string): Promise<FreelancePortfolioAllocation[]> {
    return await db.select().from(freelancePortfolioAllocations).where(eq(freelancePortfolioAllocations.freelancePortfolioId, portfolioId));
  }

  // Account Target Allocation operations
  async createAccountTargetAllocation(allocationData: InsertAccountTargetAllocation): Promise<AccountTargetAllocation> {
    const [allocation] = await db.insert(accountTargetAllocations).values(allocationData).returning();
    return allocation;
  }

  async updateAccountTargetAllocation(id: string, allocationData: Partial<InsertAccountTargetAllocation>): Promise<AccountTargetAllocation> {
    const [allocation] = await db
      .update(accountTargetAllocations)
      .set(allocationData)
      .where(eq(accountTargetAllocations.id, id))
      .returning();
    return allocation;
  }

  async deleteAccountTargetAllocation(id: string): Promise<void> {
    await db.delete(accountTargetAllocations).where(eq(accountTargetAllocations.id, id));
  }

  async getAccountTargetAllocationsByIndividualAccount(accountId: string): Promise<AccountTargetAllocationWithHolding[]> {
    const allocations = await db.select()
      .from(accountTargetAllocations)
      .where(eq(accountTargetAllocations.individualAccountId, accountId));
    
    const holdingsMap = new Map((await this.getAllUniversalHoldings()).map(h => [h.id, h]));
    
    return allocations.map(allocation => ({
      ...allocation,
      holding: holdingsMap.get(allocation.universalHoldingId)!,
    }));
  }

  async getAccountTargetAllocationsByCorporateAccount(accountId: string): Promise<AccountTargetAllocationWithHolding[]> {
    const allocations = await db.select()
      .from(accountTargetAllocations)
      .where(eq(accountTargetAllocations.corporateAccountId, accountId));
    
    const holdingsMap = new Map((await this.getAllUniversalHoldings()).map(h => [h.id, h]));
    
    return allocations.map(allocation => ({
      ...allocation,
      holding: holdingsMap.get(allocation.universalHoldingId)!,
    }));
  }

  async getAccountTargetAllocationsByJointAccount(accountId: string): Promise<AccountTargetAllocationWithHolding[]> {
    const allocations = await db.select()
      .from(accountTargetAllocations)
      .where(eq(accountTargetAllocations.jointAccountId, accountId));
    
    const holdingsMap = new Map((await this.getAllUniversalHoldings()).map(h => [h.id, h]));
    
    return allocations.map(allocation => ({
      ...allocation,
      holding: holdingsMap.get(allocation.universalHoldingId)!,
    }));
  }

  async deleteAllAccountTargetAllocations(accountType: 'individual' | 'corporate' | 'joint', accountId: string): Promise<void> {
    if (accountType === 'individual') {
      await db.delete(accountTargetAllocations).where(eq(accountTargetAllocations.individualAccountId, accountId));
    } else if (accountType === 'corporate') {
      await db.delete(accountTargetAllocations).where(eq(accountTargetAllocations.corporateAccountId, accountId));
    } else {
      await db.delete(accountTargetAllocations).where(eq(accountTargetAllocations.jointAccountId, accountId));
    }
  }

  async getAccountTargetAllocationsBySymbol(symbol: string): Promise<Array<AccountTargetAllocationWithHolding & { accountType: string; accountId: string }>> {
    // Normalize symbol for comparison (remove exchange suffixes and dashes for crypto)
    // This matches the normalization used in the webhook handler
    const normalizedSymbol = symbol.toUpperCase()
      .replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '') // Remove exchange suffixes
      .replace(/-/g, ''); // Remove dashes (for crypto like BTC-USD -> BTCUSD)
    
    // Get all universal holdings to find matching tickers
    const allHoldings = await this.getAllUniversalHoldings();
    const matchingHoldings = allHoldings.filter(h => {
      const normalizedTicker = (h.ticker || '').toUpperCase()
        .replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '') // Remove exchange suffixes
        .replace(/-/g, ''); // Remove dashes (for crypto like BTC-USD -> BTCUSD)
      return normalizedTicker === normalizedSymbol;
    });
    
    if (matchingHoldings.length === 0) {
      return [];
    }
    
    const holdingIds = matchingHoldings.map(h => h.id);
    const holdingsMap = new Map(allHoldings.map(h => [h.id, h]));
    
    // Get all allocations that reference these holdings
    const allocations = await db.select()
      .from(accountTargetAllocations)
      .where(sql`${accountTargetAllocations.universalHoldingId} IN (${sql.join(holdingIds.map(id => sql`${id}`), sql`, `)})`);
    
    // Map allocations with account type and ID
    return allocations.map(allocation => {
      let accountType = '';
      let accountId = '';
      
      if (allocation.individualAccountId) {
        accountType = 'individual';
        accountId = allocation.individualAccountId;
      } else if (allocation.corporateAccountId) {
        accountType = 'corporate';
        accountId = allocation.corporateAccountId;
      } else if (allocation.jointAccountId) {
        accountType = 'joint';
        accountId = allocation.jointAccountId;
      }
      
      return {
        ...allocation,
        holding: holdingsMap.get(allocation.universalHoldingId)!,
        accountType,
        accountId,
      };
    });
  }

  // Library document operations
  async createLibraryDocument(documentData: InsertLibraryDocument): Promise<LibraryDocument> {
    const [document] = await db.insert(libraryDocuments).values(documentData).returning();
    return document;
  }

  async getLibraryDocument(id: string): Promise<LibraryDocument | undefined> {
    const [document] = await db.select().from(libraryDocuments).where(eq(libraryDocuments.id, id));
    return document;
  }

  async getAllLibraryDocuments(userId?: string): Promise<LibraryDocument[]> {
    if (userId) {
      return await db.select().from(libraryDocuments)
        .where(eq(libraryDocuments.uploadedBy, userId))
        .orderBy(desc(libraryDocuments.createdAt));
    }
    return await db.select().from(libraryDocuments).orderBy(desc(libraryDocuments.createdAt));
  }

  async getLibraryDocumentsByCategory(category: 'reports' | 'strategies', userId?: string): Promise<LibraryDocument[]> {
    if (userId) {
      return await db.select().from(libraryDocuments)
        .where(and(
          eq(libraryDocuments.category, category),
          eq(libraryDocuments.uploadedBy, userId)
        ))
        .orderBy(desc(libraryDocuments.createdAt));
    }
    return await db.select().from(libraryDocuments)
      .where(eq(libraryDocuments.category, category))
      .orderBy(desc(libraryDocuments.createdAt));
  }

  async updateLibraryDocument(id: string, documentData: Partial<InsertLibraryDocument>): Promise<LibraryDocument> {
    const [document] = await db
      .update(libraryDocuments)
      .set({ ...documentData, updatedAt: new Date() })
      .where(eq(libraryDocuments.id, id))
      .returning();
    return document;
  }

  async deleteLibraryDocument(id: string): Promise<void> {
    await db.delete(libraryDocuments).where(eq(libraryDocuments.id, id));
  }

  // Account task operations
  async createAccountTask(taskData: InsertAccountTask): Promise<AccountTask> {
    const [task] = await db.insert(accountTasks).values(taskData).returning();
    return task;
  }

  async getAccountTask(id: string): Promise<AccountTask | undefined> {
    const [task] = await db.select().from(accountTasks).where(eq(accountTasks.id, id));
    return task;
  }

  async getTasksByIndividualAccount(accountId: string): Promise<AccountTask[]> {
    return await db.select()
      .from(accountTasks)
      .where(eq(accountTasks.individualAccountId, accountId))
      .orderBy(desc(accountTasks.createdAt));
  }

  async getTasksByCorporateAccount(accountId: string): Promise<AccountTask[]> {
    return await db.select()
      .from(accountTasks)
      .where(eq(accountTasks.corporateAccountId, accountId))
      .orderBy(desc(accountTasks.createdAt));
  }

  async getTasksByJointAccount(accountId: string): Promise<AccountTask[]> {
    return await db.select()
      .from(accountTasks)
      .where(eq(accountTasks.jointAccountId, accountId))
      .orderBy(desc(accountTasks.createdAt));
  }

  async getAllTasksForUser(userId: string): Promise<any[]> {
    // Get all households the user can access
    const userHouseholds = await db.select({ id: households.id })
      .from(households)
      .leftJoin(householdShares, eq(households.id, householdShares.householdId))
      .where(
        or(
          eq(households.userId, userId),
          eq(householdShares.sharedWithUserId, userId)
        )
      );
    
    const householdIds = userHouseholds.map(h => h.id);
    if (householdIds.length === 0) return [];

    // Get all individual accounts with their tasks (excluding archived)
    const individualAccountsWithTasks = await db.select({
      task: accountTasks,
      account: individualAccounts,
      individual: individuals,
      household: households,
    })
      .from(accountTasks)
      .innerJoin(individualAccounts, eq(accountTasks.individualAccountId, individualAccounts.id))
      .innerJoin(individuals, eq(individualAccounts.individualId, individuals.id))
      .innerJoin(households, eq(individuals.householdId, households.id))
      .where(and(
        inArray(households.id, householdIds),
        isNull(accountTasks.archivedAt)
      ));

    // Get all corporate accounts with their tasks (excluding archived)
    const corporateAccountsWithTasks = await db.select({
      task: accountTasks,
      account: corporateAccounts,
      corporation: corporations,
      household: households,
    })
      .from(accountTasks)
      .innerJoin(corporateAccounts, eq(accountTasks.corporateAccountId, corporateAccounts.id))
      .innerJoin(corporations, eq(corporateAccounts.corporationId, corporations.id))
      .innerJoin(households, eq(corporations.householdId, households.id))
      .where(and(
        inArray(households.id, householdIds),
        isNull(accountTasks.archivedAt)
      ));

    // Get all joint accounts with their tasks (excluding archived)
    const jointAccountsWithTasks = await db.select({
      task: accountTasks,
      account: jointAccounts,
      household: households,
    })
      .from(accountTasks)
      .innerJoin(jointAccounts, eq(accountTasks.jointAccountId, jointAccounts.id))
      .innerJoin(households, eq(jointAccounts.householdId, households.id))
      .where(and(
        inArray(households.id, householdIds),
        isNull(accountTasks.archivedAt)
      ));

    // Combine and format all tasks
    const allTasks = [
      ...individualAccountsWithTasks.map(row => ({
        ...row.task,
        accountType: 'individual' as const,
        accountId: row.account.id,
        accountNickname: row.account.nickname,
        accountTypeLabel: row.account.type,
        ownerName: row.individual.name,
        householdId: row.household.id,
        householdName: row.household.name,
      })),
      ...corporateAccountsWithTasks.map(row => ({
        ...row.task,
        accountType: 'corporate' as const,
        accountId: row.account.id,
        accountNickname: row.account.nickname,
        accountTypeLabel: row.account.type,
        ownerName: row.corporation.name,
        householdId: row.household.id,
        householdName: row.household.name,
      })),
      ...jointAccountsWithTasks.map(row => ({
        ...row.task,
        accountType: 'joint' as const,
        accountId: row.account.id,
        accountNickname: row.account.nickname,
        accountTypeLabel: row.account.type,
        ownerName: 'Joint Account',
        householdId: row.household.id,
        householdName: row.household.name,
      })),
    ];

    // Sort by due date (nulls last), then by priority, then by created date
    return allTasks.sort((a, b) => {
      // Pending/in_progress first, then completed
      if (a.status !== b.status) {
        if (a.status === 'completed') return 1;
        if (b.status === 'completed') return -1;
      }
      // Then by due date (nulls last)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // Finally by created date
      return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
    });
  }

  async getTasksBySymbol(userId: string, symbol: string): Promise<AccountTask[]> {
    // Get all households the user can access
    const userHouseholds = await db.select({ id: households.id })
      .from(households)
      .leftJoin(householdShares, eq(households.id, householdShares.householdId))
      .where(
        or(
          eq(households.userId, userId),
          eq(householdShares.sharedWithUserId, userId)
        )
      );
    
    const householdIds = userHouseholds.map(h => h.id);
    if (householdIds.length === 0) return [];

    // Get all individual accounts with their tasks
    const individualTasks = await db.select({ task: accountTasks })
      .from(accountTasks)
      .innerJoin(individualAccounts, eq(accountTasks.individualAccountId, individualAccounts.id))
      .innerJoin(individuals, eq(individualAccounts.individualId, individuals.id))
      .where(
        and(
          inArray(individuals.householdId, householdIds),
          or(
            ilike(accountTasks.title, `TradingView BUY Alert: ${symbol}`),
            ilike(accountTasks.title, `TradingView SELL Alert: ${symbol}`)
          ),
          isNull(accountTasks.archivedAt)
        )
      );

    // Get all corporate accounts with their tasks
    const corporateTasks = await db.select({ task: accountTasks })
      .from(accountTasks)
      .innerJoin(corporateAccounts, eq(accountTasks.corporateAccountId, corporateAccounts.id))
      .innerJoin(corporations, eq(corporateAccounts.corporationId, corporations.id))
      .where(
        and(
          inArray(corporations.householdId, householdIds),
          or(
            ilike(accountTasks.title, `TradingView BUY Alert: ${symbol}`),
            ilike(accountTasks.title, `TradingView SELL Alert: ${symbol}`)
          ),
          isNull(accountTasks.archivedAt)
        )
      );

    // Get all joint accounts with their tasks
    const jointTasks = await db.select({ task: accountTasks })
      .from(accountTasks)
      .innerJoin(jointAccounts, eq(accountTasks.jointAccountId, jointAccounts.id))
      .where(
        and(
          inArray(jointAccounts.householdId, householdIds),
          or(
            ilike(accountTasks.title, `TradingView BUY Alert: ${symbol}`),
            ilike(accountTasks.title, `TradingView SELL Alert: ${symbol}`)
          ),
          isNull(accountTasks.archivedAt)
        )
      );

    // Combine all tasks
    return [
      ...individualTasks.map(row => row.task),
      ...corporateTasks.map(row => row.task),
      ...jointTasks.map(row => row.task)
    ];
  }

  async updateAccountTask(id: string, taskData: Partial<InsertAccountTask>): Promise<AccountTask> {
    const [task] = await db
      .update(accountTasks)
      .set({ ...taskData, updatedAt: new Date() })
      .where(eq(accountTasks.id, id))
      .returning();
    return task;
  }

  async deleteAccountTask(id: string): Promise<void> {
    await db.delete(accountTasks).where(eq(accountTasks.id, id));
  }

  async archiveAccountTask(id: string): Promise<AccountTask> {
    const [task] = await db
      .update(accountTasks)
      .set({ 
        archivedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(accountTasks.id, id))
      .returning();
    return task;
  }

  async restoreAccountTask(id: string): Promise<AccountTask> {
    const [task] = await db
      .update(accountTasks)
      .set({ 
        archivedAt: null,
        updatedAt: new Date() 
      })
      .where(eq(accountTasks.id, id))
      .returning();
    return task;
  }

  async getArchivedTasksForUser(userId: string): Promise<any[]> {
    // Get all households the user can access
    const userHouseholds = await db.select({ id: households.id })
      .from(households)
      .leftJoin(householdShares, eq(households.id, householdShares.householdId))
      .where(
        or(
          eq(households.userId, userId),
          eq(householdShares.sharedWithUserId, userId)
        )
      );
    
    const householdIds = userHouseholds.map(h => h.id);
    if (householdIds.length === 0) return [];

    // Get all individual accounts with their archived tasks
    const individualAccountsWithTasks = await db.select({
      task: accountTasks,
      account: individualAccounts,
      individual: individuals,
      household: households,
    })
      .from(accountTasks)
      .innerJoin(individualAccounts, eq(accountTasks.individualAccountId, individualAccounts.id))
      .innerJoin(individuals, eq(individualAccounts.individualId, individuals.id))
      .innerJoin(households, eq(individuals.householdId, households.id))
      .where(and(
        inArray(households.id, householdIds),
        isNotNull(accountTasks.archivedAt)
      ));

    // Get all corporate accounts with their archived tasks
    const corporateAccountsWithTasks = await db.select({
      task: accountTasks,
      account: corporateAccounts,
      corporation: corporations,
      household: households,
    })
      .from(accountTasks)
      .innerJoin(corporateAccounts, eq(accountTasks.corporateAccountId, corporateAccounts.id))
      .innerJoin(corporations, eq(corporateAccounts.corporationId, corporations.id))
      .innerJoin(households, eq(corporations.householdId, households.id))
      .where(and(
        inArray(households.id, householdIds),
        isNotNull(accountTasks.archivedAt)
      ));

    // Get all joint accounts with their archived tasks
    const jointAccountsWithTasks = await db.select({
      task: accountTasks,
      account: jointAccounts,
      household: households,
    })
      .from(accountTasks)
      .innerJoin(jointAccounts, eq(accountTasks.jointAccountId, jointAccounts.id))
      .innerJoin(households, eq(jointAccounts.householdId, households.id))
      .where(and(
        inArray(households.id, householdIds),
        isNotNull(accountTasks.archivedAt)
      ));

    // Combine and format all tasks
    const allTasks = [
      ...individualAccountsWithTasks.map(row => ({
        ...row.task,
        accountType: 'individual' as const,
        accountId: row.account.id,
        accountNickname: row.account.nickname,
        accountTypeLabel: row.account.type,
        ownerName: row.individual.name,
        householdId: row.household.id,
        householdName: row.household.name,
      })),
      ...corporateAccountsWithTasks.map(row => ({
        ...row.task,
        accountType: 'corporate' as const,
        accountId: row.account.id,
        accountNickname: row.account.nickname,
        accountTypeLabel: row.account.type,
        ownerName: row.corporation.name,
        householdId: row.household.id,
        householdName: row.household.name,
      })),
      ...jointAccountsWithTasks.map(row => ({
        ...row.task,
        accountType: 'joint' as const,
        accountId: row.account.id,
        accountNickname: row.account.nickname,
        accountTypeLabel: row.account.type,
        ownerName: 'Joint Account',
        householdId: row.household.id,
        householdName: row.household.name,
      })),
    ];

    // Sort by archived date (most recent first)
    return allTasks.sort((a, b) => {
      return new Date(b.archivedAt!).getTime() - new Date(a.archivedAt!).getTime();
    });
  }

  async permanentlyDeleteArchivedTasks(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db.delete(accountTasks)
      .where(and(
        isNotNull(accountTasks.archivedAt),
        lt(accountTasks.archivedAt, cutoffDate)
      ))
      .returning();
    
    return result.length;
  }

  async completeAccountTask(id: string): Promise<AccountTask> {
    const [task] = await db
      .update(accountTasks)
      .set({ 
        status: "completed", 
        completedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(accountTasks.id, id))
      .returning();
    return task;
  }

  // Account audit log operations
  async createAuditLogEntry(entry: InsertAccountAuditLog): Promise<AccountAuditLog> {
    const [log] = await db.insert(accountAuditLog).values(entry).returning();
    return log;
  }

  async getAuditLogByIndividualAccount(accountId: string, limit: number = 50): Promise<AccountAuditLog[]> {
    return await db.select()
      .from(accountAuditLog)
      .where(eq(accountAuditLog.individualAccountId, accountId))
      .orderBy(desc(accountAuditLog.createdAt))
      .limit(limit);
  }

  async getAuditLogByCorporateAccount(accountId: string, limit: number = 50): Promise<AccountAuditLog[]> {
    return await db.select()
      .from(accountAuditLog)
      .where(eq(accountAuditLog.corporateAccountId, accountId))
      .orderBy(desc(accountAuditLog.createdAt))
      .limit(limit);
  }

  async getAuditLogByJointAccount(accountId: string, limit: number = 50): Promise<AccountAuditLog[]> {
    return await db.select()
      .from(accountAuditLog)
      .where(eq(accountAuditLog.jointAccountId, accountId))
      .orderBy(desc(accountAuditLog.createdAt))
      .limit(limit);
  }

  // Insurance revenue operations
  async createInsuranceRevenue(data: InsertInsuranceRevenue): Promise<InsuranceRevenue> {
    const [entry] = await db.insert(insuranceRevenue).values(data).returning();
    return entry;
  }

  async getInsuranceRevenueByUser(userId: string): Promise<InsuranceRevenue[]> {
    return await db.select()
      .from(insuranceRevenue)
      .where(eq(insuranceRevenue.userId, userId))
      .orderBy(desc(insuranceRevenue.date));
  }

  async getInsuranceRevenueById(id: string): Promise<InsuranceRevenue | undefined> {
    const [entry] = await db.select()
      .from(insuranceRevenue)
      .where(eq(insuranceRevenue.id, id));
    return entry;
  }

  async updateInsuranceRevenue(id: string, data: UpdateInsuranceRevenue): Promise<InsuranceRevenue> {
    const [entry] = await db
      .update(insuranceRevenue)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(insuranceRevenue.id, id))
      .returning();
    return entry;
  }

  async deleteInsuranceRevenue(id: string): Promise<void> {
    await db.delete(insuranceRevenue).where(eq(insuranceRevenue.id, id));
  }

  // Investment revenue operations
  async createInvestmentRevenue(data: InsertInvestmentRevenue): Promise<InvestmentRevenue> {
    const [entry] = await db.insert(investmentRevenue).values(data).returning();
    return entry;
  }

  async getInvestmentRevenueByUser(userId: string): Promise<InvestmentRevenue[]> {
    return await db.select()
      .from(investmentRevenue)
      .where(eq(investmentRevenue.userId, userId))
      .orderBy(desc(investmentRevenue.date));
  }

  async getInvestmentRevenueById(id: string): Promise<InvestmentRevenue | undefined> {
    const [entry] = await db.select()
      .from(investmentRevenue)
      .where(eq(investmentRevenue.id, id));
    return entry;
  }

  async updateInvestmentRevenue(id: string, data: UpdateInvestmentRevenue): Promise<InvestmentRevenue> {
    const [entry] = await db
      .update(investmentRevenue)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(investmentRevenue.id, id))
      .returning();
    return entry;
  }

  async deleteInvestmentRevenue(id: string): Promise<void> {
    await db.delete(investmentRevenue).where(eq(investmentRevenue.id, id));
  }

  // KPI objectives operations
  async createKpiObjective(data: InsertKpiObjective): Promise<KpiObjective> {
    const [objective] = await db.insert(kpiObjectives).values(data).returning();
    return objective;
  }

  async getKpiObjectivesByUser(userId: string): Promise<KpiObjective[]> {
    return await db.select()
      .from(kpiObjectives)
      .where(eq(kpiObjectives.userId, userId))
      .orderBy(kpiObjectives.month);
  }

  async getKpiObjectivesByUserAndMonth(userId: string, month: string): Promise<KpiObjective[]> {
    return await db.select()
      .from(kpiObjectives)
      .where(eq(kpiObjectives.userId, userId) && eq(kpiObjectives.month, month))
      .orderBy(desc(kpiObjectives.createdAt));
  }

  async getKpiObjectiveById(id: string): Promise<KpiObjective | undefined> {
    const [objective] = await db.select()
      .from(kpiObjectives)
      .where(eq(kpiObjectives.id, id));
    return objective;
  }

  async updateKpiObjective(id: string, data: UpdateKpiObjective): Promise<KpiObjective> {
    const [objective] = await db
      .update(kpiObjectives)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(kpiObjectives.id, id))
      .returning();
    return objective;
  }

  async deleteKpiObjective(id: string): Promise<void> {
    await db.delete(kpiObjectives).where(eq(kpiObjectives.id, id));
  }

  // KPI daily tasks operations
  async getDailyTasksByObjective(objectiveId: string): Promise<KpiDailyTask[]> {
    return await db.select()
      .from(kpiDailyTasks)
      .where(eq(kpiDailyTasks.objectiveId, objectiveId))
      .orderBy(kpiDailyTasks.dayNumber);
  }

  async createDailyTask(data: InsertKpiDailyTask): Promise<KpiDailyTask> {
    const [task] = await db.insert(kpiDailyTasks).values(data).returning();
    return task;
  }

  async createBulkDailyTasks(tasks: InsertKpiDailyTask[]): Promise<KpiDailyTask[]> {
    if (tasks.length === 0) return [];
    return await db.insert(kpiDailyTasks).values(tasks).returning();
  }

  async toggleDailyTask(id: string): Promise<KpiDailyTask> {
    // Get current state
    const [current] = await db.select().from(kpiDailyTasks).where(eq(kpiDailyTasks.id, id));
    if (!current) throw new Error('Daily task not found');
    
    const [updated] = await db
      .update(kpiDailyTasks)
      .set({ 
        isCompleted: current.isCompleted === 1 ? 0 : 1,
        updatedAt: new Date() 
      })
      .where(eq(kpiDailyTasks.id, id))
      .returning();
    return updated;
  }

  async deleteDailyTasksByObjective(objectiveId: string): Promise<void> {
    await db.delete(kpiDailyTasks).where(eq(kpiDailyTasks.objectiveId, objectiveId));
  }

  // Reference Links operations
  async createReferenceLink(data: InsertReferenceLink): Promise<ReferenceLink> {
    const [link] = await db.insert(referenceLinks).values(data).returning();
    return link;
  }

  async getReferenceLinksByUser(userId: string): Promise<ReferenceLink[]> {
    return await db.select()
      .from(referenceLinks)
      .where(eq(referenceLinks.userId, userId))
      .orderBy(referenceLinks.sortOrder, referenceLinks.createdAt);
  }

  async getReferenceLinkById(id: string): Promise<ReferenceLink | undefined> {
    const [link] = await db.select()
      .from(referenceLinks)
      .where(eq(referenceLinks.id, id));
    return link;
  }

  async updateReferenceLink(id: string, data: UpdateReferenceLink): Promise<ReferenceLink> {
    const [link] = await db
      .update(referenceLinks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(referenceLinks.id, id))
      .returning();
    return link;
  }

  async deleteReferenceLink(id: string): Promise<void> {
    await db.delete(referenceLinks).where(eq(referenceLinks.id, id));
  }

  // Milestones operations
  async createMilestone(data: InsertMilestone): Promise<Milestone> {
    const [milestone] = await db.insert(milestones).values(data).returning();
    return milestone;
  }

  async getMilestonesByUser(userId: string, milestoneType?: 'business' | 'personal'): Promise<Milestone[]> {
    if (milestoneType) {
      return await db.select()
        .from(milestones)
        .where(and(eq(milestones.userId, userId), eq(milestones.milestoneType, milestoneType)))
        .orderBy(desc(milestones.achievedDate));
    }
    return await db.select()
      .from(milestones)
      .where(eq(milestones.userId, userId))
      .orderBy(desc(milestones.achievedDate));
  }

  async getMilestoneById(id: string): Promise<Milestone | undefined> {
    const [milestone] = await db.select()
      .from(milestones)
      .where(eq(milestones.id, id));
    return milestone;
  }

  async updateMilestone(id: string, data: UpdateMilestone): Promise<Milestone> {
    const [milestone] = await db
      .update(milestones)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(milestones.id, id))
      .returning();
    return milestone;
  }

  async deleteMilestone(id: string): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  // Trading Journal Entry operations
  async createJournalEntry(userId: string, data: InsertTradingJournalEntry): Promise<TradingJournalEntry> {
    const [entry] = await db.insert(tradingJournalEntries).values({
      ...data,
      userId,
    }).returning();
    return entry;
  }

  async getJournalEntries(
    userId: string,
    filters?: {
      symbol?: string;
      tagIds?: string[];
      startDate?: Date;
      endDate?: Date;
      outcome?: "pending" | "win" | "loss" | "partial";
      search?: string;
    }
  ): Promise<TradingJournalEntry[]> {
    // Handle tag filtering first (requires join)
    if (filters?.tagIds && filters.tagIds.length > 0) {
      const entriesWithTags = await db
        .selectDistinct({ id: tradingJournalEntries.id })
        .from(tradingJournalEntries)
        .innerJoin(
          tradingJournalEntryTags,
          eq(tradingJournalEntries.id, tradingJournalEntryTags.entryId)
        )
        .where(
          and(
            eq(tradingJournalEntries.userId, userId),
            inArray(tradingJournalEntryTags.tagId, filters.tagIds)
          )
        );
      
      const entryIds = entriesWithTags.map(e => e.id);
      if (entryIds.length === 0) {
        return [];
      }
      
      // Build additional conditions for filtered entries
      const conditions: any[] = [inArray(tradingJournalEntries.id, entryIds)];
      
      if (filters?.symbol) {
        conditions.push(eq(tradingJournalEntries.symbol, filters.symbol));
      }
      if (filters?.startDate) {
        conditions.push(sql`${tradingJournalEntries.entryDate} >= ${filters.startDate}`);
      }
      if (filters?.endDate) {
        conditions.push(sql`${tradingJournalEntries.entryDate} <= ${filters.endDate}`);
      }
      if (filters?.outcome) {
        conditions.push(eq(tradingJournalEntries.outcome, filters.outcome));
      }
      if (filters?.search) {
        conditions.push(or(
          ilike(tradingJournalEntries.title, `%${filters.search}%`),
          ilike(tradingJournalEntries.notes, `%${filters.search}%`),
          ilike(tradingJournalEntries.symbol, `%${filters.search}%`)
        ));
      }
      
      return await db
        .select()
        .from(tradingJournalEntries)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(desc(tradingJournalEntries.entryDate));
    }

    // Build conditions for regular query
    const conditions: any[] = [eq(tradingJournalEntries.userId, userId)];
    
    if (filters?.symbol) {
      conditions.push(eq(tradingJournalEntries.symbol, filters.symbol));
    }
    if (filters?.startDate) {
      conditions.push(sql`${tradingJournalEntries.entryDate} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${tradingJournalEntries.entryDate} <= ${filters.endDate}`);
    }
    if (filters?.outcome) {
      conditions.push(eq(tradingJournalEntries.outcome, filters.outcome));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(tradingJournalEntries.title, `%${filters.search}%`),
        ilike(tradingJournalEntries.notes, `%${filters.search}%`),
        ilike(tradingJournalEntries.symbol, `%${filters.search}%`)
      ));
    }

    return await db
      .select()
      .from(tradingJournalEntries)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(tradingJournalEntries.entryDate));
  }

  async getJournalEntryById(id: string): Promise<TradingJournalEntry | undefined> {
    const [entry] = await db.select()
      .from(tradingJournalEntries)
      .where(eq(tradingJournalEntries.id, id));
    return entry;
  }

  async getJournalEntryWithDetails(id: string): Promise<TradingJournalEntryWithDetails | undefined> {
    const entry = await this.getJournalEntryById(id);
    if (!entry) return undefined;

    const images = await db.select()
      .from(tradingJournalImages)
      .where(eq(tradingJournalImages.entryId, id))
      .orderBy(tradingJournalImages.sortOrder);

    const entryTags = await db
      .select({
        id: tradingJournalEntryTags.id,
        entryId: tradingJournalEntryTags.entryId,
        tagId: tradingJournalEntryTags.tagId,
        createdAt: tradingJournalEntryTags.createdAt,
        tag: tradingJournalTags,
      })
      .from(tradingJournalEntryTags)
      .innerJoin(tradingJournalTags, eq(tradingJournalEntryTags.tagId, tradingJournalTags.id))
      .where(eq(tradingJournalEntryTags.entryId, id));

    let trade: Trade | null = null;
    if (entry.tradeId) {
      const [linkedTrade] = await db.select()
        .from(trades)
        .where(eq(trades.id, entry.tradeId));
      trade = linkedTrade || null;
    }

    return {
      ...entry,
      images,
      entryTags,
      trade,
    };
  }

  async updateJournalEntry(id: string, data: UpdateTradingJournalEntry): Promise<TradingJournalEntry> {
    const [entry] = await db
      .update(tradingJournalEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tradingJournalEntries.id, id))
      .returning();
    return entry;
  }

  async deleteJournalEntry(id: string): Promise<void> {
    await db.delete(tradingJournalEntries).where(eq(tradingJournalEntries.id, id));
  }

  // Trading Journal Image operations
  async addJournalImage(data: InsertTradingJournalImage): Promise<TradingJournalImage> {
    const [image] = await db.insert(tradingJournalImages).values(data).returning();
    return image;
  }

  async getJournalImages(entryId: string): Promise<TradingJournalImage[]> {
    return await db.select()
      .from(tradingJournalImages)
      .where(eq(tradingJournalImages.entryId, entryId))
      .orderBy(tradingJournalImages.sortOrder);
  }

  async updateJournalImageSortOrder(imageId: string, sortOrder: number): Promise<TradingJournalImage> {
    const [image] = await db
      .update(tradingJournalImages)
      .set({ sortOrder })
      .where(eq(tradingJournalImages.id, imageId))
      .returning();
    return image;
  }

  async removeJournalImage(imageId: string): Promise<void> {
    await db.delete(tradingJournalImages).where(eq(tradingJournalImages.id, imageId));
  }

  // Trading Journal Tag operations
  async createTag(userId: string, data: InsertTradingJournalTag): Promise<TradingJournalTag> {
    const [tag] = await db.insert(tradingJournalTags).values({
      ...data,
      userId,
    }).returning();
    return tag;
  }

  async getTags(userId: string): Promise<TradingJournalTag[]> {
    return await db.select()
      .from(tradingJournalTags)
      .where(eq(tradingJournalTags.userId, userId))
      .orderBy(tradingJournalTags.name);
  }

  async getTagById(id: string): Promise<TradingJournalTag | undefined> {
    const [tag] = await db.select()
      .from(tradingJournalTags)
      .where(eq(tradingJournalTags.id, id));
    return tag;
  }

  async linkTagToEntry(entryId: string, tagId: string): Promise<TradingJournalEntryTag> {
    const [entryTag] = await db.insert(tradingJournalEntryTags).values({
      entryId,
      tagId,
    }).returning();
    return entryTag;
  }

  async unlinkTagFromEntry(entryId: string, tagId: string): Promise<void> {
    await db.delete(tradingJournalEntryTags)
      .where(and(
        eq(tradingJournalEntryTags.entryId, entryId),
        eq(tradingJournalEntryTags.tagId, tagId)
      ));
  }

  async getEntryTags(entryId: string): Promise<(TradingJournalEntryTag & { tag: TradingJournalTag })[]> {
    return await db
      .select({
        id: tradingJournalEntryTags.id,
        entryId: tradingJournalEntryTags.entryId,
        tagId: tradingJournalEntryTags.tagId,
        createdAt: tradingJournalEntryTags.createdAt,
        tag: tradingJournalTags,
      })
      .from(tradingJournalEntryTags)
      .innerJoin(tradingJournalTags, eq(tradingJournalEntryTags.tagId, tradingJournalTags.id))
      .where(eq(tradingJournalEntryTags.entryId, entryId));
  }

  async updateEntryTags(entryId: string, tagIds: string[]): Promise<void> {
    // Remove all existing tags
    await db.delete(tradingJournalEntryTags).where(eq(tradingJournalEntryTags.entryId, entryId));

    // Add new tags
    if (tagIds.length > 0) {
      await db.insert(tradingJournalEntryTags).values(
        tagIds.map(tagId => ({ entryId, tagId }))
      );
    }
  }

  // Trading Journal Analytics
  async getJournalAnalytics(userId: string): Promise<{
    totalEntries: number;
    winCount: number;
    lossCount: number;
    pendingCount: number;
    partialCount: number;
    totalRealizedPnL: number;
    averageConvictionScore: number;
    entriesBySymbol: Array<{ symbol: string; count: number }>;
    entriesByTag: Array<{ tagId: string; tagName: string; count: number }>;
    entriesByOutcome: Array<{ outcome: string; count: number }>;
  }> {
    const allEntries = await db.select()
      .from(tradingJournalEntries)
      .where(eq(tradingJournalEntries.userId, userId));

    const totalEntries = allEntries.length;
    const winCount = allEntries.filter(e => e.outcome === "win").length;
    const lossCount = allEntries.filter(e => e.outcome === "loss").length;
    const pendingCount = allEntries.filter(e => e.outcome === "pending").length;
    const partialCount = allEntries.filter(e => e.outcome === "partial").length;

    const totalRealizedPnL = allEntries
      .filter(e => e.realizedPnL !== null)
      .reduce((sum, e) => sum + parseFloat(e.realizedPnL || "0"), 0);

    const convictionScores = allEntries
      .filter(e => e.convictionScore !== null)
      .map(e => e.convictionScore || 0);
    const averageConvictionScore = convictionScores.length > 0
      ? convictionScores.reduce((sum, score) => sum + score, 0) / convictionScores.length
      : 0;

    // Entries by symbol
    const symbolMap = new Map<string, number>();
    allEntries.forEach(entry => {
      if (entry.symbol) {
        symbolMap.set(entry.symbol, (symbolMap.get(entry.symbol) || 0) + 1);
      }
    });
    const entriesBySymbol = Array.from(symbolMap.entries())
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count);

    // Entries by tag
    const allEntryTags = await db
      .select({
        entryId: tradingJournalEntryTags.entryId,
        tagId: tradingJournalTags.id,
        tagName: tradingJournalTags.name,
      })
      .from(tradingJournalEntryTags)
      .innerJoin(tradingJournalTags, eq(tradingJournalEntryTags.tagId, tradingJournalTags.id))
      .innerJoin(tradingJournalEntries, eq(tradingJournalEntryTags.entryId, tradingJournalEntries.id))
      .where(eq(tradingJournalEntries.userId, userId));

    const tagMap = new Map<string, { tagName: string; count: number }>();
    allEntryTags.forEach(et => {
      const existing = tagMap.get(et.tagId) || { tagName: et.tagName, count: 0 };
      existing.count++;
      tagMap.set(et.tagId, existing);
    });
    const entriesByTag = Array.from(tagMap.entries())
      .map(([tagId, data]) => ({ tagId, tagName: data.tagName, count: data.count }))
      .sort((a, b) => b.count - a.count);

    // Entries by outcome
    const entriesByOutcome = [
      { outcome: "pending", count: pendingCount },
      { outcome: "win", count: winCount },
      { outcome: "loss", count: lossCount },
      { outcome: "partial", count: partialCount },
    ];

    return {
      totalEntries,
      winCount,
      lossCount,
      pendingCount,
      partialCount,
      totalRealizedPnL,
      averageConvictionScore,
      entriesBySymbol,
      entriesByTag,
      entriesByOutcome,
    };
  }

  // Prospect operations
  async createProspect(data: InsertProspect): Promise<Prospect> {
    const [prospect] = await db.insert(prospects).values(data).returning();
    return prospect;
  }

  async getProspects(userId?: string): Promise<Prospect[]> {
    if (userId) {
      return await db.select().from(prospects).where(eq(prospects.userId, userId)).orderBy(desc(prospects.createdAt));
    }
    return await db.select().from(prospects).orderBy(desc(prospects.createdAt));
  }

  async getProspectById(id: string): Promise<Prospect | undefined> {
    const [prospect] = await db.select().from(prospects).where(eq(prospects.id, id));
    return prospect;
  }

  async updateProspect(id: string, data: UpdateProspect): Promise<Prospect> {
    const [prospect] = await db
      .update(prospects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(prospects.id, id))
      .returning();
    return prospect;
  }

  async deleteProspect(id: string): Promise<void> {
    await db.delete(prospects).where(eq(prospects.id, id));
  }

  async getProspectsByStatus(status: string): Promise<Prospect[]> {
    return await db
      .select()
      .from(prospects)
      .where(eq(prospects.status, status as any))
      .orderBy(desc(prospects.createdAt));
  }
}

export const storage = new DatabaseStorage();
