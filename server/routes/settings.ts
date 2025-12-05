// User Settings Routes
import type { Express } from "express";
import { isAuthenticated } from "../clerkAuth";
import { storage } from "../storage";
import { log } from "../logger";

export function registerSettingsRoutes(app: Express) {
  // Get user settings
  app.get('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let settings = await storage.getUserSettings(userId);
      
      // If settings don't exist, create default settings
      if (!settings) {
        settings = await storage.createUserSettings({ userId });
      }
      
      res.json(settings);
    } catch (error) {
      log.error("Error fetching user settings", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  // Update user settings
  app.patch('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reportEmail } = req.body;
      
      // SECURITY: Validate email format if provided
      if (reportEmail !== undefined && reportEmail !== null) {
        if (typeof reportEmail !== 'string') {
          return res.status(400).json({ message: "Invalid email format" });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (reportEmail.trim() !== '' && !emailRegex.test(reportEmail.trim())) {
          return res.status(400).json({ message: "Invalid email format" });
        }
      }
      
      // Sanitize email
      const sanitizedEmail = reportEmail && typeof reportEmail === 'string' ? reportEmail.trim().toLowerCase() : reportEmail;
      
      // Ensure settings exist
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({ userId, reportEmail: sanitizedEmail });
      } else {
        settings = await storage.updateUserSettings(userId, { reportEmail: sanitizedEmail });
      }
      
      res.json(settings);
    } catch (error) {
      log.error("Error updating user settings", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  // Regenerate webhook secret
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
      log.error("Error regenerating webhook secret", error);
      res.status(500).json({ message: "Failed to regenerate webhook secret" });
    }
  });
}



