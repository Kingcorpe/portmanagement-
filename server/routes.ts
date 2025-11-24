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
  updateHouseholdSchema,
  updateIndividualSchema,
  updateCorporationSchema,
  updateIndividualAccountSchema,
  updateCorporateAccountSchema,
  updateJointAccountSchema,
  updatePositionSchema,
  updateAlertSchema,
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

  const httpServer = createServer(app);
  return httpServer;
}
