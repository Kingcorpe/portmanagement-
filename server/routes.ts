// Based on blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
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
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication middleware
  await setupAuth(app);

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
  app.get('/api/households', isAuthenticated, async (req, res) => {
    try {
      const households = await storage.getAllHouseholds();
      res.json(households);
    } catch (error) {
      console.error("Error fetching households:", error);
      res.status(500).json({ message: "Failed to fetch households" });
    }
  });

  app.get('/api/households/full', isAuthenticated, async (req, res) => {
    try {
      const households = await storage.getAllHouseholdsWithDetails();
      console.log('[DEBUG] Sample account from first household:', JSON.stringify(households[0]?.individuals[0]?.accounts[0], null, 2));
      res.json(households);
    } catch (error) {
      console.error("Error fetching household details:", error);
      res.status(500).json({ message: "Failed to fetch household details" });
    }
  });

  app.post('/api/households', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertHouseholdSchema.parse(req.body);
      const household = await storage.createHousehold(parsed);
      res.json(household);
    } catch (error: any) {
      console.error("Error creating household:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create household" });
    }
  });

  app.get('/api/households/:id', isAuthenticated, async (req, res) => {
    try {
      const household = await storage.getHousehold(req.params.id);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      res.json(household);
    } catch (error) {
      console.error("Error fetching household:", error);
      res.status(500).json({ message: "Failed to fetch household" });
    }
  });

  app.get('/api/households/:id/full', isAuthenticated, async (req, res) => {
    try {
      const household = await storage.getHouseholdWithDetails(req.params.id);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      res.json(household);
    } catch (error) {
      console.error("Error fetching household details:", error);
      res.status(500).json({ message: "Failed to fetch household details" });
    }
  });

  app.patch('/api/households/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updateHouseholdSchema.parse(req.body);
      const household = await storage.updateHousehold(req.params.id, parsed);
      res.json(household);
    } catch (error: any) {
      console.error("Error updating household:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update household" });
    }
  });

  app.delete('/api/households/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteHousehold(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting household:", error);
      res.status(500).json({ message: "Failed to delete household" });
    }
  });

  // Individual routes
  app.get('/api/households/:householdId/individuals', isAuthenticated, async (req, res) => {
    try {
      const individuals = await storage.getIndividualsByHousehold(req.params.householdId);
      res.json(individuals);
    } catch (error) {
      console.error("Error fetching individuals:", error);
      res.status(500).json({ message: "Failed to fetch individuals" });
    }
  });

  app.post('/api/individuals', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertIndividualSchema.parse(req.body);
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

  app.patch('/api/individuals/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertIndividualSchema.partial().parse(req.body);
      const individual = await storage.updateIndividual(req.params.id, parsed);
      res.json(individual);
    } catch (error: any) {
      console.error("Error updating individual:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update individual" });
    }
  });

  app.delete('/api/individuals/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteIndividual(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting individual:", error);
      res.status(500).json({ message: "Failed to delete individual" });
    }
  });

  // Corporation routes
  app.get('/api/households/:householdId/corporations', isAuthenticated, async (req, res) => {
    try {
      const corporations = await storage.getCorporationsByHousehold(req.params.householdId);
      res.json(corporations);
    } catch (error) {
      console.error("Error fetching corporations:", error);
      res.status(500).json({ message: "Failed to fetch corporations" });
    }
  });

  app.post('/api/corporations', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertCorporationSchema.parse(req.body);
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

  app.patch('/api/corporations/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertCorporationSchema.partial().parse(req.body);
      const corporation = await storage.updateCorporation(req.params.id, parsed);
      res.json(corporation);
    } catch (error: any) {
      console.error("Error updating corporation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update corporation" });
    }
  });

  app.delete('/api/corporations/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCorporation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting corporation:", error);
      res.status(500).json({ message: "Failed to delete corporation" });
    }
  });

  // Individual account routes
  app.get('/api/individuals/:individualId/accounts', isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getIndividualAccountsByIndividual(req.params.individualId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching individual accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post('/api/individual-accounts', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertIndividualAccountSchema.parse(req.body);
      const account = await storage.createIndividualAccount(parsed);
      res.json(account);
    } catch (error: any) {
      console.error("Error creating individual account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create individual account" });
    }
  });

  app.patch('/api/individual-accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updateIndividualAccountSchema.parse(req.body);
      const account = await storage.updateIndividualAccount(req.params.id, parsed);
      res.json(account);
    } catch (error: any) {
      console.error("Error updating individual account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update individual account" });
    }
  });

  app.delete('/api/individual-accounts/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteIndividualAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting individual account:", error);
      res.status(500).json({ message: "Failed to delete individual account" });
    }
  });

  // Corporate account routes
  app.get('/api/corporations/:corporationId/accounts', isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getCorporateAccountsByCorporation(req.params.corporationId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching corporate accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post('/api/corporate-accounts', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertCorporateAccountSchema.parse(req.body);
      const account = await storage.createCorporateAccount(parsed);
      res.json(account);
    } catch (error: any) {
      console.error("Error creating corporate account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create corporate account" });
    }
  });

  app.patch('/api/corporate-accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updateCorporateAccountSchema.parse(req.body);
      const account = await storage.updateCorporateAccount(req.params.id, parsed);
      res.json(account);
    } catch (error: any) {
      console.error("Error updating corporate account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update corporate account" });
    }
  });

  app.delete('/api/corporate-accounts/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCorporateAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting corporate account:", error);
      res.status(500).json({ message: "Failed to delete corporate account" });
    }
  });

  // Joint account routes
  app.get('/api/households/:householdId/joint-accounts', isAuthenticated, async (req, res) => {
    try {
      const jointAccounts = await storage.getJointAccountsByHousehold(req.params.householdId);
      res.json(jointAccounts);
    } catch (error) {
      console.error("Error fetching joint accounts:", error);
      res.status(500).json({ message: "Failed to fetch joint accounts" });
    }
  });

  app.post('/api/joint-accounts', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertJointAccountSchema.parse(req.body);
      const jointAccount = await storage.createJointAccount(parsed);
      res.json(jointAccount);
    } catch (error: any) {
      console.error("Error creating joint account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create joint account" });
    }
  });

  app.patch('/api/joint-accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updateJointAccountSchema.parse(req.body);
      const jointAccount = await storage.updateJointAccount(req.params.id, parsed);
      res.json(jointAccount);
    } catch (error: any) {
      console.error("Error updating joint account:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update joint account" });
    }
  });

  app.delete('/api/joint-accounts/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteJointAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting joint account:", error);
      res.status(500).json({ message: "Failed to delete joint account" });
    }
  });

  // Joint account ownership routes
  app.get('/api/joint-accounts/:jointAccountId/owners', isAuthenticated, async (req, res) => {
    try {
      const owners = await storage.getJointAccountOwners(req.params.jointAccountId);
      res.json(owners);
    } catch (error) {
      console.error("Error fetching joint account owners:", error);
      res.status(500).json({ message: "Failed to fetch owners" });
    }
  });

  app.post('/api/joint-account-ownership', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertJointAccountOwnershipSchema.parse(req.body);
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
  app.get('/api/alerts', isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as "pending" | "executed" | "dismissed" | undefined;
      const alerts = status
        ? await storage.getAlertsByStatus(status)
        : await storage.getAllAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.patch('/api/alerts/:id', isAuthenticated, async (req, res) => {
    try {
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

  // TradingView webhook endpoint - validates secret for security
  app.post('/api/webhooks/tradingview', async (req, res) => {
    try {
      // Validate webhook secret if configured
      const webhookSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
      if (webhookSecret) {
        const providedSecret = req.headers['x-webhook-secret'] || req.body.secret;
        if (providedSecret !== webhookSecret) {
          return res.status(401).json({ message: "Unauthorized: Invalid webhook secret" });
        }
      }
      
      // Validate webhook payload
      const parsed = tradingViewWebhookSchema.parse(req.body);
      
      const alert = await storage.createAlert({
        symbol: parsed.symbol,
        signal: parsed.signal,
        price: parsed.price.toString(),
        message: parsed.message || '',
        webhookData: req.body,
      });
      
      res.json({ success: true, alertId: alert.id });
    } catch (error: any) {
      console.error("Error processing TradingView webhook:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid webhook data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Position routes
  app.get('/api/individual-accounts/:accountId/positions', isAuthenticated, async (req, res) => {
    try {
      const positions = await storage.getPositionsByIndividualAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.get('/api/corporate-accounts/:accountId/positions', isAuthenticated, async (req, res) => {
    try {
      const positions = await storage.getPositionsByCorporateAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.get('/api/joint-accounts/:accountId/positions', isAuthenticated, async (req, res) => {
    try {
      const positions = await storage.getPositionsByJointAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.post('/api/positions', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertPositionSchema.parse(req.body);
      const position = await storage.createPosition(parsed);
      res.json(position);
    } catch (error: any) {
      console.error("Error creating position:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create position" });
    }
  });

  app.patch('/api/positions/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updatePositionSchema.parse(req.body);
      const position = await storage.updatePosition(req.params.id, parsed);
      res.json(position);
    } catch (error: any) {
      console.error("Error updating position:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update position" });
    }
  });

  app.delete('/api/positions/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deletePosition(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting position:", error);
      res.status(500).json({ message: "Failed to delete position" });
    }
  });

  // Bulk upload positions from CSV
  app.post('/api/positions/bulk', isAuthenticated, async (req, res) => {
    try {
      const { positions, accountType, accountId } = req.body;
      
      if (!Array.isArray(positions) || positions.length === 0) {
        return res.status(400).json({ message: "No positions provided" });
      }
      
      if (!accountType || !accountId) {
        return res.status(400).json({ message: "Account type and ID are required" });
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
          
          const parsed = insertPositionSchema.parse(positionData);
          const position = await storage.createPosition(parsed);
          createdPositions.push(position);
        } catch (error: any) {
          errors.push({ row: i + 1, symbol: pos.symbol, error: error.message });
        }
      }
      
      res.json({
        success: true,
        created: createdPositions.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully imported ${createdPositions.length} positions${errors.length > 0 ? `, ${errors.length} failed` : ''}`
      });
    } catch (error: any) {
      console.error("Error bulk creating positions:", error);
      res.status(500).json({ message: "Failed to import positions", error: error.message });
    }
  });

  // Account Target Allocation routes
  app.get('/api/accounts/:accountType/:accountId/target-allocations', isAuthenticated, async (req, res) => {
    try {
      const { accountType, accountId } = req.params;
      
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

  app.post('/api/accounts/:accountType/:accountId/target-allocations', isAuthenticated, async (req, res) => {
    try {
      const { accountType, accountId } = req.params;
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

  app.patch('/api/account-target-allocations/:id', isAuthenticated, async (req, res) => {
    try {
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

  app.delete('/api/account-target-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAccountTargetAllocation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting account target allocation:", error);
      res.status(500).json({ message: "Failed to delete account target allocation" });
    }
  });

  // Copy allocations from a model portfolio to an account
  app.post('/api/accounts/:accountType/:accountId/copy-from-portfolio/:portfolioId', isAuthenticated, async (req, res) => {
    try {
      const { accountType, accountId, portfolioId } = req.params;
      
      // Validate account type
      if (!['individual', 'corporate', 'joint'].includes(accountType)) {
        return res.status(400).json({ message: "Invalid account type" });
      }
      
      // Get the model portfolio with allocations
      const modelPortfolio = await storage.getPlannedPortfolioWithAllocations(portfolioId);
      if (!modelPortfolio) {
        return res.status(404).json({ message: "Model portfolio not found" });
      }
      
      // Delete existing allocations for this account
      await storage.deleteAllAccountTargetAllocations(accountType as 'individual' | 'corporate' | 'joint', accountId);
      
      // Copy allocations from model portfolio
      const createdAllocations = [];
      for (const allocation of modelPortfolio.allocations || []) {
        const newAllocation = await storage.createAccountTargetAllocation({
          universalHoldingId: allocation.universalHoldingId,
          targetPercentage: allocation.targetPercentage,
          individualAccountId: accountType === 'individual' ? accountId : null,
          corporateAccountId: accountType === 'corporate' ? accountId : null,
          jointAccountId: accountType === 'joint' ? accountId : null,
        });
        createdAllocations.push(newAllocation);
      }
      
      res.json({
        success: true,
        copiedFrom: modelPortfolio.name,
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
      // Store both normalized and original ticker for display
      const actualByTicker = new Map<string, { value: number; quantity: number; originalTicker: string }>();
      for (const pos of positions) {
        const originalTicker = pos.symbol.toUpperCase();
        const normalizedTicker = normalizeTicker(originalTicker);
        const value = Number(pos.quantity) * Number(pos.currentPrice);
        const existing = actualByTicker.get(normalizedTicker) || { value: 0, quantity: 0, originalTicker };
        actualByTicker.set(normalizedTicker, {
          value: existing.value + value,
          quantity: existing.quantity + Number(pos.quantity),
          originalTicker: existing.originalTicker
        });
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
        
        comparison.push({
          allocationId: allocation.id,
          ticker: displayTicker,
          name: holding.name,
          targetPercentage,
          actualPercentage: Math.round(actualPercentage * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          actualValue: Math.round(actualValue * 100) / 100,
          targetValue: totalActualValue > 0 ? Math.round((targetPercentage / 100) * totalActualValue * 100) / 100 : 0,
          quantity: actual?.quantity || 0,
          status: variance > 2 ? 'over' : variance < -2 ? 'under' : 'on-target'
        });
      }
      
      // Add any positions that aren't in the target allocations (unexpected holdings)
      for (const [normalizedTicker, data] of Array.from(actualByTicker)) {
        if (!processedNormalizedTickers.has(normalizedTicker)) {
          const actualPercentage = totalActualValue > 0 ? (data.value / totalActualValue) * 100 : 0;
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
            status: 'unexpected'
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
  app.get('/api/trades', isAuthenticated, async (req, res) => {
    try {
      const trades = await storage.getAllTrades();
      res.json(trades);
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.post('/api/trades', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertTradeSchema.parse(req.body);
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
  app.get('/api/planned-portfolios', isAuthenticated, async (req, res) => {
    try {
      const portfolios = await storage.getAllPlannedPortfoliosWithAllocations();
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching planned portfolios:", error);
      res.status(500).json({ message: "Failed to fetch planned portfolios" });
    }
  });

  app.post('/api/planned-portfolios', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertPlannedPortfolioSchema.parse(req.body);
      const portfolio = await storage.createPlannedPortfolio(parsed);
      res.json(portfolio);
    } catch (error: any) {
      console.error("Error creating planned portfolio:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create planned portfolio" });
    }
  });

  app.get('/api/planned-portfolios/:id', isAuthenticated, async (req, res) => {
    try {
      const portfolio = await storage.getPlannedPortfolioWithAllocations(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Planned portfolio not found" });
      }
      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching planned portfolio:", error);
      res.status(500).json({ message: "Failed to fetch planned portfolio" });
    }
  });

  app.patch('/api/planned-portfolios/:id', isAuthenticated, async (req, res) => {
    try {
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

  app.delete('/api/planned-portfolios/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deletePlannedPortfolio(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting planned portfolio:", error);
      res.status(500).json({ message: "Failed to delete planned portfolio" });
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
  app.get('/api/freelance-portfolios', isAuthenticated, async (req, res) => {
    try {
      const portfolios = await storage.getAllFreelancePortfoliosWithAllocations();
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching freelance portfolios:", error);
      res.status(500).json({ message: "Failed to fetch freelance portfolios" });
    }
  });

  app.post('/api/freelance-portfolios', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertFreelancePortfolioSchema.parse(req.body);
      const portfolio = await storage.createFreelancePortfolio(parsed);
      res.json(portfolio);
    } catch (error: any) {
      console.error("Error creating freelance portfolio:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create freelance portfolio" });
    }
  });

  app.get('/api/freelance-portfolios/:id', isAuthenticated, async (req, res) => {
    try {
      const portfolio = await storage.getFreelancePortfolioWithAllocations(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Freelance portfolio not found" });
      }
      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching freelance portfolio:", error);
      res.status(500).json({ message: "Failed to fetch freelance portfolio" });
    }
  });

  app.patch('/api/freelance-portfolios/:id', isAuthenticated, async (req, res) => {
    try {
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

  app.delete('/api/freelance-portfolios/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteFreelancePortfolio(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting freelance portfolio:", error);
      res.status(500).json({ message: "Failed to delete freelance portfolio" });
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

  const httpServer = createServer(app);
  return httpServer;
}
