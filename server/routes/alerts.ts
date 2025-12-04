// Alert Routes
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { log } from "../logger";
import { z } from "zod";
import { updateAlertSchema } from "@shared/schema";

// HIGH PRIORITY FIX #6: Query parameter validation helper
function validateQuery(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: error.errors 
        });
      }
      next(error);
    }
  };
}

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

export function registerAlertRoutes(app: Express) {
  // Alert routes
  // HIGH PRIORITY FIX #6: Add query parameter validation
  app.get('/api/alerts', 
    validateQuery(z.object({
      status: z.enum(['pending', 'executed', 'dismissed']).optional(),
    })),
    isAuthenticated, 
    async (req: any, res) => {
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
        log.error("Error fetching alerts", error);
        res.status(500).json({ message: "Failed to fetch alerts" });
      }
    }
  );

  app.patch('/api/alerts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
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
      
      // If alert is being dismissed, archive related tasks
      if (parsed.status === "dismissed") {
        try {
          const relatedTasks = await storage.getTasksBySymbol(userId, existingAlert.symbol);
          let archivedCount = 0;
          for (const task of relatedTasks) {
            // Only archive tasks that match this specific alert (by checking the title pattern)
            if (task.title.includes(`TradingView ${existingAlert.signal} Alert: ${existingAlert.symbol}`)) {
              await storage.archiveAccountTask(task.id);
              archivedCount++;
            }
          }
          if (archivedCount > 0) {
            log.debug("Archived tasks related to dismissed alert", { archivedCount, alertId: alert.id, symbol: existingAlert.symbol });
          }
        } catch (taskError) {
          log.error("Error archiving tasks for dismissed alert", taskError);
          // Don't fail the alert update if task archiving fails
        }
      }
      
      res.json(alert);
    } catch (error: any) {
      log.error("Error updating alert", error);
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
      
      // Track processed alert-signal-symbol combinations to avoid duplicate task archiving
      const processedAlerts = new Set<string>();
      let dismissedCount = 0;
      let totalArchivedTasks = 0;
      
      // Dismiss each alert and archive related tasks
      for (const alert of userPendingAlerts) {
        await storage.updateAlert(alert.id, { status: "dismissed" });
        dismissedCount++;
        
        // Archive related tasks for this specific alert (signal + symbol combination)
        const alertKey = `${alert.signal}:${alert.symbol}`;
        if (!processedAlerts.has(alertKey)) {
          try {
            const relatedTasks = await storage.getTasksBySymbol(userId, alert.symbol);
            for (const task of relatedTasks) {
              // Only archive tasks that match this specific alert (signal and symbol)
              if (task.title.includes(`TradingView ${alert.signal} Alert: ${alert.symbol}`)) {
                await storage.archiveAccountTask(task.id);
                totalArchivedTasks++;
              }
            }
            processedAlerts.add(alertKey);
          } catch (taskError) {
            log.error("Error archiving tasks for alert", taskError, { signal: alert.signal, symbol: alert.symbol });
            // Continue processing other alerts even if task archiving fails
          }
        }
      }
      
      res.json({ 
        message: `Dismissed ${dismissedCount} alerts${totalArchivedTasks > 0 ? ` and archived ${totalArchivedTasks} related task(s)` : ''}`, 
        count: dismissedCount,
        archivedTasks: totalArchivedTasks
      });
    } catch (error: any) {
      log.error("Error dismissing all alerts", error);
      res.status(500).json({ message: "Failed to dismiss alerts" });
    }
  });
}

