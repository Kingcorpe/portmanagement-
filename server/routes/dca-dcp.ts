// DCA (Dollar Cost Averaging) and DCP (Dollar Cost Profit) Routes
import type { Express } from "express";
import { isAuthenticated } from "../clerkAuth";
import { storage } from "../storage";
import { log } from "../logger";
import { 
  insertDcaPlanSchema, 
  updateDcaPlanSchema,
  insertDcpPlanSchema,
  updateDcpPlanSchema 
} from "@shared/schema";

// UUID parameter validation helper
function validateUUIDParam(paramName: string) {
  return (req: any, res: any, next: any) => {
    const isValidUUID = (uuid: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };
    
    const paramValue = req.params[paramName];
    if (paramValue && !isValidUUID(paramValue)) {
      return res.status(400).json({ message: `Invalid ${paramName} format` });
    }
    next();
  };
}

export function registerDcaDcpRoutes(app: Express) {
  // ==========================================
  // DCA Plan Routes
  // ==========================================

  // Get all DCA plans for current user
  app.get('/api/dca-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const plans = await storage.getDcaPlansForUser(userId);
      res.json(plans);
    } catch (error) {
      log.error("Error fetching DCA plans", error);
      res.status(500).json({ message: "Failed to fetch DCA plans" });
    }
  });

  // Get DCA plans for a specific account
  app.get('/api/individual-accounts/:accountId/dca-plans', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
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
      
      const plans = await storage.getDcaPlansByIndividualAccount(req.params.accountId);
      res.json(plans);
    } catch (error) {
      log.error("Error fetching DCA plans", error);
      res.status(500).json({ message: "Failed to fetch DCA plans" });
    }
  });

  app.get('/api/corporate-accounts/:accountId/dca-plans', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
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
      
      const plans = await storage.getDcaPlansByCorporateAccount(req.params.accountId);
      res.json(plans);
    } catch (error) {
      log.error("Error fetching DCA plans", error);
      res.status(500).json({ message: "Failed to fetch DCA plans" });
    }
  });

  app.get('/api/joint-accounts/:accountId/dca-plans', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
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
      
      const plans = await storage.getDcaPlansByJointAccount(req.params.accountId);
      res.json(plans);
    } catch (error) {
      log.error("Error fetching DCA plans", error);
      res.status(500).json({ message: "Failed to fetch DCA plans" });
    }
  });

  // Create DCA plan
  app.post('/api/dca-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertDcaPlanSchema.parse(req.body);
      
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
      
      // Add userId to the plan
      const planWithUser = { ...parsed, userId };
      const plan = await storage.createDcaPlan(planWithUser);
      
      log.info(`DCA plan created for ${plan.symbol} by user ${userId}`);
      res.json(plan);
    } catch (error: any) {
      log.error("Error creating DCA plan", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create DCA plan" });
    }
  });

  // Update DCA plan
  app.patch('/api/dca-plans/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getDcaPlan(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "DCA plan not found" });
      }
      
      // Check ownership
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateDcaPlanSchema.parse(req.body);
      // Convert numeric fields to strings for database storage
      const updateData: any = { ...parsed };
      if (updateData.targetAllocationPct !== undefined) {
        updateData.targetAllocationPct = updateData.targetAllocationPct.toString();
      }
      if (updateData.currentAllocationPct !== undefined) {
        updateData.currentAllocationPct = updateData.currentAllocationPct.toString();
      }
      if (updateData.incrementPct !== undefined && updateData.incrementPct !== null) {
        updateData.incrementPct = updateData.incrementPct.toString();
      }
      if (updateData.amountPerPeriod !== undefined && updateData.amountPerPeriod !== null) {
        updateData.amountPerPeriod = updateData.amountPerPeriod.toString();
      }
      const plan = await storage.updateDcaPlan(req.params.id, updateData);
      res.json(plan);
    } catch (error: any) {
      log.error("Error updating DCA plan", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update DCA plan" });
    }
  });

  // Mark DCA plan execution (increment counter, update dates)
  app.post('/api/dca-plans/:id/execute', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getDcaPlan(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "DCA plan not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update execution tracking
      const now = new Date();
      const currentPct = parseFloat(existing.currentAllocationPct || '0');
      const incrementPct = parseFloat(existing.incrementPct || '0');
      const targetPct = parseFloat(existing.targetAllocationPct || '0');
      
      // Calculate new allocation
      let newAllocationPct = currentPct + incrementPct;
      let newStatus = existing.status;
      
      // Check if target reached
      if (newAllocationPct >= targetPct) {
        newAllocationPct = targetPct;
        newStatus = 'completed';
      }
      
      // Calculate next execution date based on frequency
      let nextExecutionDate: Date | null = null;
      if (newStatus !== 'completed') {
        nextExecutionDate = calculateNextExecutionDate(existing.frequency, existing.dayOfPeriod);
      }
      
      const plan = await storage.updateDcaPlan(req.params.id, {
        executionCount: existing.executionCount + 1,
        lastExecutionDate: now,
        nextExecutionDate,
        currentAllocationPct: newAllocationPct.toString(),
        status: newStatus,
      });
      
      log.info(`DCA plan executed for ${existing.symbol}: ${currentPct}% → ${newAllocationPct}%`);
      res.json(plan);
    } catch (error) {
      log.error("Error executing DCA plan", error);
      res.status(500).json({ message: "Failed to execute DCA plan" });
    }
  });

  // Delete DCA plan
  app.delete('/api/dca-plans/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getDcaPlan(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "DCA plan not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteDcaPlan(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting DCA plan", error);
      res.status(500).json({ message: "Failed to delete DCA plan" });
    }
  });

  // ==========================================
  // DCP Plan Routes
  // ==========================================

  // Get all DCP plans for current user
  app.get('/api/dcp-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const plans = await storage.getDcpPlansForUser(userId);
      res.json(plans);
    } catch (error) {
      log.error("Error fetching DCP plans", error);
      res.status(500).json({ message: "Failed to fetch DCP plans" });
    }
  });

  // Get DCP plans for a specific account
  app.get('/api/individual-accounts/:accountId/dcp-plans', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
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
      
      const plans = await storage.getDcpPlansByIndividualAccount(req.params.accountId);
      res.json(plans);
    } catch (error) {
      log.error("Error fetching DCP plans", error);
      res.status(500).json({ message: "Failed to fetch DCP plans" });
    }
  });

  app.get('/api/corporate-accounts/:accountId/dcp-plans', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
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
      
      const plans = await storage.getDcpPlansByCorporateAccount(req.params.accountId);
      res.json(plans);
    } catch (error) {
      log.error("Error fetching DCP plans", error);
      res.status(500).json({ message: "Failed to fetch DCP plans" });
    }
  });

  app.get('/api/joint-accounts/:accountId/dcp-plans', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
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
      
      const plans = await storage.getDcpPlansByJointAccount(req.params.accountId);
      res.json(plans);
    } catch (error) {
      log.error("Error fetching DCP plans", error);
      res.status(500).json({ message: "Failed to fetch DCP plans" });
    }
  });

  // Create DCP plan
  app.post('/api/dcp-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertDcpPlanSchema.parse(req.body);
      
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
      
      const planWithUser = { ...parsed, userId };
      const plan = await storage.createDcpPlan(planWithUser);
      
      log.info(`DCP plan created for ${plan.symbol} by user ${userId}`);
      res.json(plan);
    } catch (error: any) {
      log.error("Error creating DCP plan", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create DCP plan" });
    }
  });

  // Update DCP plan
  app.patch('/api/dcp-plans/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getDcpPlan(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "DCP plan not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateDcpPlanSchema.parse(req.body);
      // Convert numeric fields to strings for database storage
      const updateData: any = { ...parsed };
      if (updateData.sellPercentage !== undefined && updateData.sellPercentage !== null) {
        updateData.sellPercentage = updateData.sellPercentage.toString();
      }
      if (updateData.sellAmount !== undefined && updateData.sellAmount !== null) {
        updateData.sellAmount = updateData.sellAmount.toString();
      }
      if (updateData.targetPrice !== undefined && updateData.targetPrice !== null) {
        updateData.targetPrice = updateData.targetPrice.toString();
      }
      if (updateData.targetGainPct !== undefined && updateData.targetGainPct !== null) {
        updateData.targetGainPct = updateData.targetGainPct.toString();
      }
      if (updateData.trailingStopPct !== undefined && updateData.trailingStopPct !== null) {
        updateData.trailingStopPct = updateData.trailingStopPct.toString();
      }
      if (updateData.targetAllocationPct !== undefined && updateData.targetAllocationPct !== null) {
        updateData.targetAllocationPct = updateData.targetAllocationPct.toString();
      }
      if (updateData.totalProfit !== undefined && updateData.totalProfit !== null) {
        updateData.totalProfit = updateData.totalProfit.toString();
      }
      const plan = await storage.updateDcpPlan(req.params.id, updateData);
      res.json(plan);
    } catch (error: any) {
      log.error("Error updating DCP plan", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update DCP plan" });
    }
  });

  // Record DCP execution (profit taking)
  app.post('/api/dcp-plans/:id/execute', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getDcpPlan(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "DCP plan not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { profit } = req.body; // Optional: profit realized from this execution
      const now = new Date();
      
      const currentProfit = parseFloat(existing.totalProfit || '0');
      const executionProfit = parseFloat(profit || '0');
      
      // Calculate next execution date for scheduled sells
      let nextExecutionDate: Date | null = null;
      if (existing.triggerType === 'scheduled' && existing.frequency) {
        nextExecutionDate = calculateNextExecutionDate(existing.frequency, existing.dayOfPeriod);
      }
      
      const plan = await storage.updateDcpPlan(req.params.id, {
        executionCount: existing.executionCount + 1,
        lastExecutionDate: now,
        nextExecutionDate,
        totalProfit: (currentProfit + executionProfit).toString(),
      });
      
      log.info(`DCP plan executed for ${existing.symbol}: +$${executionProfit} profit`);
      res.json(plan);
    } catch (error) {
      log.error("Error executing DCP plan", error);
      res.status(500).json({ message: "Failed to execute DCP plan" });
    }
  });

  // Delete DCP plan
  app.delete('/api/dcp-plans/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getDcpPlan(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "DCP plan not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteDcpPlan(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting DCP plan", error);
      res.status(500).json({ message: "Failed to delete DCP plan" });
    }
  });

  // ==========================================
  // Dividend Dashboard Routes
  // ==========================================

  // Get dividend projections for all user's holdings
  app.get('/api/dividends/projections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projections = await storage.getDividendProjectionsForUser(userId);
      res.json(projections);
    } catch (error) {
      log.error("Error fetching dividend projections", error);
      res.status(500).json({ message: "Failed to fetch dividend projections" });
    }
  });

  // Get upcoming ex-dividend dates
  app.get('/api/dividends/calendar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const calendar = await storage.getDividendCalendarForUser(userId);
      res.json(calendar);
    } catch (error) {
      log.error("Error fetching dividend calendar", error);
      res.status(500).json({ message: "Failed to fetch dividend calendar" });
    }
  });

  // Get dividend summary by account
  app.get('/api/dividends/by-account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const summary = await storage.getDividendSummaryByAccount(userId);
      res.json(summary);
    } catch (error) {
      log.error("Error fetching dividend summary", error);
      res.status(500).json({ message: "Failed to fetch dividend summary" });
    }
  });
}

// Helper function to calculate next execution date
function calculateNextExecutionDate(frequency: string | null, dayOfPeriod: number | null): Date {
  const now = new Date();
  const day = dayOfPeriod || 15;
  
  switch (frequency) {
    case 'weekly': {
      // Day is day of week (1=Monday, 7=Sunday)
      const daysUntilNext = ((day - now.getDay()) + 7) % 7 || 7;
      return new Date(now.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
    }
    case 'bi_weekly': {
      const daysUntilNext = ((day - now.getDay()) + 7) % 7 || 7;
      return new Date(now.getTime() + (daysUntilNext + 7) * 24 * 60 * 60 * 1000);
    }
    case 'monthly': {
      // Day is day of month (1-31)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(day, 28));
      if (now.getDate() < day && now.getMonth() === nextMonth.getMonth() - 1) {
        return new Date(now.getFullYear(), now.getMonth(), day);
      }
      return nextMonth;
    }
    case 'quarterly': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const nextQuarterMonth = (currentQuarter + 1) * 3;
      return new Date(now.getFullYear() + (nextQuarterMonth > 11 ? 1 : 0), nextQuarterMonth % 12, day);
    }
    default:
      // Default to 30 days from now
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}

