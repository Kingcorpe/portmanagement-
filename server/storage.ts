// Based on blueprint:javascript_database and blueprint:javascript_log_in_with_replit
import {
  users,
  households,
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
  type User,
  type UpsertUser,
  type Household,
  type InsertHousehold,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Household operations
  createHousehold(household: InsertHousehold): Promise<Household>;
  getHousehold(id: string): Promise<Household | undefined>;
  getAllHouseholds(): Promise<Household[]>;
  getAllHouseholdsWithDetails(): Promise<HouseholdWithDetails[]>;
  getHouseholdWithDetails(id: string): Promise<HouseholdWithDetails | null>;
  updateHousehold(id: string, household: Partial<InsertHousehold>): Promise<Household>;
  deleteHousehold(id: string): Promise<void>;

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
  updatePosition(id: string, position: Partial<InsertPosition>): Promise<Position>;
  deletePosition(id: string): Promise<void>;
  calculateIndividualAccountBalance(accountId: string): Promise<number>;
  calculateCorporateAccountBalance(accountId: string): Promise<number>;
  calculateJointAccountBalance(accountId: string): Promise<number>;

  // Alert operations
  createAlert(alert: InsertAlert): Promise<Alert>;
  getAlert(id: string): Promise<Alert | undefined>;
  getAllAlerts(): Promise<Alert[]>;
  getAlertsByStatus(status: "pending" | "executed" | "dismissed"): Promise<Alert[]>;
  updateAlert(id: string, alert: Partial<InsertAlert>): Promise<Alert>;
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
  getAllPlannedPortfolios(): Promise<PlannedPortfolio[]>;
  getAllPlannedPortfoliosWithAllocations(): Promise<PlannedPortfolioWithAllocations[]>;
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
  getAllFreelancePortfolios(): Promise<FreelancePortfolio[]>;
  getAllFreelancePortfoliosWithAllocations(): Promise<FreelancePortfolioWithAllocations[]>;
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
  deleteAllAccountTargetAllocations(accountType: 'individual' | 'corporate' | 'joint', accountId: string): Promise<void>;

  // Library document operations
  createLibraryDocument(document: InsertLibraryDocument): Promise<LibraryDocument>;
  getLibraryDocument(id: string): Promise<LibraryDocument | undefined>;
  getAllLibraryDocuments(): Promise<LibraryDocument[]>;
  getLibraryDocumentsByCategory(category: 'reports' | 'strategies'): Promise<LibraryDocument[]>;
  updateLibraryDocument(id: string, document: Partial<InsertLibraryDocument>): Promise<LibraryDocument>;
  deleteLibraryDocument(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
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

  // Household operations
  async createHousehold(householdData: InsertHousehold): Promise<Household> {
    const [household] = await db.insert(households).values(householdData).returning();
    return household;
  }

  async getHousehold(id: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.id, id));
    return household;
  }

  async getAllHouseholds(): Promise<Household[]> {
    return await db.select().from(households).orderBy(desc(households.createdAt));
  }

  async getAllHouseholdsWithDetails(): Promise<HouseholdWithDetails[]> {
    // Fetch all households
    const allHouseholds = await this.getAllHouseholds();
    
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
    await db.delete(households).where(eq(households.id, id));
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
    const [position] = await db.insert(positions).values(dataWithDefaults).returning();
    return position;
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position;
  }

  async getPositionsByIndividualAccount(accountId: string): Promise<Position[]> {
    return await db.select().from(positions).where(eq(positions.individualAccountId, accountId));
  }

  async getPositionsByCorporateAccount(accountId: string): Promise<Position[]> {
    return await db.select().from(positions).where(eq(positions.corporateAccountId, accountId));
  }

  async getPositionsByJointAccount(accountId: string): Promise<Position[]> {
    return await db.select().from(positions).where(eq(positions.jointAccountId, accountId));
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
      const quantity = parseFloat(position.quantity);
      const currentPrice = parseFloat(position.currentPrice);
      return total + (quantity * currentPrice);
    }, 0);
  }

  async calculateCorporateAccountBalance(accountId: string): Promise<number> {
    const accountPositions = await this.getPositionsByCorporateAccount(accountId);
    return accountPositions.reduce((total, position) => {
      const quantity = parseFloat(position.quantity);
      const currentPrice = parseFloat(position.currentPrice);
      return total + (quantity * currentPrice);
    }, 0);
  }

  async calculateJointAccountBalance(accountId: string): Promise<number> {
    const accountPositions = await this.getPositionsByJointAccount(accountId);
    return accountPositions.reduce((total, position) => {
      const quantity = parseFloat(position.quantity);
      const currentPrice = parseFloat(position.currentPrice);
      return total + (quantity * currentPrice);
    }, 0);
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

  async updateAlert(id: string, alertData: Partial<InsertAlert>): Promise<Alert> {
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
    const [holding] = await db.select().from(universalHoldings).where(eq(universalHoldings.ticker, ticker));
    return holding;
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

  async getAllPlannedPortfolios(): Promise<PlannedPortfolio[]> {
    return await db.select().from(plannedPortfolios).orderBy(plannedPortfolios.name);
  }

  async getAllPlannedPortfoliosWithAllocations(): Promise<PlannedPortfolioWithAllocations[]> {
    const portfolios = await this.getAllPlannedPortfolios();
    
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

  async getAllFreelancePortfolios(): Promise<FreelancePortfolio[]> {
    return await db.select().from(freelancePortfolios).orderBy(freelancePortfolios.name);
  }

  async getAllFreelancePortfoliosWithAllocations(): Promise<FreelancePortfolioWithAllocations[]> {
    const portfolios = await this.getAllFreelancePortfolios();
    
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

  // Library document operations
  async createLibraryDocument(documentData: InsertLibraryDocument): Promise<LibraryDocument> {
    const [document] = await db.insert(libraryDocuments).values(documentData).returning();
    return document;
  }

  async getLibraryDocument(id: string): Promise<LibraryDocument | undefined> {
    const [document] = await db.select().from(libraryDocuments).where(eq(libraryDocuments.id, id));
    return document;
  }

  async getAllLibraryDocuments(): Promise<LibraryDocument[]> {
    return await db.select().from(libraryDocuments).orderBy(desc(libraryDocuments.createdAt));
  }

  async getLibraryDocumentsByCategory(category: 'reports' | 'strategies'): Promise<LibraryDocument[]> {
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
}

export const storage = new DatabaseStorage();
