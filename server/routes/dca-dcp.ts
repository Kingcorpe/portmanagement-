// DCA (Dollar Cost Averaging) and DCP (Dollar Cost Profit) Routes
import type { Express } from "express";
import { isAuthenticated } from "../clerkAuth";
import { storage } from "../storage";
import { log } from "../logger";
import { sendEmail } from "../gmail";
import { 
  insertDcaPlanSchema, 
  updateDcaPlanSchema,
  insertDcpPlanSchema,
  updateDcpPlanSchema,
  insertExecutionHistorySchema,
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
      
      // Determine account type and get household ID (optional - plan can exist without account)
      let householdId: string | null = null;
      if (parsed.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', parsed.individualAccountId);
      } else if (parsed.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', parsed.corporateAccountId);
      } else if (parsed.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      }
      
      // If account is specified, verify access
      if (householdId) {
        const canEdit = await storage.canUserEditHousehold(userId, householdId);
        if (!canEdit) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (parsed.individualAccountId || parsed.corporateAccountId || parsed.jointAccountId) {
        // Account was specified but not found
        return res.status(404).json({ message: "Account not found" });
      }
      // If no account specified, allow creation (plan without account link)
      
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

  // Mark DCA plan execution (increment counter, update dates, record history)
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
      
      // Get optional execution details from request body
      const { quantity, price, amount, notes } = req.body;
      
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
      
      // Record execution history
      await storage.createExecutionHistory({
        userId,
        executionType: 'dca',
        dcaPlanId: req.params.id,
        symbol: existing.symbol,
        action: 'BUY',
        quantity: quantity?.toString(),
        price: price?.toString(),
        amount: amount?.toString() || existing.amountPerPeriod || undefined,
        previousAllocationPct: currentPct.toString(),
        newAllocationPct: newAllocationPct.toString(),
        notes,
        executedAt: now,
      });
      
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

  // Get execution history for a DCA plan
  app.get('/api/dca-plans/:id/history', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getDcaPlan(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "DCA plan not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const history = await storage.getExecutionHistoryForDcaPlan(req.params.id);
      res.json(history);
    } catch (error) {
      log.error("Error fetching DCA execution history", error);
      res.status(500).json({ message: "Failed to fetch execution history" });
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
      
      // Determine account type and get household ID (optional - plan can exist without account)
      let householdId: string | null = null;
      if (parsed.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', parsed.individualAccountId);
      } else if (parsed.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', parsed.corporateAccountId);
      } else if (parsed.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      }
      
      // If account is specified, verify access
      if (householdId) {
        const canEdit = await storage.canUserEditHousehold(userId, householdId);
        if (!canEdit) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (parsed.individualAccountId || parsed.corporateAccountId || parsed.jointAccountId) {
        // Account was specified but not found
        return res.status(404).json({ message: "Account not found" });
      }
      // If no account specified, allow creation (plan without account link)
      
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
      
      // Get execution details from request body
      const { profit, quantity, price, amount, notes } = req.body;
      const now = new Date();
      
      const currentProfit = parseFloat(existing.totalProfit || '0');
      const executionProfit = parseFloat(profit || '0');
      
      // Calculate next execution date for scheduled sells
      let nextExecutionDate: Date | null = null;
      if (existing.triggerType === 'scheduled' && existing.frequency) {
        nextExecutionDate = calculateNextExecutionDate(existing.frequency, existing.dayOfPeriod);
      }
      
      // Record execution history
      await storage.createExecutionHistory({
        userId,
        executionType: 'dcp',
        dcpPlanId: req.params.id,
        symbol: existing.symbol,
        action: 'SELL',
        quantity: quantity?.toString(),
        price: price?.toString(),
        amount: amount?.toString() || existing.sellAmount || undefined,
        profit: executionProfit.toString(),
        notes,
        executedAt: now,
      });
      
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

  // Get execution history for a DCP plan
  app.get('/api/dcp-plans/:id/history', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getDcpPlan(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "DCP plan not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const history = await storage.getExecutionHistoryForDcpPlan(req.params.id);
      res.json(history);
    } catch (error) {
      log.error("Error fetching DCP execution history", error);
      res.status(500).json({ message: "Failed to fetch execution history" });
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

  // ==========================================
  // Execution History Routes
  // ==========================================

  // Get all execution history for current user
  app.get('/api/execution-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getExecutionHistoryForUser(userId);
      res.json(history);
    } catch (error) {
      log.error("Error fetching execution history", error);
      res.status(500).json({ message: "Failed to fetch execution history" });
    }
  });

  // ==========================================
  // Plans Due for Execution
  // ==========================================

  // Get plans that are due for execution (for dashboard/reminders)
  app.get('/api/plans/due', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all user's DCA and DCP plans that need execution
      const dueDcaPlans = await storage.getActiveDcaPlansNeedingExecution();
      const dueDcpPlans = await storage.getActiveDcpPlansNeedingExecution();
      
      // Filter to only user's plans
      const userDcaPlans = dueDcaPlans.filter(p => p.userId === userId);
      const userDcpPlans = dueDcpPlans.filter(p => p.userId === userId);
      
      res.json({
        dcaPlans: userDcaPlans,
        dcpPlans: userDcpPlans,
        totalDue: userDcaPlans.length + userDcpPlans.length,
      });
    } catch (error) {
      log.error("Error fetching due plans", error);
      res.status(500).json({ message: "Failed to fetch due plans" });
    }
  });

  // Generate tasks for plans due (creates account tasks for plans needing execution)
  app.post('/api/plans/generate-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const dueDcaPlans = await storage.getActiveDcaPlansNeedingExecution();
      const dueDcpPlans = await storage.getActiveDcpPlansNeedingExecution();
      
      // Filter to user's plans
      const userDcaPlans = dueDcaPlans.filter(p => p.userId === userId);
      const userDcpPlans = dueDcpPlans.filter(p => p.userId === userId);
      
      let tasksCreated = 0;
      
      // Create tasks for DCA plans
      for (const plan of userDcaPlans) {
        const accountId = plan.individualAccountId || plan.corporateAccountId || plan.jointAccountId;
        if (accountId) {
          try {
            await storage.createAccountTask({
              individualAccountId: plan.individualAccountId || undefined,
              corporateAccountId: plan.corporateAccountId || undefined,
              jointAccountId: plan.jointAccountId || undefined,
              title: `DCA: Buy ${plan.symbol} (${plan.currentAllocationPct}% → ${plan.targetAllocationPct}%)`,
              description: `Dollar Cost Averaging plan is due for execution. Increment: ${plan.incrementPct || 'N/A'}%`,
              status: 'pending',
              priority: 'high',
            });
            tasksCreated++;
          } catch (taskError) {
            log.warn(`Failed to create task for DCA plan ${plan.id}`, taskError);
          }
        }
      }
      
      // Create tasks for DCP plans
      for (const plan of userDcpPlans) {
        const accountId = plan.individualAccountId || plan.corporateAccountId || plan.jointAccountId;
        if (accountId) {
          try {
            await storage.createAccountTask({
              individualAccountId: plan.individualAccountId || undefined,
              corporateAccountId: plan.corporateAccountId || undefined,
              jointAccountId: plan.jointAccountId || undefined,
              title: `DCP: Sell ${plan.symbol} - Scheduled profit taking`,
              description: `Dollar Cost Profit plan is due for execution. Sell: ${plan.sellPercentage || plan.sellAmount || 'N/A'}`,
              status: 'pending',
              priority: 'high',
            });
            tasksCreated++;
          } catch (taskError) {
            log.warn(`Failed to create task for DCP plan ${plan.id}`, taskError);
          }
        }
      }
      
      log.info(`Generated ${tasksCreated} tasks for due DCA/DCP plans for user ${userId}`);
      
      res.json({
        tasksCreated,
        dcaPlansDue: userDcaPlans.length,
        dcpPlansDue: userDcpPlans.length,
      });
    } catch (error) {
      log.error("Error generating tasks for due plans", error);
      res.status(500).json({ message: "Failed to generate tasks" });
    }
  });

  // ==========================================
  // Email Notifications
  // ==========================================

  // Send email summary of due plans
  app.post('/api/plans/send-summary-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address required" });
      }
      
      // Get due plans
      const dueDcaPlans = await storage.getActiveDcaPlansNeedingExecution();
      const dueDcpPlans = await storage.getActiveDcpPlansNeedingExecution();
      
      const userDcaPlans = dueDcaPlans.filter(p => p.userId === userId);
      const userDcpPlans = dueDcpPlans.filter(p => p.userId === userId);
      
      // Get recent executions
      const recentHistory = await storage.getExecutionHistoryForUser(userId);
      const last7Days = recentHistory.filter(h => {
        const execDate = new Date(h.executedAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return execDate >= weekAgo;
      });
      
      // Build HTML email
      const htmlBody = buildDcaDcpEmailSummary(userDcaPlans, userDcpPlans, last7Days);
      
      await sendEmail(
        email,
        `Portfolio Automation Summary - ${new Date().toLocaleDateString('en-CA')}`,
        htmlBody
      );
      
      log.info(`Sent DCA/DCP summary email to ${email} for user ${userId}`);
      
      res.json({ 
        success: true,
        dcaPlansDue: userDcaPlans.length,
        dcpPlansDue: userDcpPlans.length,
        recentExecutions: last7Days.length,
      });
    } catch (error: any) {
      log.error("Error sending summary email", error);
      res.status(500).json({ message: error.message || "Failed to send email" });
    }
  });
}

// Helper function to build email HTML
function buildDcaDcpEmailSummary(dcaPlans: any[], dcpPlans: any[], recentHistory: any[]): string {
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(num || 0);
  };
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        .section { background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f1f5f9; font-weight: 600; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .badge-buy { background: #dcfce7; color: #166534; }
        .badge-sell { background: #dbeafe; color: #1e40af; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>📊 Portfolio Automation Summary</h1>
      <p>Here's your weekly summary of DCA and DCP plan activity.</p>
      
      ${(dcaPlans.length > 0 || dcpPlans.length > 0) ? `
        <div class="alert">
          <strong>⚠️ Plans Due for Execution</strong><br>
          You have ${dcaPlans.length + dcpPlans.length} plan(s) that are due: ${dcaPlans.length} DCA, ${dcpPlans.length} DCP.
        </div>
      ` : ''}
      
      ${dcaPlans.length > 0 ? `
        <h2>📈 DCA Plans Due (Buy)</h2>
        <div class="section">
          <table>
            <tr>
              <th>Symbol</th>
              <th>Current</th>
              <th>Target</th>
              <th>Increment</th>
              <th>Frequency</th>
            </tr>
            ${dcaPlans.map(p => `
              <tr>
                <td><strong>${p.symbol}</strong></td>
                <td>${p.currentAllocationPct || '0'}%</td>
                <td>${p.targetAllocationPct}%</td>
                <td>+${p.incrementPct || '?'}%</td>
                <td>${p.frequency || 'monthly'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}
      
      ${dcpPlans.length > 0 ? `
        <h2>📉 DCP Plans Due (Sell)</h2>
        <div class="section">
          <table>
            <tr>
              <th>Symbol</th>
              <th>Trigger</th>
              <th>Sell %</th>
              <th>Total Profit</th>
            </tr>
            ${dcpPlans.map(p => `
              <tr>
                <td><strong>${p.symbol}</strong></td>
                <td>${p.triggerType || 'scheduled'}</td>
                <td>${p.sellPercentage || '?'}%</td>
                <td>${formatCurrency(p.totalProfit || 0)}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}
      
      ${recentHistory.length > 0 ? `
        <h2>📋 Recent Executions (Last 7 Days)</h2>
        <div class="section">
          <table>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Symbol</th>
              <th>Action</th>
              <th>Amount</th>
            </tr>
            ${recentHistory.map(h => `
              <tr>
                <td>${formatDate(h.executedAt)}</td>
                <td>${h.executionType.toUpperCase()}</td>
                <td><strong>${h.symbol}</strong></td>
                <td><span class="badge ${h.action === 'BUY' ? 'badge-buy' : 'badge-sell'}">${h.action}</span></td>
                <td>${h.amount ? formatCurrency(h.amount) : '—'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : `
        <h2>📋 Recent Executions</h2>
        <div class="section">
          <p style="color: #6b7280;">No executions recorded in the last 7 days.</p>
        </div>
      `}
      
      <div class="footer">
        <p>This email was sent from your Portfolio Management app.</p>
        <p>Generated on ${new Date().toLocaleString('en-CA')}</p>
      </div>
    </body>
    </html>
  `;
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

