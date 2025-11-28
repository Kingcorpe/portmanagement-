// Based on blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { generatePortfolioRebalanceReport } from "./pdf-report";
import { sendEmailWithAttachment } from "./gmail";
import { eq } from "drizzle-orm";
import {
  users,
  insertHouseholdSchema,
  insertIndividualSchema,
  insertCorporationSchema,
  insertIndividualAccountSchema,
  insertCorporateAccountSchema,
  insertJointAccountSchema,
  insertJointAccountOwnershipSchema,
  insertPositionSchema,
  insertAlertSchema,
  insertTradeSchema,
  insertUniversalHoldingSchema,
  insertPlannedPortfolioSchema,
  insertPlannedPortfolioAllocationSchema,
  insertFreelancePortfolioSchema,
  insertFreelancePortfolioAllocationSchema,
  insertAccountTargetAllocationSchema,
  updateHouseholdSchema,
  updateIndividualSchema,
  updateCorporationSchema,
  updateIndividualAccountSchema,
  updateCorporateAccountSchema,
  updateJointAccountSchema,
  updatePositionSchema,
  updateAlertSchema,
  updateUniversalHoldingSchema,
  updatePlannedPortfolioSchema,
  updatePlannedPortfolioAllocationSchema,
  updateFreelancePortfolioSchema,
  updateFreelancePortfolioAllocationSchema,
  updateAccountTargetAllocationSchema,
  tradingViewWebhookSchema,
  insertLibraryDocumentSchema,
  updateLibraryDocumentSchema,
  insertAccountTaskSchema,
  updateAccountTaskSchema,
  type InsertAccountAuditLog,
  type Position,
} from "@shared/schema";

// Helper function to compute diff between old and new account values for audit logging
function computeAccountDiff(oldAccount: Record<string, any>, newData: Record<string, any>): Record<string, { old: any; new: any }> | null {
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Fields to track for audit log (skip auto-generated fields like updatedAt)
  const trackableFields = [
    'nickname', 'accountType', 'balance', 'bookValue',
    'riskMedium', 'riskMediumHigh', 'riskHigh',
    'immediateNotes', 'upcomingNotes',
    'protectionPercent', 'stopPrice', 'limitPrice'
  ];
  
  for (const field of trackableFields) {
    if (field in newData) {
      const oldValue = oldAccount[field];
      const newValue = newData[field];
      
      // Compare as strings to handle decimal types properly
      const oldStr = oldValue === null || oldValue === undefined ? null : String(oldValue);
      const newStr = newValue === null || newValue === undefined ? null : String(newValue);
      
      if (oldStr !== newStr) {
        changes[field] = { old: oldValue, new: newValue };
      }
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication middleware
  await setupAuth(app);

  // Disable caching for all API routes to ensure fresh data after mutations
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Household routes
  app.get('/api/households', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const households = await storage.getAllHouseholds(userId);
      res.json(households);
    } catch (error) {
      console.error("Error fetching households:", error);
      res.status(500).json({ message: "Failed to fetch households" });
    }
  });

  app.get('/api/households/full', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const households = await storage.getAllHouseholdsWithDetails(userId);
      res.json(households);
    } catch (error) {
      console.error("Error fetching household details:", error);
      res.status(500).json({ message: "Failed to fetch household details" });
    }
  });

  app.post('/api/households', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertHouseholdSchema.parse(req.body);
      
      // Check for duplicate household name
      const nameExists = await storage.checkHouseholdNameExists(parsed.name, userId);
      if (nameExists) {
        return res.status(400).json({ message: "A household with this name already exists" });
      }
      
      // Create household with the current user as owner
      const household = await storage.createHousehold({ ...parsed, userId });
      res.json(household);
    } catch (error: any) {
      console.error("Error creating household:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create household" });
    }
  });

  // Get archived households (must come before /api/households/:id route)
  app.get('/api/households/archived', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const archived = await storage.getAllArchivedHouseholds(userId);
      res.json(archived);
    } catch (error) {
      console.error("Error fetching archived households:", error);
      res.status(500).json({ message: "Failed to fetch archived households" });
    }
  });

  app.get('/api/households/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      
      // Verify user has access to this household
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const household = await storage.getHousehold(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      res.json(household);
    } catch (error) {
      console.error("Error fetching household:", error);
      res.status(500).json({ message: "Failed to fetch household" });
    }
  });

  app.get('/api/households/:id/full', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      
      // Verify user has access to this household
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const household = await storage.getHouseholdWithDetails(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      res.json(household);
    } catch (error) {
      console.error("Error fetching household details:", error);
      res.status(500).json({ message: "Failed to fetch household details" });
    }
  });

  app.patch('/api/households/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      
      // Verify user has edit access (owner or editor share)
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateHouseholdSchema.parse(req.body);
      
      // Check for duplicate household name (excluding current household)
      if (parsed.name) {
        const nameExists = await storage.checkHouseholdNameExists(parsed.name, userId, householdId);
        if (nameExists) {
          return res.status(400).json({ message: "A household with this name already exists" });
        }
      }
      
      const household = await storage.updateHousehold(householdId, parsed);
      res.json(household);
    } catch (error: any) {
      console.error("Error updating household:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update household" });
    }
  });

  // Restore archived household (must come before /api/households/:id routes)
  app.post('/api/households/:id/restore', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hasAccess = await storage.canUserEditHousehold(userId, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const restored = await storage.restoreHousehold(req.params.id);
      res.json(restored);
    } catch (error) {
      console.error("Error restoring household:", error);
      res.status(500).json({ message: "Failed to restore household" });
    }
  });

  // User Settings routes
  app.get('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let settings = await storage.getUserSettings(userId);
      
      // Auto-create settings if they don't exist
      if (!settings) {
        settings = await storage.createUserSettings({ userId });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  app.patch('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reportEmail } = req.body;
      
      // Ensure settings exist
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({ userId, reportEmail });
      } else {
        settings = await storage.updateUserSettings(userId, { reportEmail });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  app.post('/api/user/settings/regenerate-webhook-secret', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Ensure settings exist
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({ userId });
      }
      
      settings = await storage.regenerateWebhookSecret(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error regenerating webhook secret:", error);
      res.status(500).json({ message: "Failed to regenerate webhook secret" });
    }
  });

  // Household Sharing routes
  app.get('/api/households/:id/shares', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      
      // Only owner can view shares
      const household = await storage.getHousehold(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      if (household.userId !== userId) {
        return res.status(403).json({ message: "Only the owner can view shares" });
      }
      
      const shares = await storage.getHouseholdShares(householdId);
      res.json(shares);
    } catch (error) {
      console.error("Error fetching household shares:", error);
      res.status(500).json({ message: "Failed to fetch household shares" });
    }
  });

  app.post('/api/households/:id/shares', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      const { email, accessLevel = 'viewer' } = req.body;
      
      // Only owner can share
      const household = await storage.getHousehold(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      if (household.userId !== userId) {
        return res.status(403).json({ message: "Only the owner can share a household" });
      }
      
      // Find user by email
      const [userToShare] = await db.select().from(users).where(eq(users.email, email));
      if (!userToShare) {
        return res.status(404).json({ message: "User not found with that email" });
      }
      
      // Can't share with yourself
      if (userToShare.id === userId) {
        return res.status(400).json({ message: "Cannot share with yourself" });
      }
      
      const share = await storage.shareHousehold({
        householdId,
        sharedWithUserId: userToShare.id,
        accessLevel,
      });
      
      res.json(share);
    } catch (error: any) {
      console.error("Error sharing household:", error);
      // Handle duplicate share
      if (error.code === '23505') {
        return res.status(400).json({ message: "Household already shared with this user" });
      }
      res.status(500).json({ message: "Failed to share household" });
    }
  });

  app.delete('/api/households/:id/shares/:sharedWithUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: householdId, sharedWithUserId } = req.params;
      
      // Only owner can remove shares
      const household = await storage.getHousehold(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      if (household.userId !== userId) {
        return res.status(403).json({ message: "Only the owner can remove shares" });
      }
      
      await storage.removeHouseholdShare(householdId, sharedWithUserId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing household share:", error);
      res.status(500).json({ message: "Failed to remove household share" });
    }
  });

  // Individual routes
  app.get('/api/households/:householdId/individuals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.householdId;
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const individuals = await storage.getIndividualsByHousehold(householdId);
      res.json(individuals);
    } catch (error) {
      console.error("Error fetching individuals:", error);
      res.status(500).json({ message: "Failed to fetch individuals" });
    }
  });

  app.post('/api/individuals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertIndividualSchema.parse(req.body);
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, parsed.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const individual = await storage.createIndividual(parsed);
      res.json(individual);
    } catch (error: any) {
      console.error("Error creating individual:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create individual" });
    }
  });

  app.patch('/api/individuals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const individual = await storage.getIndividual(req.params.id);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = insertIndividualSchema.partial().parse(req.body);
      const updated = await storage.updateIndividual(req.params.id, parsed);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating individual:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update individual" });
    }
  });

  app.delete('/api/individuals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const individual = await storage.getIndividual(req.params.id);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteIndividual(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting individual:", error);
      res.status(500).json({ message: "Failed to delete individual" });
    }
  });

  // Corporation routes
  app.get('/api/households/:householdId/corporations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.householdId;
      
      // Verify user has access to this household
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const corporations = await storage.getCorporationsByHousehold(householdId);
      res.json(corporations);
    } catch (error) {
      console.error("Error fetching corporations:", error);
      res.status(500).json({ message: "Failed to fetch corporations" });
    }
  });

  app.post('/api/corporations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertCorporationSchema.parse(req.body);
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, parsed.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const corporation = await storage.createCorporation(parsed);
      res.json(corporation);
    } catch (error: any) {
      console.error("Error creating corporation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create corporation" });
    }
  });

  app.patch('/api/corporations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const corporation = await storage.getCorporation(req.params.id);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = insertCorporationSchema.partial().parse(req.body);
      const updated = await storage.updateCorporation(req.params.id, parsed);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating corporation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update corporation" });
    }
  });

  app.delete('/api/corporations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const corporation = await storage.getCorporation(req.params.id);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteCorporation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting corporation:", error);
      res.status(500).json({ message: "Failed to delete corporation" });
    }
  });

  // Individual account routes
  app.get('/api/individuals/:individualId/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const individual = await storage.getIndividual(req.params.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      // Verify user has access to the household
      const hasAccess = await storage.canUserAccessHousehold(userId, individual.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const accounts = await storage.getIndividualAccountsByIndividual(req.params.individualId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching individual accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.get('/api/individual-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getIndividualAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Get individual to verify household access
      const individual = await storage.getIndividual(account.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, individual.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get household name for display
      const household = await storage.getHousehold(individual.householdId);
      
      res.json({
        ...account,
        ownerName: individual.name,
        householdName: household?.name || 'Unknown',
        householdId: individual.householdId,
      });
    } catch (error) {
      console.error("Error fetching individual account:", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post('/api/individual-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertIndividualAccountSchema.parse(req.body);
      
      // Get individual to verify household edit access
      const individual = await storage.getIndividual(parsed.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const account = await storage.createIndividualAccount(parsed);
      
      // Create audit log entry for account setup
      await storage.createAuditLogEntry({
        individualAccountId: account.id,
        userId,
        action: "account_setup",
        changes: { 
          accountType: account.type,
          nickname: account.nickname || null,
          riskMediumPct: account.riskMediumPct,
          riskMediumHighPct: account.riskMediumHighPct,
          riskHighPct: account.riskHighPct,
        },
      });
      
      res.json(account);
    } catch (error: any) {
      console.error("Error creating individual account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create individual account" });
    }
  });

  app.patch('/api/individual-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getIndividualAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Get individual to verify household edit access
      const individual = await storage.getIndividual(account.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateIndividualAccountSchema.parse(req.body);
      const updated = await storage.updateIndividualAccount(req.params.id, parsed);
      
      // Create audit log entry for the changes
      const changes = computeAccountDiff(account, parsed);
      if (changes) {
        await storage.createAuditLogEntry({
          individualAccountId: req.params.id,
          userId,
          action: "update",
          changes,
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating individual account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update individual account" });
    }
  });

  app.delete('/api/individual-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getIndividualAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Get individual to verify household edit access
      const individual = await storage.getIndividual(account.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteIndividualAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting individual account:", error);
      res.status(500).json({ message: "Failed to delete individual account" });
    }
  });

  // Corporate account routes
  app.get('/api/corporations/:corporationId/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const corporation = await storage.getCorporation(req.params.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, corporation.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const accounts = await storage.getCorporateAccountsByCorporation(req.params.corporationId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching corporate accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.get('/api/corporate-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getCorporateAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const corporation = await storage.getCorporation(account.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, corporation.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get household name for display
      const household = await storage.getHousehold(corporation.householdId);
      
      res.json({
        ...account,
        ownerName: corporation.name,
        householdName: household?.name || 'Unknown',
        householdId: corporation.householdId,
      });
    } catch (error) {
      console.error("Error fetching corporate account:", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post('/api/corporate-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertCorporateAccountSchema.parse(req.body);
      
      const corporation = await storage.getCorporation(parsed.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const account = await storage.createCorporateAccount(parsed);
      
      // Create audit log entry for account setup
      await storage.createAuditLogEntry({
        corporateAccountId: account.id,
        userId,
        action: "account_setup",
        changes: { 
          accountType: account.type,
          nickname: account.nickname || null,
          riskMediumPct: account.riskMediumPct,
          riskMediumHighPct: account.riskMediumHighPct,
          riskHighPct: account.riskHighPct,
        },
      });
      
      res.json(account);
    } catch (error: any) {
      console.error("Error creating corporate account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create corporate account" });
    }
  });

  app.patch('/api/corporate-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getCorporateAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const corporation = await storage.getCorporation(account.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateCorporateAccountSchema.parse(req.body);
      const updated = await storage.updateCorporateAccount(req.params.id, parsed);
      
      // Create audit log entry for the changes
      const changes = computeAccountDiff(account, parsed);
      if (changes) {
        await storage.createAuditLogEntry({
          corporateAccountId: req.params.id,
          userId,
          action: "update",
          changes,
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating corporate account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update corporate account" });
    }
  });

  app.delete('/api/corporate-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getCorporateAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const corporation = await storage.getCorporation(account.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteCorporateAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting corporate account:", error);
      res.status(500).json({ message: "Failed to delete corporate account" });
    }
  });

  // Joint account routes
  app.get('/api/households/:householdId/joint-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.householdId;
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const jointAccounts = await storage.getJointAccountsByHousehold(householdId);
      res.json(jointAccounts);
    } catch (error) {
      console.error("Error fetching joint accounts:", error);
      res.status(500).json({ message: "Failed to fetch joint accounts" });
    }
  });

  app.get('/api/joint-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getJointAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, account.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get household name and owners for display
      const household = await storage.getHousehold(account.householdId);
      const owners = await storage.getJointAccountOwners(account.id);
      const ownerName = owners.map((o: any) => o.name).join(' & ');
      
      res.json({
        ...account,
        ownerName,
        householdName: household?.name || 'Unknown',
      });
    } catch (error) {
      console.error("Error fetching joint account:", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post('/api/joint-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertJointAccountSchema.parse(req.body);
      
      const canEdit = await storage.canUserEditHousehold(userId, parsed.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const jointAccount = await storage.createJointAccount(parsed);
      
      // Create audit log entry for account setup
      await storage.createAuditLogEntry({
        jointAccountId: jointAccount.id,
        userId,
        action: "account_setup",
        changes: { 
          accountType: jointAccount.type,
          nickname: jointAccount.nickname || null,
          riskMediumPct: jointAccount.riskMediumPct,
          riskMediumHighPct: jointAccount.riskMediumHighPct,
          riskHighPct: jointAccount.riskHighPct,
        },
      });
      
      res.json(jointAccount);
    } catch (error: any) {
      console.error("Error creating joint account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create joint account" });
    }
  });

  app.patch('/api/joint-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getJointAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, account.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateJointAccountSchema.parse(req.body);
      const updated = await storage.updateJointAccount(req.params.id, parsed);
      
      // Create audit log entry for the changes
      const changes = computeAccountDiff(account, parsed);
      if (changes) {
        await storage.createAuditLogEntry({
          jointAccountId: req.params.id,
          userId,
          action: "update",
          changes,
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating joint account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update joint account" });
    }
  });

  app.delete('/api/joint-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getJointAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, account.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteJointAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting joint account:", error);
      res.status(500).json({ message: "Failed to delete joint account" });
    }
  });

  // Joint account ownership routes
  app.get('/api/joint-accounts/:jointAccountId/owners', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount('joint', req.params.jointAccountId);
      if (!householdId) {
        return res.status(404).json({ message: "Joint account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const owners = await storage.getJointAccountOwners(req.params.jointAccountId);
      res.json(owners);
    } catch (error) {
      console.error("Error fetching joint account owners:", error);
      res.status(500).json({ message: "Failed to fetch owners" });
    }
  });

  app.post('/api/joint-account-ownership', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertJointAccountOwnershipSchema.parse(req.body);
      
      // Check authorization via the joint account
      const householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      if (!householdId) {
        return res.status(404).json({ message: "Joint account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const ownership = await storage.addJointAccountOwner(parsed);
      res.json(ownership);
    } catch (error: any) {
      console.error("Error adding joint account owner:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add joint account owner" });
    }
  });

  // Alert routes
  app.get('/api/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = req.query.status as "pending" | "executed" | "dismissed" | undefined;
      const allAlerts = status
        ? await storage.getAlertsByStatus(status)
        : await storage.getAllAlerts();
      
      // Filter alerts to only those owned by this user (or legacy alerts without userId)
      const userAlerts = allAlerts.filter(alert => !alert.userId || alert.userId === userId);
      res.json(userAlerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.patch('/api/alerts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Verify the user owns this alert
      const existingAlert = await storage.getAlert(req.params.id);
      if (!existingAlert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      if (existingAlert.userId && existingAlert.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateAlertSchema.parse(req.body);
      const alert = await storage.updateAlert(req.params.id, parsed);
      res.json(alert);
    } catch (error: any) {
      console.error("Error updating alert:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update alert" });
    }
  });

  // Dismiss all pending alerts
  app.post('/api/alerts/dismiss-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all pending alerts for this user
      const allAlerts = await storage.getAlertsByStatus("pending");
      const userPendingAlerts = allAlerts.filter(alert => !alert.userId || alert.userId === userId);
      
      // Dismiss each one
      let dismissedCount = 0;
      for (const alert of userPendingAlerts) {
        await storage.updateAlert(alert.id, { status: "dismissed" });
        dismissedCount++;
      }
      
      res.json({ message: `Dismissed ${dismissedCount} alerts`, count: dismissedCount });
    } catch (error: any) {
      console.error("Error dismissing all alerts:", error);
      res.status(500).json({ message: "Failed to dismiss alerts" });
    }
  });

  // Get accounts affected by a symbol (for alert details)
  app.get('/api/symbols/:symbol/affected-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const symbol = req.params.symbol;
      
      // Find all positions for this symbol
      const positionsForSymbol = await storage.getPositionsBySymbol(symbol);
      
      // Helper to normalize tickers for matching
      const normalizeTicker = (ticker: string | null | undefined): string => {
        if (!ticker) return '';
        return ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      };
      
      const affectedAccounts: Array<{
        accountId: string;
        accountType: string;
        accountName: string;
        householdName: string;
        ownerName: string;
        currentValue: number;
        actualPercentage: number;
        targetPercentage: number | null;
        variance: number | null;
        status: 'under' | 'over' | 'on-target' | 'no-target';
      }> = [];
      
      for (const position of positionsForSymbol) {
        let accountType: string;
        let accountId: string;
        let account: any;
        let allPositions: any[];
        let targetAllocations: any[];
        let ownerName = '';
        let householdName = '';
        let householdId = '';
        
        // Determine account type and fetch related data
        if (position.individualAccountId) {
          accountType = 'individual';
          accountId = position.individualAccountId;
          account = await storage.getIndividualAccount(accountId);
          if (!account) continue;
          
          const individual = await storage.getIndividual(account.individualId);
          if (!individual) continue;
          
          householdId = individual.householdId;
          ownerName = individual.name;
          allPositions = await storage.getPositionsByIndividualAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
        } else if (position.corporateAccountId) {
          accountType = 'corporate';
          accountId = position.corporateAccountId;
          account = await storage.getCorporateAccount(accountId);
          if (!account) continue;
          
          const corporation = await storage.getCorporation(account.corporationId);
          if (!corporation) continue;
          
          householdId = corporation.householdId;
          ownerName = corporation.name;
          allPositions = await storage.getPositionsByCorporateAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
        } else if (position.jointAccountId) {
          accountType = 'joint';
          accountId = position.jointAccountId;
          account = await storage.getJointAccount(accountId);
          if (!account) continue;
          
          householdId = account.householdId;
          const owners = await storage.getJointAccountOwners(accountId);
          ownerName = owners.map((o: any) => o.name).join(' & ');
          allPositions = await storage.getPositionsByJointAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
        } else {
          continue;
        }
        
        // Check if user has access to this household
        const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
        if (!hasAccess) continue;
        
        // Get household name
        const household = await storage.getHousehold(householdId);
        householdName = household?.name || 'Unknown';
        
        // Calculate portfolio total value
        const totalValue = allPositions.reduce((sum, p) => {
          const qty = parseFloat(p.quantity || '0');
          const price = parseFloat(p.currentPrice || p.entryPrice || '0');
          return sum + (qty * price);
        }, 0);
        
        // Calculate current position value and percentage
        const positionQty = parseFloat(position.quantity || '0');
        const positionPrice = parseFloat(position.currentPrice || position.entryPrice || '0');
        const currentValue = positionQty * positionPrice;
        const actualPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
        
        // Find target allocation for this symbol
        const normalizedSymbol = normalizeTicker(symbol);
        const targetAllocation = targetAllocations.find(t => 
          normalizeTicker(t.symbol) === normalizedSymbol
        );
        
        const targetPercentage = targetAllocation ? parseFloat(targetAllocation.targetPercentage) : null;
        const variance = targetPercentage !== null ? actualPercentage - targetPercentage : null;
        
        // Determine status
        let status: 'under' | 'over' | 'on-target' | 'no-target' = 'no-target';
        if (variance !== null) {
          if (Math.abs(variance) <= 1) {
            status = 'on-target';
          } else if (variance < 0) {
            status = 'under';
          } else {
            status = 'over';
          }
        }
        
        // Format account name - use type field and format nicely
        let displayName = 'Account';
        if (account.type) {
          // Format type like "tfsa" -> "TFSA", "rrsp" -> "RRSP"
          displayName = account.type.toUpperCase();
        } else if (account.name) {
          displayName = account.name;
        }
        // Add nickname if available
        if (account.nickname) {
          displayName = `${displayName} - ${account.nickname}`;
        }
        
        affectedAccounts.push({
          accountId,
          accountType,
          accountName: displayName,
          householdName,
          ownerName,
          currentValue,
          actualPercentage,
          targetPercentage,
          variance,
          status,
        });
      }
      
      res.json(affectedAccounts);
    } catch (error) {
      console.error("Error fetching affected accounts:", error);
      res.status(500).json({ message: "Failed to fetch affected accounts" });
    }
  });

  // TradingView webhook endpoint - validates secret for security
  app.post('/api/webhooks/tradingview', async (req, res) => {
    try {
      // Validate webhook secret if configured
      const webhookSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
      if (webhookSecret) {
        // Check URL query param, header, or body for secret
        const providedSecret = req.query.secret || req.headers['x-webhook-secret'] || req.body.secret;
        if (providedSecret !== webhookSecret) {
          return res.status(401).json({ message: "Unauthorized: Invalid webhook secret" });
        }
      }
      
      // Validate webhook payload
      const parsed = tradingViewWebhookSchema.parse(req.body);
      
      // Create alert record
      const alert = await storage.createAlert({
        symbol: parsed.symbol,
        signal: parsed.signal,
        price: parsed.price.toString(),
        message: parsed.message || '',
        webhookData: req.body,
      });
      
      // Helper to normalize tickers for matching
      const normalizeTicker = (ticker: string): string => {
        return ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      };
      
      // Helper to check if position matches the alert signal criteria
      const shouldProcessPosition = (actualPercent: number, targetPercent: number, signal: string): boolean => {
        if (signal === 'BUY') {
          return actualPercent < targetPercent; // Underweight
        } else if (signal === 'SELL') {
          return actualPercent > targetPercent; // Overweight
        }
        return false;
      };
      
      // Process alerts for both BUY and SELL signals
      const tasksCreated: string[] = [];
      const reportsSent: string[] = [];
      
      if (parsed.signal === 'BUY' || parsed.signal === 'SELL') {
        const reportEmail = parsed.email || process.env.TRADINGVIEW_REPORT_EMAIL;
        
        // Find all positions for this symbol
        const positionsForSymbol = await storage.getPositionsBySymbol(parsed.symbol);
        
        // Process each position to check if it matches the signal
        for (const position of positionsForSymbol) {
          let accountType: string;
          let accountId: string;
          let account: any;
          let allPositions: any[];
          let targetAllocations: any[];
          let ownerName = '';
          let householdName = '';
          
          // Determine account type and fetch related data
          if (position.individualAccountId) {
            accountType = 'individual';
            accountId = position.individualAccountId;
            account = await storage.getIndividualAccount(accountId);
            allPositions = await storage.getPositionsByIndividualAccount(accountId);
            targetAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
            if (account) {
              const individual = await storage.getIndividual(account.individualId);
              if (individual) {
                ownerName = individual.name;
                const household = await storage.getHousehold(individual.householdId);
                householdName = household?.name || '';
              }
            }
          } else if (position.corporateAccountId) {
            accountType = 'corporate';
            accountId = position.corporateAccountId;
            account = await storage.getCorporateAccount(accountId);
            allPositions = await storage.getPositionsByCorporateAccount(accountId);
            targetAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
            if (account) {
              const corporation = await storage.getCorporation(account.corporationId);
              if (corporation) {
                ownerName = corporation.name;
                const household = await storage.getHousehold(corporation.householdId);
                householdName = household?.name || '';
              }
            }
          } else if (position.jointAccountId) {
            accountType = 'joint';
            accountId = position.jointAccountId;
            account = await storage.getJointAccount(accountId);
            allPositions = await storage.getPositionsByJointAccount(accountId);
            targetAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
            if (account) {
              const owners = await storage.getJointAccountOwners(accountId);
              const ownerNames: string[] = [];
              for (const individual of owners) {
                ownerNames.push(individual.name);
                if (!householdName) {
                  const household = await storage.getHousehold(individual.householdId);
                  householdName = household?.name || '';
                }
              }
              ownerName = ownerNames.join(' & ');
            }
          } else {
            continue; // Skip if no account association
          }
          
          if (!account) continue;
          
          // Calculate portfolio totals and check allocation status
          const totalActualValue = allPositions.reduce((sum, pos) => {
            return sum + (Number(pos.quantity) * Number(pos.currentPrice));
          }, 0);
          
          if (totalActualValue <= 0) continue;
          
          // Find the position's actual allocation
          const normalizedAlertSymbol = normalizeTicker(parsed.symbol);
          const positionValue = Number(position.quantity) * Number(position.currentPrice);
          const actualPercent = (positionValue / totalActualValue) * 100;
          
          // Find target allocation for this symbol
          const targetAlloc = targetAllocations.find(t => 
            t.holding?.ticker && normalizeTicker(t.holding.ticker) === normalizedAlertSymbol
          );
          const targetPercent = targetAlloc ? Number(targetAlloc.targetPercentage) : 0;
          
          // Check if position matches signal criteria
          if (shouldProcessPosition(actualPercent, targetPercent, parsed.signal)) {
            try {
              // Calculate shares needed
              const targetValue = (targetPercent / 100) * totalActualValue;
              const sharePrice = Number(position.currentPrice);
              const sharesToTrade = sharePrice > 0 ? (targetValue - positionValue) / sharePrice : 0;
              
              // Create task with trade details
              const accountTypeLabels: Record<string, string> = {
                cash: 'Cash', tfsa: 'TFSA', fhsa: 'FHSA', rrsp: 'RRSP',
                lira: 'LIRA', liff: 'LIF', rif: 'RIF',
                corporate_cash: 'Corporate Cash', ipp: 'IPP',
                joint_cash: 'Joint Cash', resp: 'RESP'
              };
              
              const displayAccountType = accountTypeLabels[account.type] || account.type.toUpperCase();
              const accountDisplayName = account.nickname || '';
              const fullAccountName = `${displayAccountType}${accountDisplayName ? ` - ${accountDisplayName}` : ''}`;
              
              const taskTitle = `TradingView ${parsed.signal} Alert: ${parsed.symbol}`;
              const variance = actualPercent - targetPercent;
              const taskDescription = 
                `Signal: ${parsed.signal}\n` +
                `Symbol: ${parsed.symbol}\n` +
                `Current Price: $${sharePrice.toFixed(2)}\n` +
                `Household: ${householdName}\n` +
                `Account: ${fullAccountName}\n\n` +
                `Current Allocation: ${actualPercent.toFixed(2)}%\n` +
                `Target Allocation: ${targetPercent.toFixed(2)}%\n` +
                `Variance: ${variance.toFixed(2)}%\n\n` +
                `Shares to Trade: ${Math.round(sharesToTrade * 100) / 100}\n` +
                `Dollar Amount: $${Math.round(Math.abs(sharesToTrade * sharePrice) * 100) / 100}`;
              
              // Create task based on account type
              let task;
              if (accountType === 'individual') {
                task = await storage.createAccountTask({
                  individualAccountId: accountId,
                  title: taskTitle,
                  description: taskDescription,
                  priority: 'high',
                  status: 'pending'
                });
              } else if (accountType === 'corporate') {
                task = await storage.createAccountTask({
                  corporateAccountId: accountId,
                  title: taskTitle,
                  description: taskDescription,
                  priority: 'high',
                  status: 'pending'
                });
              } else if (accountType === 'joint') {
                task = await storage.createAccountTask({
                  jointAccountId: accountId,
                  title: taskTitle,
                  description: taskDescription,
                  priority: 'high',
                  status: 'pending'
                });
              }
              
              if (task) {
                tasksCreated.push(`${fullAccountName} (${householdName}) - ${parsed.signal} ${parsed.symbol}`);
              }
              
              // Optionally send email report if configured
              if (reportEmail) {
                try {
                  // Build portfolio comparison data for report
                  const actualByTicker = new Map<string, { value: number; quantity: number; originalTicker: string; price: number }>();
                  for (const pos of allPositions) {
                    const originalTicker = pos.symbol.toUpperCase();
                    const normalizedTicker = normalizeTicker(originalTicker);
                    const value = Number(pos.quantity) * Number(pos.currentPrice);
                    const existing = actualByTicker.get(normalizedTicker) || { value: 0, quantity: 0, originalTicker, price: Number(pos.currentPrice) };
                    actualByTicker.set(normalizedTicker, {
                      value: existing.value + value,
                      quantity: existing.quantity + Number(pos.quantity),
                      originalTicker: existing.originalTicker,
                      price: Number(pos.currentPrice)
                    });
                  }
                  
                  // Build report positions
                  const reportPositions: Array<{
                    symbol: string;
                    name?: string;
                    quantity: number;
                    currentPrice: number;
                    marketValue: number;
                    actualPercentage: number;
                    targetPercentage: number;
                    variance: number;
                    changeNeeded: number;
                    sharesToTrade: number;
                    status: 'over' | 'under' | 'on-target' | 'unexpected';
                  }> = [];
                  
                  const processedNormalizedTickers = new Set<string>();
                  
                  // Add all target allocations
                  for (const allocation of targetAllocations) {
                    if (!allocation.holding?.ticker) continue;
                    const displayTicker = allocation.holding.ticker.toUpperCase();
                    const normalizedTicker = normalizeTicker(displayTicker);
                    processedNormalizedTickers.add(normalizedTicker);
                    
                    const actual = actualByTicker.get(normalizedTicker);
                    const actualValue = actual?.value || 0;
                    const actualPercentage = totalActualValue > 0 ? (actualValue / totalActualValue) * 100 : 0;
                    const targetPercentage = Number(allocation.targetPercentage);
                    const variance = actualPercentage - targetPercentage;
                    const targetValue = totalActualValue > 0 ? (targetPercentage / 100) * totalActualValue : 0;
                    const changeNeeded = targetValue - actualValue;
                    const currentPrice = actual?.price || 1;
                    const sharesToTrade = currentPrice > 0 ? changeNeeded / currentPrice : 0;
                    
                    reportPositions.push({
                      symbol: displayTicker,
                      name: displayTicker,
                      quantity: actual?.quantity || 0,
                      currentPrice,
                      marketValue: actualValue,
                      actualPercentage: Math.round(actualPercentage * 100) / 100,
                      targetPercentage,
                      variance: Math.round(variance * 100) / 100,
                      changeNeeded: Math.round(changeNeeded * 100) / 100,
                      sharesToTrade: Math.round(sharesToTrade * 100) / 100,
                      status: (variance > 2 ? 'over' : variance < -2 ? 'under' : 'on-target') as 'over' | 'under' | 'on-target'
                    });
                  }
                  
                  // Add unexpected positions
                  for (const [normalizedTicker, data] of Array.from(actualByTicker.entries())) {
                    if (!processedNormalizedTickers.has(normalizedTicker)) {
                      const actualPercentage = totalActualValue > 0 ? (data.value / totalActualValue) * 100 : 0;
                      reportPositions.push({
                        symbol: data.originalTicker,
                        name: data.originalTicker,
                        quantity: data.quantity,
                        currentPrice: data.price,
                        marketValue: data.value,
                        actualPercentage: Math.round(actualPercentage * 100) / 100,
                        targetPercentage: 0,
                        variance: Math.round(actualPercentage * 100) / 100,
                        changeNeeded: -data.value,
                        sharesToTrade: -data.quantity,
                        status: 'unexpected' as const
                      });
                    }
                  }
                  
                  // Generate PDF
                  const pdfBuffer = await generatePortfolioRebalanceReport({
                    accountName: accountDisplayName,
                    accountType: displayAccountType,
                    householdName,
                    ownerName,
                    totalValue: totalActualValue,
                    positions: reportPositions,
                    generatedAt: new Date()
                  });
                  
                  const statusText = parsed.signal === 'BUY' ? 'Underweight' : 'Overweight';
                  await sendEmailWithAttachment(
                    reportEmail,
                    `TradingView ${parsed.signal} Alert: ${parsed.symbol} - ${statusText} Position Report`,
                    `A TradingView ${parsed.signal} alert was triggered for ${parsed.symbol} at $${parsed.price}.\n\n` +
                    `This position is currently ${statusText.toUpperCase()} in:\n` +
                    `- Household: ${householdName}\n` +
                    `- Owner: ${ownerName}\n` +
                    `- Account: ${fullAccountName}\n\n` +
                    `Current allocation: ${actualPercent.toFixed(2)}%\n` +
                    `Target allocation: ${targetPercent.toFixed(2)}%\n` +
                    `Variance: ${variance.toFixed(2)}%\n\n` +
                    `A task has been created in your portfolio management system.\n` +
                    `Please see the attached PDF report for detailed rebalancing recommendations.`,
                    pdfBuffer,
                    `Portfolio_Rebalancing_${householdName.replace(/\s+/g, '_')}_${account.type}_${new Date().toISOString().split('T')[0]}.pdf`
                  );
                  
                  reportsSent.push(`${fullAccountName} (${householdName})`);
                } catch (emailError) {
                  console.error(`Failed to send report for account ${accountId}:`, emailError);
                }
              }
            } catch (taskError) {
              console.error(`Failed to create task for account ${accountId}:`, taskError);
            }
          }
        }
      }
      
      res.json({ 
        success: true, 
        alertId: alert.id,
        tasksCreated: tasksCreated.length,
        tasks: tasksCreated,
        reportsSent: reportsSent.length,
        accounts: reportsSent
      });
    } catch (error: any) {
      console.error("Error processing TradingView webhook:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid webhook data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Position routes
  app.get('/api/individual-accounts/:accountId/positions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('individual', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const positions = await storage.getPositionsByIndividualAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.get('/api/corporate-accounts/:accountId/positions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('corporate', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const positions = await storage.getPositionsByCorporateAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.get('/api/joint-accounts/:accountId/positions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('joint', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const positions = await storage.getPositionsByJointAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.post('/api/positions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertPositionSchema.parse(req.body);
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (parsed.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', parsed.individualAccountId);
      } else if (parsed.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', parsed.corporateAccountId);
      } else if (parsed.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Auto-add ticker to Universal Holdings if it doesn't exist
      const ticker = parsed.symbol.toUpperCase();
      const existingHolding = await storage.getUniversalHoldingByTicker(ticker);
      if (!existingHolding) {
        await storage.createUniversalHolding({
          ticker: ticker,
          name: `${ticker} (Auto-added)`,
          category: "auto_added",
          riskLevel: "medium",
          dividendRate: "0",
          dividendPayout: "none",
          price: parsed.currentPrice?.toString() || "0",
          description: "Automatically added from position. Please update details.",
        });
      }
      
      const position = await storage.createPosition(parsed);
      
      // Create audit log entry
      await storage.createAuditLogEntry({
        individualAccountId: parsed.individualAccountId || undefined,
        corporateAccountId: parsed.corporateAccountId || undefined,
        jointAccountId: parsed.jointAccountId || undefined,
        userId,
        action: "position_add",
        changes: { 
          symbol: position.symbol, 
          quantity: position.quantity,
          entryPrice: position.entryPrice,
          currentPrice: position.currentPrice
        },
      });
      
      res.json(position);
    } catch (error: any) {
      console.error("Error creating position:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create position" });
    }
  });

  app.patch('/api/positions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromPosition(req.params.id);
      if (!householdId) {
        return res.status(404).json({ message: "Position not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get existing position for audit log
      const existingPosition = await storage.getPosition(req.params.id);
      
      const parsed = updatePositionSchema.parse(req.body);
      const position = await storage.updatePosition(req.params.id, parsed);
      
      // Create audit log entry
      if (existingPosition) {
        const changes: Record<string, { old: any; new: any }> = {};
        if (parsed.quantity !== undefined && parsed.quantity !== existingPosition.quantity) {
          changes.quantity = { old: existingPosition.quantity, new: parsed.quantity };
        }
        if (parsed.entryPrice !== undefined && parsed.entryPrice !== existingPosition.entryPrice) {
          changes.entryPrice = { old: existingPosition.entryPrice, new: parsed.entryPrice };
        }
        if (parsed.currentPrice !== undefined && parsed.currentPrice !== existingPosition.currentPrice) {
          changes.currentPrice = { old: existingPosition.currentPrice, new: parsed.currentPrice };
        }
        if (parsed.stopPrice !== undefined && parsed.stopPrice !== existingPosition.stopPrice) {
          changes.stopPrice = { old: existingPosition.stopPrice, new: parsed.stopPrice };
        }
        if (parsed.limitPrice !== undefined && parsed.limitPrice !== existingPosition.limitPrice) {
          changes.limitPrice = { old: existingPosition.limitPrice, new: parsed.limitPrice };
        }
        
        if (Object.keys(changes).length > 0) {
          await storage.createAuditLogEntry({
            individualAccountId: existingPosition.individualAccountId || undefined,
            corporateAccountId: existingPosition.corporateAccountId || undefined,
            jointAccountId: existingPosition.jointAccountId || undefined,
            userId,
            action: "position_update",
            changes: { symbol: existingPosition.symbol, ...changes },
          });
        }
      }
      
      res.json(position);
    } catch (error: any) {
      console.error("Error updating position:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update position" });
    }
  });

  app.delete('/api/positions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromPosition(req.params.id);
      if (!householdId) {
        return res.status(404).json({ message: "Position not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get position for audit log before deletion
      const position = await storage.getPosition(req.params.id);
      
      await storage.deletePosition(req.params.id);
      
      // Create audit log entry
      if (position) {
        await storage.createAuditLogEntry({
          individualAccountId: position.individualAccountId || undefined,
          corporateAccountId: position.corporateAccountId || undefined,
          jointAccountId: position.jointAccountId || undefined,
          userId,
          action: "position_delete",
          changes: { 
            symbol: position.symbol, 
            quantity: position.quantity,
            entryPrice: position.entryPrice
          },
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting position:", error);
      res.status(500).json({ message: "Failed to delete position" });
    }
  });

  // Bulk upload positions from CSV
  app.post('/api/positions/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { positions, accountType, accountId, clearExisting } = req.body;
      
      if (!Array.isArray(positions) || positions.length === 0) {
        return res.status(400).json({ message: "No positions provided" });
      }
      
      if (!accountType || !accountId) {
        return res.status(400).json({ message: "Account type and ID are required" });
      }
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let deletedCount = 0;
      
      // Clear existing positions if requested
      if (clearExisting) {
        let existingPositions: Position[] = [];
        if (accountType === 'individual') {
          existingPositions = await storage.getPositionsByIndividualAccount(accountId);
        } else if (accountType === 'corporate') {
          existingPositions = await storage.getPositionsByCorporateAccount(accountId);
        } else if (accountType === 'joint') {
          existingPositions = await storage.getPositionsByJointAccount(accountId);
        }
        
        for (const pos of existingPositions) {
          await storage.deletePosition(pos.id);
          deletedCount++;
        }
        
        // Log the clear action
        await storage.createAuditLogEntry({
          individualAccountId: accountType === 'individual' ? accountId : undefined,
          corporateAccountId: accountType === 'corporate' ? accountId : undefined,
          jointAccountId: accountType === 'joint' ? accountId : undefined,
          userId,
          action: "position_bulk_delete",
          changes: { 
            count: deletedCount,
            reason: "Cleared before bulk import"
          },
        });
      }
      
      const createdPositions = [];
      const errors = [];
      
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        try {
          // Build position data with the correct account ID field
          const positionData: any = {
            symbol: pos.symbol?.toString().toUpperCase().trim(),
            quantity: pos.quantity?.toString(),
            entryPrice: pos.entryPrice?.toString(),
            currentPrice: pos.currentPrice?.toString(),
          };
          
          // Set the correct account ID based on type
          switch (accountType) {
            case 'individual':
              positionData.individualAccountId = accountId;
              break;
            case 'corporate':
              positionData.corporateAccountId = accountId;
              break;
            case 'joint':
              positionData.jointAccountId = accountId;
              break;
            default:
              throw new Error(`Invalid account type: ${accountType}`);
          }
          
          // Validate required fields
          if (!positionData.symbol || !positionData.quantity || !positionData.entryPrice || !positionData.currentPrice) {
            throw new Error(`Missing required fields for row ${i + 1}`);
          }
          
          // Auto-add ticker to Universal Holdings if it doesn't exist
          const ticker = positionData.symbol.toUpperCase();
          const existingHolding = await storage.getUniversalHoldingByTicker(ticker);
          if (!existingHolding) {
            await storage.createUniversalHolding({
              ticker: ticker,
              name: `${ticker} (Auto-added)`,
              category: "auto_added",
              riskLevel: "medium",
              dividendRate: "0",
              dividendPayout: "none",
              price: positionData.currentPrice?.toString() || "0",
              description: "Automatically added from position. Please update details.",
            });
          }
          
          const parsed = insertPositionSchema.parse(positionData);
          const position = await storage.createPosition(parsed);
          createdPositions.push(position);
        } catch (error: any) {
          errors.push({ row: i + 1, symbol: pos.symbol, error: error.message });
        }
      }
      
      // Create audit log entry for bulk upload
      if (createdPositions.length > 0) {
        const auditLogData: any = {
          userId,
          action: "position_bulk_upload",
          changes: { 
            count: createdPositions.length,
            symbols: createdPositions.map(p => p.symbol).join(', ')
          },
        };
        
        switch (accountType) {
          case 'individual':
            auditLogData.individualAccountId = accountId;
            break;
          case 'corporate':
            auditLogData.corporateAccountId = accountId;
            break;
          case 'joint':
            auditLogData.jointAccountId = accountId;
            break;
        }
        
        await storage.createAuditLogEntry(auditLogData);
      }
      
      res.json({
        success: true,
        created: createdPositions.length,
        deleted: deletedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `${deletedCount > 0 ? `Cleared ${deletedCount} existing positions. ` : ''}Successfully imported ${createdPositions.length} positions${errors.length > 0 ? `, ${errors.length} failed` : ''}`
      });
    } catch (error: any) {
      console.error("Error bulk creating positions:", error);
      res.status(500).json({ message: "Failed to import positions", error: error.message });
    }
  });

  // Market price refresh routes using Yahoo Finance
  app.post('/api/market-prices/quotes', isAuthenticated, async (req, res) => {
    try {
      const { symbols } = req.body;
      
      if (!Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ message: "No symbols provided" });
      }

      // Dynamically import yahoo-finance2
      const yahooFinance = (await import('yahoo-finance2')).default;
      
      const results: Record<string, { price: number; currency: string; error?: string }> = {};
      const errors: string[] = [];
      
      // Process symbols - normalize Canadian tickers
      for (const rawSymbol of symbols) {
        try {
          // Skip cash positions
          const upperSymbol = rawSymbol.toUpperCase().trim();
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            results[rawSymbol] = { price: 1, currency: 'CAD' };
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian suffixes
          let quote = null;
          const symbolsToTry = [rawSymbol];
          
          // If no suffix, try adding Canadian exchange suffixes
          if (!rawSymbol.includes('.')) {
            symbolsToTry.push(`${rawSymbol}.TO`);  // TSX
            symbolsToTry.push(`${rawSymbol}.V`);   // TSX Venture
            symbolsToTry.push(`${rawSymbol}.CN`);  // CSE
          }
          
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quote(symbol);
              if (result && (result as any).regularMarketPrice) {
                quote = result as any;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (quote && quote.regularMarketPrice) {
            results[rawSymbol] = {
              price: quote.regularMarketPrice,
              currency: quote.currency || 'CAD'
            };
          } else {
            results[rawSymbol] = { price: 0, currency: 'CAD', error: 'Symbol not found' };
            errors.push(rawSymbol);
          }
        } catch (error: any) {
          results[rawSymbol] = { price: 0, currency: 'CAD', error: error.message };
          errors.push(rawSymbol);
        }
      }
      
      res.json({ 
        quotes: results, 
        errors: errors.length > 0 ? errors : undefined,
        message: `Fetched ${Object.keys(results).length - errors.length} of ${symbols.length} quotes`
      });
    } catch (error: any) {
      console.error("Error fetching market quotes:", error);
      res.status(500).json({ message: "Failed to fetch market quotes", error: error.message });
    }
  });

  // Refresh prices for all positions in an account
  app.post('/api/accounts/:accountType/:accountId/refresh-prices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get all positions for the account
      let positions;
      switch (accountType) {
        case 'individual':
          positions = await storage.getPositionsByIndividualAccount(accountId);
          break;
        case 'corporate':
          positions = await storage.getPositionsByCorporateAccount(accountId);
          break;
        case 'joint':
          positions = await storage.getPositionsByJointAccount(accountId);
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      if (!positions || positions.length === 0) {
        return res.json({ success: true, updated: 0, message: "No positions to update" });
      }
      
      // Get unique symbols
      const symbolSet = new Set(positions.map(p => p.symbol));
      const symbols = Array.from(symbolSet);
      
      // Dynamically import yahoo-finance2
      const yahooFinance = (await import('yahoo-finance2')).default;
      
      const priceUpdates: Record<string, number> = {};
      const errors: string[] = [];
      
      for (const rawSymbol of symbols) {
        try {
          const upperSymbol = rawSymbol.toUpperCase().trim();
          
          // Skip cash positions
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            priceUpdates[rawSymbol] = 1;
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian suffixes
          let quote = null;
          const symbolsToTry = [rawSymbol];
          
          if (!rawSymbol.includes('.')) {
            symbolsToTry.push(`${rawSymbol}.TO`);
            symbolsToTry.push(`${rawSymbol}.V`);
            symbolsToTry.push(`${rawSymbol}.CN`);
          }
          
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quote(symbol);
              if (result && (result as any).regularMarketPrice) {
                quote = result as any;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (quote && quote.regularMarketPrice) {
            priceUpdates[rawSymbol] = quote.regularMarketPrice;
          } else {
            errors.push(rawSymbol);
          }
        } catch (error) {
          errors.push(rawSymbol);
        }
      }
      
      // Update positions with new prices
      const now = new Date();
      let updatedCount = 0;
      
      for (const position of positions) {
        if (priceUpdates[position.symbol] !== undefined) {
          await storage.updatePosition(position.id, { 
            currentPrice: priceUpdates[position.symbol].toString(),
            priceUpdatedAt: now
          });
          updatedCount++;
        }
      }
      
      // Create audit log entry for price refresh
      if (updatedCount > 0) {
        const auditData: any = {
          userId,
          action: "prices_refresh",
          changes: { 
            positionsUpdated: updatedCount,
            symbolsNotFound: errors.length > 0 ? errors : undefined
          },
        };
        switch (accountType) {
          case 'individual': auditData.individualAccountId = accountId; break;
          case 'corporate': auditData.corporateAccountId = accountId; break;
          case 'joint': auditData.jointAccountId = accountId; break;
        }
        await storage.createAuditLogEntry(auditData);
      }
      
      res.json({
        success: true,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Updated ${updatedCount} positions${errors.length > 0 ? `, ${errors.length} symbols not found` : ''}`
      });
    } catch (error: any) {
      console.error("Error refreshing prices:", error);
      res.status(500).json({ message: "Failed to refresh prices", error: error.message });
    }
  });

  // Account Target Allocation routes
  app.get('/api/accounts/:accountType/:accountId/target-allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let allocations;
      switch (accountType) {
        case 'individual':
          allocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
          break;
        case 'corporate':
          allocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
          break;
        case 'joint':
          allocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching account target allocations:", error);
      res.status(500).json({ message: "Failed to fetch account target allocations" });
    }
  });

  app.post('/api/accounts/:accountType/:accountId/target-allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = insertAccountTargetAllocationSchema.parse(req.body);
      
      // Set the correct account ID field based on type
      const allocationData = {
        ...parsed,
        individualAccountId: accountType === 'individual' ? accountId : null,
        corporateAccountId: accountType === 'corporate' ? accountId : null,
        jointAccountId: accountType === 'joint' ? accountId : null,
      };
      
      const allocation = await storage.createAccountTargetAllocation(allocationData);
      res.json(allocation);
    } catch (error: any) {
      console.error("Error creating account target allocation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account target allocation" });
    }
  });

  app.patch('/api/account-target-allocations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromTargetAllocation(req.params.id);
      if (!householdId) {
        return res.status(404).json({ message: "Target allocation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateAccountTargetAllocationSchema.parse(req.body);
      const allocation = await storage.updateAccountTargetAllocation(req.params.id, parsed);
      res.json(allocation);
    } catch (error: any) {
      console.error("Error updating account target allocation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update account target allocation" });
    }
  });

  app.delete('/api/account-target-allocations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromTargetAllocation(req.params.id);
      if (!householdId) {
        return res.status(404).json({ message: "Target allocation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteAccountTargetAllocation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting account target allocation:", error);
      res.status(500).json({ message: "Failed to delete account target allocation" });
    }
  });

  // Inline target allocation - sets target % for a ticker, auto-adds to Universal Holdings if needed
  app.post('/api/accounts/:accountType/:accountId/inline-target-allocation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      const { ticker, targetPercentage } = req.body;
      
      if (!ticker) {
        return res.status(400).json({ message: "Ticker is required" });
      }
      
      if (!['individual', 'corporate', 'joint'].includes(accountType)) {
        return res.status(400).json({ message: "Invalid account type" });
      }
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Handle empty/null/undefined as 0 for deletion
      const targetPctStr = (targetPercentage === undefined || targetPercentage === null || targetPercentage === "") 
        ? "0" 
        : String(targetPercentage);
      const targetPct = parseFloat(targetPctStr);
      
      if (isNaN(targetPct) || targetPct < 0 || targetPct > 100) {
        return res.status(400).json({ message: "Target percentage must be between 0 and 100" });
      }
      
      // Check if ticker exists in Universal Holdings
      let holding = await storage.getUniversalHoldingByTicker(ticker.toUpperCase());
      let wasAutoAdded = false;
      
      // If ticker doesn't exist and we're setting a non-zero target, auto-add to Universal Holdings
      if (!holding && targetPct > 0) {
        holding = await storage.createUniversalHolding({
          ticker: ticker.toUpperCase(),
          name: `${ticker.toUpperCase()} (Auto-added)`,
          category: "auto_added",
          riskLevel: "medium",
          dividendRate: "0",
          dividendPayout: "none",
          price: "0",
          description: "Automatically added from holdings table. Please update details.",
        });
        wasAutoAdded = true;
      }
      
      // If target is 0 or less and ticker doesn't exist in Universal Holdings, nothing to delete
      if (targetPct <= 0 && !holding) {
        return res.json({ 
          success: true, 
          action: 'none',
          message: 'No allocation to remove' 
        });
      }
      
      // Get existing allocations for this account to check if ticker already has an allocation
      let existingAllocations;
      switch (accountType) {
        case 'individual':
          existingAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
          break;
        case 'corporate':
          existingAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
          break;
        case 'joint':
          existingAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
          break;
      }
      
      const existingAllocation = holding ? existingAllocations?.find(a => a.universalHoldingId === holding!.id) : undefined;
      
      let allocation;
      // Helper to create audit entry
      const createTargetAuditEntry = async (action: "target_add" | "target_update" | "target_delete", changes: any) => {
        const auditData: any = {
          userId,
          action,
          changes,
        };
        switch (accountType) {
          case 'individual': auditData.individualAccountId = accountId; break;
          case 'corporate': auditData.corporateAccountId = accountId; break;
          case 'joint': auditData.jointAccountId = accountId; break;
        }
        await storage.createAuditLogEntry(auditData);
      };
      
      if (targetPct <= 0) {
        // If target is 0 or less, delete the allocation if it exists
        if (existingAllocation) {
          const oldPct = existingAllocation.targetPercentage;
          await storage.deleteAccountTargetAllocation(existingAllocation.id);
          
          // Audit log
          await createTargetAuditEntry("target_delete", { 
            ticker: ticker.toUpperCase(), 
            targetPercentage: oldPct 
          });
          
          return res.json({ 
            success: true, 
            action: 'deleted',
            message: 'Target allocation removed' 
          });
        } else {
          return res.json({ 
            success: true, 
            action: 'none',
            message: 'No allocation to remove' 
          });
        }
      } else if (existingAllocation) {
        // Update existing allocation
        const oldPct = existingAllocation.targetPercentage;
        allocation = await storage.updateAccountTargetAllocation(existingAllocation.id, {
          targetPercentage: targetPct.toString(),
        });
        
        // Audit log
        await createTargetAuditEntry("target_update", { 
          ticker: ticker.toUpperCase(), 
          targetPercentage: { old: oldPct, new: targetPct.toString() }
        });
        
        return res.json({
          success: true,
          action: 'updated',
          allocation,
          holdingAutoAdded: false,
        });
      } else {
        // Create new allocation
        allocation = await storage.createAccountTargetAllocation({
          universalHoldingId: holding!.id,
          targetPercentage: targetPct.toString(),
          individualAccountId: accountType === 'individual' ? accountId : null,
          corporateAccountId: accountType === 'corporate' ? accountId : null,
          jointAccountId: accountType === 'joint' ? accountId : null,
        });
        
        // Audit log
        await createTargetAuditEntry("target_add", { 
          ticker: ticker.toUpperCase(), 
          targetPercentage: targetPct.toString(),
          autoAddedToUniversal: wasAutoAdded
        });
        
        return res.json({
          success: true,
          action: 'created',
          allocation,
          holdingAutoAdded: wasAutoAdded,
        });
      }
    } catch (error: any) {
      console.error("Error setting inline target allocation:", error);
      res.status(500).json({ message: "Failed to set target allocation", error: error.message });
    }
  });

  // Copy allocations from a model portfolio (planned or freelance) to an account
  app.post('/api/accounts/:accountType/:accountId/copy-from-portfolio/:portfolioId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId, portfolioId } = req.params;
      const { portfolioType } = req.query; // 'planned' or 'freelance'
      
      // Validate account type
      if (!['individual', 'corporate', 'joint'].includes(accountType)) {
        return res.status(400).json({ message: "Invalid account type" });
      }
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the portfolio with allocations - check both planned and freelance
      let portfolio: { name: string; userId?: string | null; allocations: { universalHoldingId: string; targetPercentage: string }[] } | null = null;
      let isPlannedPortfolio = false;
      
      if (portfolioType === 'freelance') {
        portfolio = await storage.getFreelancePortfolioWithAllocations(portfolioId);
      } else {
        // Default to planned portfolio, or check both if not specified
        portfolio = await storage.getPlannedPortfolioWithAllocations(portfolioId);
        if (portfolio) {
          isPlannedPortfolio = true;
        } else {
          portfolio = await storage.getFreelancePortfolioWithAllocations(portfolioId);
        }
      }
      
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      
      // Check portfolio ownership - users can only copy from their own portfolios
      if (portfolio.userId && portfolio.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this portfolio" });
      }
      
      // Delete existing allocations for this account
      await storage.deleteAllAccountTargetAllocations(accountType as 'individual' | 'corporate' | 'joint', accountId);
      
      // Copy allocations from portfolio
      const createdAllocations = [];
      for (const allocation of portfolio.allocations || []) {
        const newAllocation = await storage.createAccountTargetAllocation({
          universalHoldingId: allocation.universalHoldingId,
          targetPercentage: allocation.targetPercentage,
          individualAccountId: accountType === 'individual' ? accountId : null,
          corporateAccountId: accountType === 'corporate' ? accountId : null,
          jointAccountId: accountType === 'joint' ? accountId : null,
        });
        createdAllocations.push(newAllocation);
      }
      
      // Create audit log entry for copy from model
      const auditData: any = {
        userId,
        action: "copy_from_model",
        changes: { 
          portfolioName: portfolio.name,
          allocationsCount: createdAllocations.length
        },
      };
      switch (accountType) {
        case 'individual': auditData.individualAccountId = accountId; break;
        case 'corporate': auditData.corporateAccountId = accountId; break;
        case 'joint': auditData.jointAccountId = accountId; break;
      }
      await storage.createAuditLogEntry(auditData);
      
      res.json({
        success: true,
        copiedFrom: portfolio.name,
        allocationsCount: createdAllocations.length
      });
    } catch (error) {
      console.error("Error copying allocations from portfolio:", error);
      res.status(500).json({ message: "Failed to copy allocations from portfolio" });
    }
  });

  // Portfolio comparison endpoint - compares actual holdings vs account-specific target allocations
  app.get('/api/accounts/:accountType/:accountId/portfolio-comparison', isAuthenticated, async (req, res) => {
    try {
      const { accountType, accountId } = req.params;
      
      // Get account and positions
      let account;
      let positions;
      let targetAllocations;
      
      switch (accountType) {
        case 'individual':
          account = await storage.getIndividualAccount(accountId);
          positions = await storage.getPositionsByIndividualAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
          break;
        case 'corporate':
          account = await storage.getCorporateAccount(accountId);
          positions = await storage.getPositionsByCorporateAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
          break;
        case 'joint':
          account = await storage.getJointAccount(accountId);
          positions = await storage.getPositionsByJointAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // If no target allocations defined, return empty comparison
      if (targetAllocations.length === 0) {
        return res.json({
          hasTargetAllocations: false,
          comparison: [],
          totalActualValue: 0,
          totalTargetPercentage: 0
        });
      }
      
      // Calculate total actual value from positions
      const totalActualValue = positions.reduce((sum, pos) => {
        return sum + (Number(pos.quantity) * Number(pos.currentPrice));
      }, 0);
      
      // Calculate total target percentage
      const totalTargetPercentage = targetAllocations.reduce((sum, alloc) => {
        return sum + Number(alloc.targetPercentage);
      }, 0);
      
      // Helper function to normalize tickers by stripping exchange suffixes
      // e.g., "XIC.TO" -> "XIC", "VFV.TO" -> "VFV", "AAPL" -> "AAPL"
      const normalizeTicker = (ticker: string): string => {
        return ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      };
      
      // Create a map of actual allocations by normalized ticker
      // Store both normalized and original ticker for display, plus current price for action calculations
      const actualByTicker = new Map<string, { value: number; quantity: number; originalTicker: string; currentPrice: number }>();
      for (const pos of positions) {
        const originalTicker = pos.symbol.toUpperCase();
        const normalizedTicker = normalizeTicker(originalTicker);
        const currentPrice = Number(pos.currentPrice);
        const value = Number(pos.quantity) * currentPrice;
        const existing = actualByTicker.get(normalizedTicker) || { value: 0, quantity: 0, originalTicker, currentPrice };
        actualByTicker.set(normalizedTicker, {
          value: existing.value + value,
          quantity: existing.quantity + Number(pos.quantity),
          originalTicker: existing.originalTicker,
          currentPrice: currentPrice || existing.currentPrice // Use most recent price
        });
      }
      
      // Identify tickers that need price lookups (new positions without existing holdings)
      const tickersNeedingPrices: string[] = [];
      for (const allocation of targetAllocations) {
        const holding = allocation.holding;
        if (!holding) continue;
        
        const displayTicker = holding.ticker.toUpperCase();
        const normalizedTicker = normalizeTicker(displayTicker);
        const actual = actualByTicker.get(normalizedTicker);
        
        // If no existing position and no price in universal holdings, we need to fetch
        const holdingPrice = Number(holding.price) || 0;
        if (!actual && holdingPrice === 0) {
          tickersNeedingPrices.push(displayTicker);
        }
      }
      
      // Fetch prices from Yahoo Finance for tickers that need them (fallback for on-demand lookup)
      const fetchedPrices = new Map<string, number>();
      if (tickersNeedingPrices.length > 0) {
        try {
          // Use yahoo-finance2 v3 API
          const YahooFinance = (await import('yahoo-finance2')).default;
          const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
          
          // Helper to try different exchange suffixes for Canadian tickers
          const tryGetQuote = async (symbol: string): Promise<number> => {
            const suffixes = ['', '.TO', '.V', '.CN'];
            const baseSymbol = symbol.replace(/\.(TO|V|CN|NE)$/i, '');
            
            for (const suffix of suffixes) {
              try {
                const testSymbol = baseSymbol + suffix;
                const quote = await yahooFinance.quote(testSymbol) as any;
                if (quote?.regularMarketPrice) {
                  return quote.regularMarketPrice;
                }
              } catch (e: any) {
                continue;
              }
            }
            return 0;
          };
          
          // Fetch prices in parallel (with deduplication)
          const uniqueTickers = Array.from(new Set(tickersNeedingPrices));
          const pricePromises = uniqueTickers.map(async (ticker) => {
            const price = await tryGetQuote(ticker);
            return { ticker, price };
          });
          
          const results = await Promise.all(pricePromises);
          for (const { ticker, price } of results) {
            if (price > 0) {
              fetchedPrices.set(normalizeTicker(ticker), price);
            }
          }
        } catch (error) {
          console.error("Error fetching prices from Yahoo Finance:", error);
          // Continue without fetched prices - will show 0 shares for those tickers
        }
      }
      
      // Build comparison entries
      const comparison = [];
      const processedNormalizedTickers = new Set<string>();
      
      // First, add all target allocations
      for (const allocation of targetAllocations) {
        const holding = allocation.holding;
        if (!holding) continue;
        
        const displayTicker = holding.ticker.toUpperCase();
        const normalizedTicker = normalizeTicker(displayTicker);
        processedNormalizedTickers.add(normalizedTicker);
        
        const actual = actualByTicker.get(normalizedTicker);
        const actualValue = actual?.value || 0;
        const actualPercentage = totalActualValue > 0 ? (actualValue / totalActualValue) * 100 : 0;
        const targetPercentage = Number(allocation.targetPercentage);
        const variance = actualPercentage - targetPercentage;
        const targetValue = totalActualValue > 0 ? (targetPercentage / 100) * totalActualValue : 0;
        
        // Calculate action required
        const actionDollarAmount = targetValue - actualValue;
        // Try: 1) existing position price, 2) universal holdings price, 3) fetched Yahoo price
        const currentPrice = actual?.currentPrice || Number(holding.price) || fetchedPrices.get(normalizedTicker) || 0;
        const actionShares = currentPrice > 0 ? Math.abs(actionDollarAmount) / currentPrice : 0;
        
        // Determine action type: buy if positive, sell if negative, hold if within $50 threshold
        let actionType: 'buy' | 'sell' | 'hold' = 'hold';
        if (actionDollarAmount > 50) {
          actionType = 'buy';
        } else if (actionDollarAmount < -50) {
          actionType = 'sell';
        }
        
        comparison.push({
          allocationId: allocation.id,
          ticker: displayTicker,
          name: holding.name,
          targetPercentage,
          actualPercentage: Math.round(actualPercentage * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          actualValue: Math.round(actualValue * 100) / 100,
          targetValue: Math.round(targetValue * 100) / 100,
          quantity: actual?.quantity || 0,
          status: variance > 2 ? 'over' : variance < -2 ? 'under' : 'on-target',
          actionType,
          actionDollarAmount: Math.round(actionDollarAmount * 100) / 100,
          actionShares: Math.round(actionShares * 100) / 100,
          currentPrice: Math.round(currentPrice * 100) / 100
        });
      }
      
      // Add any positions that aren't in the target allocations (unexpected holdings)
      for (const [normalizedTicker, data] of Array.from(actualByTicker)) {
        if (!processedNormalizedTickers.has(normalizedTicker)) {
          const actualPercentage = totalActualValue > 0 ? (data.value / totalActualValue) * 100 : 0;
          // Unexpected holdings should be sold (target is 0)
          comparison.push({
            allocationId: null,
            ticker: data.originalTicker,
            name: data.originalTicker, // No name available for unexpected holdings
            targetPercentage: 0,
            actualPercentage: Math.round(actualPercentage * 100) / 100,
            variance: Math.round(actualPercentage * 100) / 100,
            actualValue: Math.round(data.value * 100) / 100,
            targetValue: 0,
            quantity: data.quantity,
            status: 'unexpected',
            actionType: data.value > 50 ? 'sell' : 'hold' as 'buy' | 'sell' | 'hold',
            actionDollarAmount: Math.round(-data.value * 100) / 100, // Negative = sell
            actionShares: Math.round(data.quantity * 100) / 100,
            currentPrice: Math.round(data.currentPrice * 100) / 100
          });
        }
      }
      
      // Sort by variance (largest discrepancy first)
      comparison.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
      
      res.json({
        hasTargetAllocations: true,
        comparison,
        totalActualValue: Math.round(totalActualValue * 100) / 100,
        totalTargetPercentage: Math.round(totalTargetPercentage * 100) / 100
      });
    } catch (error) {
      console.error("Error fetching portfolio comparison:", error);
      res.status(500).json({ message: "Failed to fetch portfolio comparison" });
    }
  });

  // Trade routes
  app.get('/api/trades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allTrades = await storage.getAllTrades();
      
      // Filter trades to only those in accessible households
      const accessibleTrades = await Promise.all(
        allTrades.map(async (trade) => {
          const householdId = await storage.getHouseholdIdFromTrade(trade.id);
          if (!householdId) return null;
          const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
          return hasAccess ? trade : null;
        })
      );
      
      res.json(accessibleTrades.filter(Boolean));
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.post('/api/trades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertTradeSchema.parse(req.body);
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (parsed.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', parsed.individualAccountId);
      } else if (parsed.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', parsed.corporateAccountId);
      } else if (parsed.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const trade = await storage.createTrade(parsed);
      res.json(trade);
    } catch (error: any) {
      console.error("Error creating trade:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create trade" });
    }
  });

  // Universal Holdings routes
  app.get('/api/universal-holdings', isAuthenticated, async (req, res) => {
    try {
      const holdings = await storage.getAllUniversalHoldings();
      res.json(holdings);
    } catch (error) {
      console.error("Error fetching universal holdings:", error);
      res.status(500).json({ message: "Failed to fetch universal holdings" });
    }
  });

  app.post('/api/universal-holdings', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertUniversalHoldingSchema.parse(req.body);
      const holding = await storage.createUniversalHolding(parsed);
      res.json(holding);
    } catch (error: any) {
      console.error("Error creating universal holding:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create universal holding" });
    }
  });

  // Refresh prices for all Universal Holdings from Yahoo Finance
  // NOTE: This must be defined BEFORE the /:id routes
  app.post('/api/universal-holdings/refresh-prices', isAuthenticated, async (req, res) => {
    try {
      const holdings = await storage.getAllUniversalHoldings();
      
      if (!holdings || holdings.length === 0) {
        return res.json({ success: true, updated: 0, message: "No holdings to update" });
      }
      
      // Dynamically import yahoo-finance2
      const yahooFinance = (await import('yahoo-finance2')).default;
      
      // Cache for ticker prices to avoid duplicate API calls
      const tickerPriceCache: Record<string, number | null> = {};
      const errors: string[] = [];
      const now = new Date();
      let updatedCount = 0;
      
      // Process each holding individually (handles duplicate tickers)
      for (const holding of holdings) {
        try {
          const upperSymbol = holding.ticker.toUpperCase().trim();
          
          // Handle cash positions
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            await storage.updateUniversalHolding(holding.id, { 
              price: "1.00",
              priceUpdatedAt: now
            });
            updatedCount++;
            continue;
          }
          
          // Check cache first
          if (tickerPriceCache[holding.ticker] !== undefined) {
            const cachedPrice = tickerPriceCache[holding.ticker];
            if (cachedPrice !== null) {
              await storage.updateUniversalHolding(holding.id, { 
                price: cachedPrice.toFixed(2),
                priceUpdatedAt: now
              });
              updatedCount++;
            }
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian/US exchange suffixes
          let quote = null;
          const symbolsToTry = [holding.ticker];
          
          if (!holding.ticker.includes('.')) {
            // Canadian exchanges
            symbolsToTry.push(`${holding.ticker}.TO`);   // TSX
            symbolsToTry.push(`${holding.ticker}.V`);    // TSX Venture
            symbolsToTry.push(`${holding.ticker}.CN`);   // CSE
            symbolsToTry.push(`${holding.ticker}.NE`);   // NEO Exchange
            // US exchanges (for cross-listed securities)
            symbolsToTry.push(`${holding.ticker}.US`);
          }
          
          console.log(`[Universal Holdings Refresh] Trying symbols for ${holding.ticker}:`, symbolsToTry);
          
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quote(symbol);
              if (result && (result as any).regularMarketPrice) {
                quote = result as any;
                console.log(`[Universal Holdings Refresh] Found price for ${symbol}: ${quote.regularMarketPrice}`);
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (quote && quote.regularMarketPrice) {
            const price = quote.regularMarketPrice;
            tickerPriceCache[holding.ticker] = price;
            await storage.updateUniversalHolding(holding.id, { 
              price: price.toFixed(2),
              priceUpdatedAt: now
            });
            updatedCount++;
          } else {
            console.log(`[Universal Holdings Refresh] Could not find price for ${holding.ticker} - tried all suffixes`);
            tickerPriceCache[holding.ticker] = null;
            if (!errors.includes(holding.ticker)) {
              errors.push(holding.ticker);
            }
          }
        } catch (error: any) {
          console.error(`Error fetching quote for ${holding.ticker}:`, error);
          tickerPriceCache[holding.ticker] = null;
          if (!errors.includes(holding.ticker)) {
            errors.push(holding.ticker);
          }
        }
      }
      
      res.json({ 
        success: true, 
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Updated ${updatedCount} holdings${errors.length > 0 ? `, ${errors.length} symbols not found` : ''}`
      });
    } catch (error: any) {
      console.error("Error refreshing universal holdings prices:", error);
      res.status(500).json({ message: "Failed to refresh prices", error: error.message });
    }
  });

  // Refresh dividend data for all Universal Holdings from Yahoo Finance
  app.post('/api/universal-holdings/refresh-dividends', isAuthenticated, async (req, res) => {
    try {
      const holdings = await storage.getAllUniversalHoldings();
      
      if (!holdings || holdings.length === 0) {
        return res.json({ success: true, updated: 0, message: "No holdings to update" });
      }
      
      // Dynamically import yahoo-finance2 with new API
      const YahooFinance = (await import('yahoo-finance2')).default;
      const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
      
      const errors: string[] = [];
      const now = new Date();
      let updatedCount = 0;
      
      // Cache for dividend data to avoid duplicate API calls
      const dividendCache: Record<string, { rate: number | null; yield: number | null; exDate: Date | null; frequency: string | null }> = {};
      
      // Calculate date range for historical dividends (1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      for (const holding of holdings) {
        try {
          const upperSymbol = holding.ticker.toUpperCase().trim();
          
          // Skip cash positions - no dividends
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            continue;
          }
          
          // Check cache first
          if (dividendCache[holding.ticker] !== undefined) {
            const cached = dividendCache[holding.ticker];
            if (cached.rate !== null) {
              await storage.updateUniversalHolding(holding.id, { 
                dividendRate: cached.rate?.toFixed(4) || "0",
                dividendYield: cached.yield?.toFixed(4) || "0",
                exDividendDate: cached.exDate || undefined,
                dividendPayout: cached.frequency as any || "none",
                dividendUpdatedAt: now
              });
              updatedCount++;
            }
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian/US exchange suffixes
          const symbolsToTry = [holding.ticker];
          
          if (!holding.ticker.includes('.')) {
            symbolsToTry.push(`${holding.ticker}.TO`);   // TSX
            symbolsToTry.push(`${holding.ticker}.V`);    // TSX Venture
            symbolsToTry.push(`${holding.ticker}.CN`);   // CSE
            symbolsToTry.push(`${holding.ticker}.NE`);   // NEO Exchange
          }
          
          console.log(`[Dividend Refresh] Trying symbols for ${holding.ticker}:`, symbolsToTry);
          
          let chartData = null;
          let quoteSummaryData = null;
          let workingSymbol = null;
          
          // First try to get quoteSummary for upcoming ex-dividend date
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quoteSummary(symbol, {
                modules: ['summaryDetail', 'calendarEvents']
              });
              if (result && (result.summaryDetail || result.calendarEvents)) {
                quoteSummaryData = result;
                workingSymbol = symbol;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          // Also get chart data for historical dividend info
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.chart(symbol, {
                period1: oneYearAgo,
                period2: new Date(),
                events: 'div'
              });
              if (result && result.meta) {
                chartData = result;
                if (!workingSymbol) workingSymbol = symbol;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (chartData || quoteSummaryData) {
            const price = chartData?.meta?.regularMarketPrice || quoteSummaryData?.summaryDetail?.regularMarketPrice || 0;
            let dividendRate = 0;
            let dividendYield = 0;
            let payoutFrequency: "monthly" | "quarterly" | "semi_annual" | "annual" | "none" = "none";
            let exDate: Date | null = null;
            
            // Try to get upcoming ex-dividend date from quoteSummary first (this is the NEXT ex-date)
            if (quoteSummaryData?.calendarEvents?.exDividendDate) {
              exDate = new Date(quoteSummaryData.calendarEvents.exDividendDate);
              console.log(`[Dividend Refresh] Found upcoming ex-date from calendarEvents for ${workingSymbol}: ${exDate.toISOString()}`);
            } else if (quoteSummaryData?.summaryDetail?.exDividendDate) {
              exDate = new Date(quoteSummaryData.summaryDetail.exDividendDate);
              console.log(`[Dividend Refresh] Found ex-date from summaryDetail for ${workingSymbol}: ${exDate.toISOString()}`);
            }
            
            // Get dividend rate and yield from summaryDetail if available
            if (quoteSummaryData?.summaryDetail) {
              const sd = quoteSummaryData.summaryDetail;
              if (sd.dividendRate) dividendRate = sd.dividendRate;
              if (sd.dividendYield) dividendYield = sd.dividendYield * 100; // Convert to percentage
              else if (dividendRate && price) dividendYield = (dividendRate / price) * 100;
            }
            
            // Calculate from historical dividend events if quoteSummary didn't have the data
            if (chartData?.events?.dividends && dividendRate === 0) {
              const divEvents = Object.values(chartData.events.dividends) as any[];
              if (divEvents.length > 0) {
                // Sum all dividends in the past year
                dividendRate = divEvents.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
                dividendYield = price > 0 ? (dividendRate / price) * 100 : 0;
                
                // Determine frequency based on payment count
                if (divEvents.length >= 12) payoutFrequency = "monthly";
                else if (divEvents.length >= 4) payoutFrequency = "quarterly";
                else if (divEvents.length >= 2) payoutFrequency = "semi_annual";
                else if (divEvents.length >= 1) payoutFrequency = "annual";
                
                // Only use historical ex-date if we didn't get one from quoteSummary
                if (!exDate) {
                  const sortedDivs = divEvents.sort((a: any, b: any) => b.date - a.date);
                  if (sortedDivs.length > 0 && sortedDivs[0].date) {
                    const timestamp = sortedDivs[0].date;
                    if (timestamp > 946684800 && timestamp < 4102444800) {
                      exDate = new Date(timestamp * 1000);
                    } else if (timestamp > 946684800000 && timestamp < 4102444800000) {
                      exDate = new Date(timestamp);
                    }
                  }
                }
              }
            } else if (chartData?.events?.dividends) {
              // Still get frequency from historical data
              const divEvents = Object.values(chartData.events.dividends) as any[];
              if (divEvents.length >= 12) payoutFrequency = "monthly";
              else if (divEvents.length >= 4) payoutFrequency = "quarterly";
              else if (divEvents.length >= 2) payoutFrequency = "semi_annual";
              else if (divEvents.length >= 1) payoutFrequency = "annual";
            }
            
            console.log(`[Dividend Refresh] Final dividend info for ${workingSymbol}:`, {
              rate: dividendRate.toFixed(4),
              yield: dividendYield.toFixed(2) + '%',
              frequency: payoutFrequency,
              exDate: exDate?.toISOString() || 'none'
            });
            
            dividendCache[holding.ticker] = {
              rate: dividendRate,
              yield: dividendYield,
              exDate,
              frequency: payoutFrequency
            };
            
            await storage.updateUniversalHolding(holding.id, { 
              dividendRate: dividendRate.toFixed(4),
              dividendYield: dividendYield.toFixed(4),
              exDividendDate: exDate || undefined,
              dividendPayout: payoutFrequency,
              dividendUpdatedAt: now
            });
            updatedCount++;
          } else {
            console.log(`[Dividend Refresh] Could not find dividend info for ${holding.ticker}`);
            dividendCache[holding.ticker] = { rate: null, yield: null, exDate: null, frequency: null };
            if (!errors.includes(holding.ticker)) {
              errors.push(holding.ticker);
            }
          }
        } catch (error: any) {
          console.error(`Error fetching dividend data for ${holding.ticker}:`, error);
          dividendCache[holding.ticker] = { rate: null, yield: null, exDate: null, frequency: null };
          if (!errors.includes(holding.ticker)) {
            errors.push(holding.ticker);
          }
        }
      }
      
      res.json({ 
        success: true, 
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Updated dividend data for ${updatedCount} holdings${errors.length > 0 ? `, ${errors.length} symbols not found` : ''}`
      });
    } catch (error: any) {
      console.error("Error refreshing dividend data:", error);
      res.status(500).json({ message: "Failed to refresh dividend data", error: error.message });
    }
  });

  app.get('/api/universal-holdings/:id', isAuthenticated, async (req, res) => {
    try {
      const holding = await storage.getUniversalHolding(req.params.id);
      if (!holding) {
        return res.status(404).json({ message: "Universal holding not found" });
      }
      res.json(holding);
    } catch (error) {
      console.error("Error fetching universal holding:", error);
      res.status(500).json({ message: "Failed to fetch universal holding" });
    }
  });

  app.patch('/api/universal-holdings/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updateUniversalHoldingSchema.parse(req.body);
      const holding = await storage.updateUniversalHolding(req.params.id, parsed);
      res.json(holding);
    } catch (error: any) {
      console.error("Error updating universal holding:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update universal holding" });
    }
  });

  app.delete('/api/universal-holdings/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteUniversalHolding(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting universal holding:", error);
      res.status(500).json({ message: "Failed to delete universal holding" });
    }
  });

  // Planned Portfolio routes
  app.get('/api/planned-portfolios', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolios = await storage.getAllPlannedPortfoliosWithAllocations(userId);
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching planned portfolios:", error);
      res.status(500).json({ message: "Failed to fetch planned portfolios" });
    }
  });

  app.post('/api/planned-portfolios', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertPlannedPortfolioSchema.parse(req.body);
      const portfolio = await storage.createPlannedPortfolio({ ...parsed, userId });
      res.json(portfolio);
    } catch (error: any) {
      console.error("Error creating planned portfolio:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create planned portfolio" });
    }
  });

  app.get('/api/planned-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolio = await storage.getPlannedPortfolioWithAllocations(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Planned portfolio not found" });
      }
      // Check ownership
      if (portfolio.userId && portfolio.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching planned portfolio:", error);
      res.status(500).json({ message: "Failed to fetch planned portfolio" });
    }
  });

  app.patch('/api/planned-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getPlannedPortfolio(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Planned portfolio not found" });
      }
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updatePlannedPortfolioSchema.parse(req.body);
      const portfolio = await storage.updatePlannedPortfolio(req.params.id, parsed);
      res.json(portfolio);
    } catch (error: any) {
      console.error("Error updating planned portfolio:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update planned portfolio" });
    }
  });

  app.delete('/api/planned-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getPlannedPortfolio(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Planned portfolio not found" });
      }
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deletePlannedPortfolio(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting planned portfolio:", error);
      res.status(500).json({ message: "Failed to delete planned portfolio" });
    }
  });

  app.post('/api/planned-portfolios/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "orderedIds must be an array" });
      }
      // Verify all portfolios belong to this user before reordering
      for (const id of orderedIds) {
        const portfolio = await storage.getPlannedPortfolio(id);
        if (portfolio && portfolio.userId && portfolio.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      await storage.reorderPlannedPortfolios(orderedIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering planned portfolios:", error);
      res.status(500).json({ message: "Failed to reorder planned portfolios" });
    }
  });

  // Planned Portfolio Allocation routes
  app.post('/api/planned-portfolio-allocations', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertPlannedPortfolioAllocationSchema.parse(req.body);
      const allocation = await storage.createPlannedPortfolioAllocation(parsed);
      res.json(allocation);
    } catch (error: any) {
      console.error("Error creating planned portfolio allocation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create planned portfolio allocation" });
    }
  });

  app.patch('/api/planned-portfolio-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updatePlannedPortfolioAllocationSchema.parse(req.body);
      const allocation = await storage.updatePlannedPortfolioAllocation(req.params.id, parsed);
      res.json(allocation);
    } catch (error: any) {
      console.error("Error updating planned portfolio allocation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update planned portfolio allocation" });
    }
  });

  app.delete('/api/planned-portfolio-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deletePlannedPortfolioAllocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting planned portfolio allocation:", error);
      res.status(500).json({ message: "Failed to delete planned portfolio allocation" });
    }
  });

  // Freelance Portfolio routes
  app.get('/api/freelance-portfolios', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolios = await storage.getAllFreelancePortfoliosWithAllocations(userId);
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching freelance portfolios:", error);
      res.status(500).json({ message: "Failed to fetch freelance portfolios" });
    }
  });

  app.post('/api/freelance-portfolios', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertFreelancePortfolioSchema.parse(req.body);
      const portfolio = await storage.createFreelancePortfolio({ ...parsed, userId });
      res.json(portfolio);
    } catch (error: any) {
      console.error("Error creating freelance portfolio:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create freelance portfolio" });
    }
  });

  app.get('/api/freelance-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolio = await storage.getFreelancePortfolioWithAllocations(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Freelance portfolio not found" });
      }
      // Check ownership
      if (portfolio.userId && portfolio.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching freelance portfolio:", error);
      res.status(500).json({ message: "Failed to fetch freelance portfolio" });
    }
  });

  app.patch('/api/freelance-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getFreelancePortfolio(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Freelance portfolio not found" });
      }
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateFreelancePortfolioSchema.parse(req.body);
      const portfolio = await storage.updateFreelancePortfolio(req.params.id, parsed);
      res.json(portfolio);
    } catch (error: any) {
      console.error("Error updating freelance portfolio:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update freelance portfolio" });
    }
  });

  app.delete('/api/freelance-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getFreelancePortfolio(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Freelance portfolio not found" });
      }
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteFreelancePortfolio(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting freelance portfolio:", error);
      res.status(500).json({ message: "Failed to delete freelance portfolio" });
    }
  });

  app.post('/api/freelance-portfolios/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "orderedIds must be an array" });
      }
      // Verify all portfolios belong to this user before reordering
      for (const id of orderedIds) {
        const portfolio = await storage.getFreelancePortfolio(id);
        if (portfolio && portfolio.userId && portfolio.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      await storage.reorderFreelancePortfolios(orderedIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering freelance portfolios:", error);
      res.status(500).json({ message: "Failed to reorder freelance portfolios" });
    }
  });

  // Freelance Portfolio Allocation routes
  app.post('/api/freelance-portfolio-allocations', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertFreelancePortfolioAllocationSchema.parse(req.body);
      const allocation = await storage.createFreelancePortfolioAllocation(parsed);
      res.json(allocation);
    } catch (error: any) {
      console.error("Error creating freelance portfolio allocation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create freelance portfolio allocation" });
    }
  });

  app.patch('/api/freelance-portfolio-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updateFreelancePortfolioAllocationSchema.parse(req.body);
      const allocation = await storage.updateFreelancePortfolioAllocation(req.params.id, parsed);
      res.json(allocation);
    } catch (error: any) {
      console.error("Error updating freelance portfolio allocation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update freelance portfolio allocation" });
    }
  });

  app.delete('/api/freelance-portfolio-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteFreelancePortfolioAllocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting freelance portfolio allocation:", error);
      res.status(500).json({ message: "Failed to delete freelance portfolio allocation" });
    }
  });

  // Ticker lookup endpoint using Yahoo Finance
  app.get('/api/ticker-lookup/:ticker', isAuthenticated, async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      
      // First, search for the ticker to get basic info
      const searchResponse = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=5&newsCount=0`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      if (!searchResponse.ok) {
        return res.status(404).json({ message: "Unable to look up ticker" });
      }
      
      const searchData = await searchResponse.json();
      
      if (!searchData.quotes || searchData.quotes.length === 0) {
        return res.status(404).json({ message: "Ticker not found" });
      }
      
      // Find exact match first, or use first result
      const exactMatch = searchData.quotes.find((q: any) => q.symbol === ticker);
      const searchQuote = exactMatch || searchData.quotes[0];
      const symbol = searchQuote.symbol;
      
      // Fetch detailed quote data including price using v8 chart API
      const quoteResponse = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      let price = null;
      
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json();
        const meta = quoteData?.chart?.result?.[0]?.meta;
        if (meta) {
          price = meta.regularMarketPrice || null;
        }
      }
      
      res.json({
        ticker: symbol,
        name: searchQuote.shortname || searchQuote.longname || symbol,
        exchange: searchQuote.exchange,
        type: searchQuote.quoteType,
        price: price
      });
    } catch (error) {
      console.error("Error looking up ticker:", error);
      res.status(500).json({ message: "Failed to look up ticker" });
    }
  });

  // ==================== Object Storage Routes ====================
  // Reference: blueprint:javascript_object_storage

  // Endpoint to get upload URL for file upload
  app.post('/api/objects/upload', isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const fileExtension = req.body.fileExtension || 'pdf';
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(fileExtension);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Endpoint to serve private objects (with ACL check)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // ==================== Library Document Routes ====================

  // Get all library documents
  app.get('/api/library-documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getAllLibraryDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching library documents:", error);
      res.status(500).json({ message: "Failed to fetch library documents" });
    }
  });

  // Get library documents by category
  app.get('/api/library-documents/category/:category', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const category = req.params.category as 'reports' | 'strategies';
      if (!['reports', 'strategies'].includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      const documents = await storage.getLibraryDocumentsByCategory(category, userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching library documents by category:", error);
      res.status(500).json({ message: "Failed to fetch library documents" });
    }
  });

  // Get single library document
  app.get('/api/library-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const document = await storage.getLibraryDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      // Check ownership
      if (document.uploadedBy && document.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching library document:", error);
      res.status(500).json({ message: "Failed to fetch library document" });
    }
  });

  // Create library document (after file upload)
  app.post('/api/library-documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const objectStorageService = new ObjectStorageService();
      
      if (!req.body.objectPath) {
        return res.status(400).json({ message: "objectPath is required" });
      }
      
      // Set ACL policy and get normalized path
      // visibility: "public" allows all authenticated users to read (owner can write)
      // The /objects/ route still requires isAuthenticated, so only logged-in users can access
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(req.body.objectPath, {
        owner: userId,
        visibility: "public",
      });
      
      // Validate that the object path is properly normalized
      if (!objectPath.startsWith("/objects/")) {
        return res.status(400).json({ message: "Invalid object path" });
      }
      
      const parsed = insertLibraryDocumentSchema.parse({
        ...req.body,
        objectPath,
        uploadedBy: userId,
      });
      
      const document = await storage.createLibraryDocument(parsed);
      res.json(document);
    } catch (error: any) {
      console.error("Error creating library document:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create library document" });
    }
  });

  // Update library document
  app.patch('/api/library-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getLibraryDocument(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (existing.uploadedBy && existing.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateLibraryDocumentSchema.parse(req.body);
      const document = await storage.updateLibraryDocument(req.params.id, parsed);
      res.json(document);
    } catch (error: any) {
      console.error("Error updating library document:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update library document" });
    }
  });

  // Delete library document
  app.delete('/api/library-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getLibraryDocument(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (existing.uploadedBy && existing.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteLibraryDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting library document:", error);
      res.status(500).json({ message: "Failed to delete library document" });
    }
  });

  // Account Task routes - get tasks for individual accounts
  app.get('/api/individual-accounts/:accountId/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('individual', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getTasksByIndividualAccount(req.params.accountId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get tasks for corporate accounts
  app.get('/api/corporate-accounts/:accountId/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('corporate', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getTasksByCorporateAccount(req.params.accountId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get tasks for joint accounts
  app.get('/api/joint-accounts/:accountId/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('joint', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getTasksByJointAccount(req.params.accountId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Create task
  app.post('/api/account-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertAccountTaskSchema.parse(req.body);
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (parsed.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', parsed.individualAccountId);
      } else if (parsed.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', parsed.corporateAccountId);
      } else if (parsed.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const task = await storage.createAccountTask(parsed);
      
      // Create audit log entry
      await storage.createAuditLogEntry({
        individualAccountId: parsed.individualAccountId || undefined,
        corporateAccountId: parsed.corporateAccountId || undefined,
        jointAccountId: parsed.jointAccountId || undefined,
        userId,
        action: "task_add",
        changes: { 
          title: task.title,
          dueDate: task.dueDate
        },
      });
      
      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Update task
  app.patch('/api/account-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getAccountTask(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (existing.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', existing.individualAccountId);
      } else if (existing.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', existing.corporateAccountId);
      } else if (existing.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', existing.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateAccountTaskSchema.parse(req.body);
      const task = await storage.updateAccountTask(req.params.id, parsed);
      res.json(task);
    } catch (error: any) {
      console.error("Error updating task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Complete task - marks as done, logs to audit trail, and removes from active tasks
  app.post('/api/account-tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getAccountTask(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (existing.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', existing.individualAccountId);
      } else if (existing.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', existing.corporateAccountId);
      } else if (existing.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', existing.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Create audit log entry with full task details for future reference
      await storage.createAuditLogEntry({
        individualAccountId: existing.individualAccountId || undefined,
        corporateAccountId: existing.corporateAccountId || undefined,
        jointAccountId: existing.jointAccountId || undefined,
        userId,
        action: "task_complete",
        changes: { 
          title: existing.title,
          description: existing.description || null,
          priority: existing.priority,
          dueDate: existing.dueDate ? new Date(existing.dueDate).toLocaleDateString() : null,
        },
      });
      
      // Delete the task after logging (completed tasks only exist in audit history)
      await storage.deleteAccountTask(req.params.id);
      
      res.json({ success: true, message: "Task completed and archived to history" });
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Delete task
  app.delete('/api/account-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getAccountTask(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (existing.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', existing.individualAccountId);
      } else if (existing.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', existing.corporateAccountId);
      } else if (existing.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', existing.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteAccountTask(req.params.id);
      
      // Create audit log entry
      await storage.createAuditLogEntry({
        individualAccountId: existing.individualAccountId || undefined,
        corporateAccountId: existing.corporateAccountId || undefined,
        jointAccountId: existing.jointAccountId || undefined,
        userId,
        action: "task_delete",
        changes: { 
          title: existing.title
        },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Get all tasks for the current user (across all accounts)
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getAllTasksForUser(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching all tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Account audit log routes
  app.get('/api/accounts/:accountType/:accountId/audit-log', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let logs: any[];
      switch (accountType) {
        case 'individual':
          logs = await storage.getAuditLogByIndividualAccount(accountId);
          break;
        case 'corporate':
          logs = await storage.getAuditLogByCorporateAccount(accountId);
          break;
        case 'joint':
          logs = await storage.getAuditLogByJointAccount(accountId);
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  // Email portfolio rebalancing report
  app.post('/api/accounts/:accountType/:accountId/email-report', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get account, positions, and target allocations
      let account: any;
      let positions: any[];
      let targetAllocations: any[];
      let ownerName = '';
      let householdName = '';
      
      switch (accountType) {
        case 'individual':
          account = await storage.getIndividualAccount(accountId);
          positions = await storage.getPositionsByIndividualAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
          if (account) {
            const individual = await storage.getIndividual(account.individualId);
            if (individual) {
              ownerName = individual.name;
              const household = await storage.getHousehold(individual.householdId);
              householdName = household?.name || '';
            }
          }
          break;
        case 'corporate':
          account = await storage.getCorporateAccount(accountId);
          positions = await storage.getPositionsByCorporateAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
          if (account) {
            const corporation = await storage.getCorporation(account.corporationId);
            if (corporation) {
              ownerName = corporation.name;
              const household = await storage.getHousehold(corporation.householdId);
              householdName = household?.name || '';
            }
          }
          break;
        case 'joint':
          account = await storage.getJointAccount(accountId);
          positions = await storage.getPositionsByJointAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
          if (account) {
            const owners = await storage.getJointAccountOwners(accountId);
            const ownerNames: string[] = [];
            for (const individual of owners) {
              ownerNames.push(individual.name);
              if (!householdName) {
                const household = await storage.getHousehold(individual.householdId);
                householdName = household?.name || '';
              }
            }
            ownerName = ownerNames.join(' & ');
          }
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Calculate portfolio comparison data
      const normalizeTicker = (ticker: string): string => {
        return ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      };
      
      const totalActualValue = positions.reduce((sum, pos) => {
        return sum + (Number(pos.quantity) * Number(pos.currentPrice));
      }, 0);
      
      // Create actual allocation map
      const actualByTicker = new Map<string, { value: number; quantity: number; originalTicker: string; price: number }>();
      for (const pos of positions) {
        const originalTicker = pos.symbol.toUpperCase();
        const normalizedTicker = normalizeTicker(originalTicker);
        const value = Number(pos.quantity) * Number(pos.currentPrice);
        const existing = actualByTicker.get(normalizedTicker) || { value: 0, quantity: 0, originalTicker, price: Number(pos.currentPrice) };
        actualByTicker.set(normalizedTicker, {
          value: existing.value + value,
          quantity: existing.quantity + Number(pos.quantity),
          originalTicker: existing.originalTicker,
          price: Number(pos.currentPrice)
        });
      }
      
      // Build report positions
      const reportPositions = [];
      const processedNormalizedTickers = new Set<string>();
      
      // First, add all target allocations
      for (const allocation of targetAllocations) {
        const holding = allocation.holding;
        if (!holding) continue;
        
        const displayTicker = holding.ticker.toUpperCase();
        const normalizedTicker = normalizeTicker(displayTicker);
        processedNormalizedTickers.add(normalizedTicker);
        
        const actual = actualByTicker.get(normalizedTicker);
        const actualValue = actual?.value || 0;
        const actualPercentage = totalActualValue > 0 ? (actualValue / totalActualValue) * 100 : 0;
        const targetPercentage = Number(allocation.targetPercentage);
        const variance = actualPercentage - targetPercentage;
        const targetValue = totalActualValue > 0 ? (targetPercentage / 100) * totalActualValue : 0;
        const changeNeeded = targetValue - actualValue;
        const currentPrice = actual?.price || Number(holding.currentPrice) || 1;
        const sharesToTrade = currentPrice > 0 ? changeNeeded / currentPrice : 0;
        
        reportPositions.push({
          symbol: displayTicker,
          name: holding.name,
          quantity: actual?.quantity || 0,
          currentPrice,
          marketValue: actualValue,
          actualPercentage: Math.round(actualPercentage * 100) / 100,
          targetPercentage,
          variance: Math.round(variance * 100) / 100,
          changeNeeded: Math.round(changeNeeded * 100) / 100,
          sharesToTrade: Math.round(sharesToTrade * 100) / 100,
          status: (variance > 2 ? 'over' : variance < -2 ? 'under' : 'on-target') as 'over' | 'under' | 'on-target' | 'unexpected'
        });
      }
      
      // Add unexpected positions (no target = liquidate)
      for (const [normalizedTicker, data] of Array.from(actualByTicker)) {
        if (!processedNormalizedTickers.has(normalizedTicker)) {
          const actualPercentage = totalActualValue > 0 ? (data.value / totalActualValue) * 100 : 0;
          reportPositions.push({
            symbol: data.originalTicker,
            name: data.originalTicker,
            quantity: data.quantity,
            currentPrice: data.price,
            marketValue: data.value,
            actualPercentage: Math.round(actualPercentage * 100) / 100,
            targetPercentage: 0,
            variance: Math.round(actualPercentage * 100) / 100,
            changeNeeded: -data.value, // Need to sell everything
            sharesToTrade: -data.quantity, // Sell all shares
            status: 'unexpected' as const
          });
        }
      }
      
      // Format account type for display
      const accountTypeLabels: Record<string, string> = {
        cash: 'Cash',
        tfsa: 'TFSA',
        fhsa: 'FHSA',
        rrsp: 'RRSP',
        lira: 'LIRA',
        liff: 'LIF',
        rif: 'RIF',
        corporate_cash: 'Corporate Cash',
        ipp: 'IPP',
        joint_cash: 'Joint Cash',
        resp: 'RESP'
      };
      
      // Generate PDF
      const pdfBuffer = await generatePortfolioRebalanceReport({
        accountName: account.nickname || '',
        accountType: accountTypeLabels[account.type] || account.type.toUpperCase(),
        householdName,
        ownerName,
        totalValue: totalActualValue,
        positions: reportPositions,
        generatedAt: new Date()
      });
      
      // Send email
      const subject = `Portfolio Rebalancing Report - ${householdName} - ${accountTypeLabels[account.type] || account.type}`;
      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Portfolio Rebalancing Report</h2>
          <p>Please find attached the portfolio rebalancing report for:</p>
          <ul>
            <li><strong>Household:</strong> ${householdName}</li>
            <li><strong>Owner:</strong> ${ownerName}</li>
            <li><strong>Account:</strong> ${accountTypeLabels[account.type] || account.type}${account.nickname ? ` - ${account.nickname}` : ''}</li>
            <li><strong>Total Value:</strong> $${totalActualValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This report was generated on ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}.
          </p>
        </div>
      `;
      
      const fileName = `Portfolio_Rebalancing_${householdName.replace(/\s+/g, '_')}_${account.type}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      await sendEmailWithAttachment(email, subject, body, pdfBuffer, fileName);
      
      res.json({ 
        success: true, 
        message: `Report sent successfully to ${email}` 
      });
    } catch (error: any) {
      console.error("Error sending portfolio report:", error);
      res.status(500).json({ message: error.message || "Failed to send portfolio report" });
    }
  });

  // Utility endpoint to generate and email a task list PDF
  app.post('/api/utility/send-task-list-pdf', isAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }
      
      // @ts-ignore
      const PDFDocument = (await import('pdfkit')).default;
      
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ 
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(24).font('Helvetica-Bold')
           .text('SaaS Conversion Task List', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).font('Helvetica')
           .fillColor('#666666')
           .text('Investment Portfolio Management Platform', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10)
           .text(`Generated: ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}`, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(1);

        // Separator
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(1);

        // Phase 1
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb')
           .text('Phase 1: Data Isolation (3-4 days)');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        const phase1Tasks = [
          'Add userId to households table and update schema',
          'Create user_settings table for per-user configuration (email, webhook secret, plan type)',
          'Update storage layer - Filter all queries by userId for data isolation',
          'Update API routes to use authenticated user\'s ID for all operations'
        ];
        phase1Tasks.forEach((task, i) => {
          doc.text(`${i + 1}. ${task}`, { indent: 20 });
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);

        // Phase 2
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb')
           .text('Phase 2: User Experience (3-4 days)');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        const phase2Tasks = [
          'Create user settings page - Email configuration, webhook secret display/regenerate',
          'Update webhook endpoint to route alerts to correct user based on secret',
          'Create onboarding flow for new users (welcome screen, setup wizard)',
          'Update navigation/UI for multi-tenant experience (user dashboard, account menu)'
        ];
        phase2Tasks.forEach((task, i) => {
          doc.text(`${i + 5}. ${task}`, { indent: 20 });
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);

        // Phase 3
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb')
           .text('Phase 3: Payments (3-5 days)');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        const phase3Tasks = [
          'Integrate Stripe for subscription payments (checkout, webhooks, portal)',
          'Implement plan limits (free tier: 1 household, paid: unlimited)',
          'Add subscription status checks to protected features'
        ];
        phase3Tasks.forEach((task, i) => {
          doc.text(`${i + 9}. ${task}`, { indent: 20 });
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);

        // Phase 4
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb')
           .text('Phase 4: Polish (2-3 days)');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        const phase4Tasks = [
          'Create landing/marketing page for new visitors',
          'Add TradingView setup instructions page with user\'s unique webhook URL',
          'Testing and polish - Verify data isolation, payment flow, alert routing'
        ];
        phase4Tasks.forEach((task, i) => {
          doc.text(`${i + 12}. ${task}`, { indent: 20 });
          doc.moveDown(0.3);
        });
        doc.moveDown(1);

        // Summary section
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.5);
        
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
           .text('Estimated Timeline: 2-3 weeks');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica')
           .text('This plan converts your existing portfolio management platform into a multi-tenant SaaS product, allowing you to sell portfolio management and TradingView alert services to other users.');

        doc.end();
      });

      // Send email
      const subject = 'SaaS Conversion Task List - Investment Portfolio Platform';
      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">SaaS Conversion Task List</h2>
          <p>Please find attached the detailed task list for converting your Investment Portfolio Management Platform to a multi-tenant SaaS product.</p>
          <h3>Summary</h3>
          <ul>
            <li><strong>Phase 1:</strong> Data Isolation (3-4 days)</li>
            <li><strong>Phase 2:</strong> User Experience (3-4 days)</li>
            <li><strong>Phase 3:</strong> Payments (3-5 days)</li>
            <li><strong>Phase 4:</strong> Polish (2-3 days)</li>
          </ul>
          <p><strong>Estimated Total:</strong> 2-3 weeks</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Generated on ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
      `;
      
      const fileName = `SaaS_Conversion_TaskList_${new Date().toISOString().split('T')[0]}.pdf`;
      
      await sendEmailWithAttachment(email, subject, body, pdfBuffer, fileName);
      
      res.json({ 
        success: true, 
        message: `Task list PDF sent successfully to ${email}` 
      });
    } catch (error: any) {
      console.error("Error sending task list PDF:", error);
      res.status(500).json({ message: error.message || "Failed to send task list PDF" });
    }
  });

  // Download tasks as PDF
  app.get('/api/tasks/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getAllTasksForUser(userId);
      
      // @ts-ignore
      const PDFDocument = (await import('pdfkit')).default;
      
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ 
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(20).font('Helvetica-Bold')
           .text('Account Tasks Report', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica')
           .fillColor('#666666')
           .text(`Generated: ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}`, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.5);

        // Summary
        const pendingTasks = tasks.filter(t => t.status !== 'completed');
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent');
        const highTasks = pendingTasks.filter(t => t.priority === 'high');
        
        doc.fontSize(12).font('Helvetica-Bold').text('Summary');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica')
           .text(`Total Tasks: ${tasks.length}`)
           .text(`Pending: ${pendingTasks.length}`)
           .text(`Completed: ${completedTasks.length}`)
           .text(`Urgent Priority: ${urgentTasks.length}`)
           .text(`High Priority: ${highTasks.length}`);
        doc.moveDown(0.5);

        // Separator
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.5);

        // Group tasks by household
        const tasksByHousehold: Record<string, typeof tasks> = {};
        for (const task of tasks) {
          if (!tasksByHousehold[task.householdName]) {
            tasksByHousehold[task.householdName] = [];
          }
          tasksByHousehold[task.householdName].push(task);
        }

        // Account type labels
        const accountTypeLabels: Record<string, string> = {
          cash: 'Cash', tfsa: 'TFSA', fhsa: 'FHSA', rrsp: 'RRSP', 
          lira: 'LIRA', lif: 'LIF', rif: 'RIF',
          corporate_cash: 'Corporate Cash', ipp: 'IPP',
          joint_cash: 'Joint Cash', resp: 'RESP'
        };

        // Priority colors
        const priorityLabels: Record<string, string> = {
          urgent: 'URGENT', high: 'HIGH', medium: 'MEDIUM', low: 'LOW'
        };

        // Render each household
        for (const [householdName, householdTasks] of Object.entries(tasksByHousehold)) {
          if (doc.y > 620) {
            doc.addPage();
          }

          // Household header with underline
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563eb')
             .text(householdName);
          doc.moveTo(50, doc.y + 2).lineTo(200, doc.y + 2).strokeColor('#2563eb').lineWidth(1).stroke();
          doc.fillColor('#000000').strokeColor('#000000');
          doc.moveDown(0.6);

          // Sort tasks: pending first, then by priority
          const sortedTasks = [...householdTasks].sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (b.status === 'completed' && a.status !== 'completed') return -1;
            const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
            return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
          });

          for (const task of sortedTasks) {
            if (doc.y > 680) {
              doc.addPage();
            }

            const isCompleted = task.status === 'completed';
            const statusIcon = isCompleted ? '[X]' : '[ ]';
            const accountLabel = accountTypeLabels[task.accountTypeLabel] || task.accountTypeLabel;
            const titleColor = isCompleted ? '#666666' : '#000000';
            
            // Line 1: Status icon and task title
            doc.fontSize(11).font('Helvetica-Bold').fillColor(titleColor)
               .text(`${statusIcon} ${task.title}`);
            
            // Line 2: Account info
            doc.fontSize(9).font('Helvetica').fillColor('#444444');
            let accountInfo = `     Account: ${accountLabel}`;
            if (task.accountNickname) accountInfo += ` - ${task.accountNickname}`;
            doc.text(accountInfo);
            
            // Line 3: Owner
            doc.fontSize(9).font('Helvetica').fillColor('#444444')
               .text(`     Owner: ${task.ownerName}`);
            
            // Line 4: Priority and dates
            doc.fontSize(9).font('Helvetica').fillColor('#444444');
            let dateInfo = `     Priority: ${priorityLabels[task.priority]}`;
            if (task.dueDate) {
              const dueDate = new Date(task.dueDate);
              dateInfo += `   |   Due: ${dueDate.toLocaleDateString('en-CA')}`;
            }
            if (isCompleted && task.completedAt) {
              const completedDate = new Date(task.completedAt);
              dateInfo += `   |   Completed: ${completedDate.toLocaleDateString('en-CA')}`;
            }
            doc.text(dateInfo);
            
            // Line 5: Description (if any)
            if (task.description) {
              doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666666')
                 .text(`     ${task.description}`);
            }
            
            doc.fillColor('#000000');
            doc.moveDown(0.8);
          }

          doc.moveDown(0.3);
        }

        doc.end();
      });

      const fileName = `Account_Tasks_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
      
    } catch (error: any) {
      console.error("Error generating tasks PDF:", error);
      res.status(500).json({ message: error.message || "Failed to generate tasks PDF" });
    }
  });

  const httpServer = createServer(app);
  
  // Background job: Refresh Universal Holdings prices every 5 minutes
  const PRICE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  async function refreshUniversalHoldingsPrices() {
    console.log("[Background Job] Starting Universal Holdings price refresh...");
    try {
      const holdings = await storage.getAllUniversalHoldings();
      
      if (!holdings || holdings.length === 0) {
        console.log("[Background Job] No holdings to update");
        return;
      }
      
      // Use yahoo-finance2 v3 API
      const YahooFinance = (await import('yahoo-finance2')).default;
      const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
      
      const tickerPriceCache: Record<string, number | null> = {};
      const now = new Date();
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const holding of holdings) {
        try {
          const upperSymbol = holding.ticker.toUpperCase().trim();
          
          // Handle cash positions
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            await storage.updateUniversalHolding(holding.id, { 
              price: "1.00",
              priceUpdatedAt: now
            });
            updatedCount++;
            continue;
          }
          
          // Check cache first
          if (tickerPriceCache[holding.ticker] !== undefined) {
            const cachedPrice = tickerPriceCache[holding.ticker];
            if (cachedPrice !== null) {
              await storage.updateUniversalHolding(holding.id, { 
                price: cachedPrice.toFixed(2),
                priceUpdatedAt: now
              });
              updatedCount++;
            }
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian/US exchange suffixes
          let quote = null;
          const symbolsToTry = [holding.ticker];
          
          if (!holding.ticker.includes('.')) {
            symbolsToTry.push(`${holding.ticker}.TO`);
            symbolsToTry.push(`${holding.ticker}.V`);
            symbolsToTry.push(`${holding.ticker}.CN`);
            symbolsToTry.push(`${holding.ticker}.NE`);
          }
          
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quote(symbol);
              if (result && (result as any).regularMarketPrice) {
                quote = result as any;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (quote && quote.regularMarketPrice) {
            const price = quote.regularMarketPrice;
            tickerPriceCache[holding.ticker] = price;
            await storage.updateUniversalHolding(holding.id, { 
              price: price.toFixed(2),
              priceUpdatedAt: now
            });
            updatedCount++;
          } else {
            tickerPriceCache[holding.ticker] = null;
            errorCount++;
          }
        } catch (error) {
          tickerPriceCache[holding.ticker] = null;
          errorCount++;
        }
      }
      
      console.log(`[Background Job] Price refresh complete: ${updatedCount} updated, ${errorCount} errors`);
    } catch (error) {
      console.error("[Background Job] Error refreshing prices:", error);
    }
  }
  
  // Run initial refresh after 30 seconds (let server fully start)
  setTimeout(() => {
    refreshUniversalHoldingsPrices();
  }, 30 * 1000);
  
  // Then run every 5 minutes
  setInterval(() => {
    refreshUniversalHoldingsPrices();
  }, PRICE_REFRESH_INTERVAL);
  
  console.log("[Background Job] Price refresh scheduler started (every 5 minutes)");
  
  return httpServer;
}
