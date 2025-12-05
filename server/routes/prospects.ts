// Prospects Routes
import type { Express } from "express";
import { isAuthenticated } from "../clerkAuth";
import { storage } from "../storage";
import { insertProspectSchema, updateProspectSchema } from "@shared/schema";
import { log } from "../logger";

export function registerProspectsRoutes(app: Express) {
  // PUBLIC ROUTE: Submit prospect intake form (no authentication required)
  app.post('/api/prospects/intake', async (req, res) => {
    try {
      const data = insertProspectSchema.parse(req.body);
      const prospect = await storage.createProspect(data);
      
      log.info("New prospect intake form submitted", { 
        prospectId: prospect.id, 
        email: prospect.email,
        interestType: prospect.interestType 
      });
      
      res.status(201).json({ 
        success: true, 
        message: "Thank you for your interest! We'll be in touch soon.",
        prospectId: prospect.id 
      });
    } catch (error: any) {
      log.error("Error submitting prospect intake form", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          message: "Please check your information and try again.",
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        success: false, 
        message: "Something went wrong. Please try again later." 
      });
    }
  });

  // Get all prospects (authenticated - for internal management)
  app.get('/api/prospects', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      let prospects;
      
      if (status && typeof status === 'string') {
        prospects = await storage.getProspectsByStatus(status);
      } else {
        prospects = await storage.getProspects();
      }
      
      res.json(prospects);
    } catch (error: any) {
      log.error("Error fetching prospects", error);
      res.status(500).json({ message: error.message || "Failed to fetch prospects" });
    }
  });

  // Get prospect by ID
  app.get('/api/prospects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const prospect = await storage.getProspectById(id);
      
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      res.json(prospect);
    } catch (error: any) {
      log.error("Error fetching prospect", error);
      res.status(500).json({ message: error.message || "Failed to fetch prospect" });
    }
  });

  // Update prospect (authenticated)
  app.patch('/api/prospects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existing = await storage.getProspectById(id);
      if (!existing) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      // If marking as contacted, update lastContactedAt
      const updateData = { ...req.body };
      if (updateData.status === 'contacted' && !updateData.lastContactedAt) {
        updateData.lastContactedAt = new Date();
      }
      
      // Assign the current user if not already assigned
      if (!existing.userId && !updateData.userId) {
        updateData.userId = userId;
      }
      
      const data = updateProspectSchema.parse(updateData);
      const prospect = await storage.updateProspect(id, data);
      
      log.info("Prospect updated", { prospectId: id, userId, status: prospect.status });
      res.json(prospect);
    } catch (error: any) {
      log.error("Error updating prospect", error);
      res.status(500).json({ message: error.message || "Failed to update prospect" });
    }
  });

  // Delete prospect (authenticated)
  app.delete('/api/prospects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const existing = await storage.getProspectById(id);
      if (!existing) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      await storage.deleteProspect(id);
      log.info("Prospect deleted", { prospectId: id });
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting prospect", error);
      res.status(500).json({ message: error.message || "Failed to delete prospect" });
    }
  });

  // Get prospect statistics (authenticated)
  app.get('/api/prospects/stats/summary', isAuthenticated, async (req: any, res) => {
    try {
      const prospects = await storage.getProspects();
      
      const stats = {
        total: prospects.length,
        new: prospects.filter(p => p.status === 'new').length,
        contacted: prospects.filter(p => p.status === 'contacted').length,
        scheduled: prospects.filter(p => p.status === 'scheduled').length,
        inProgress: prospects.filter(p => p.status === 'in_progress').length,
        qualified: prospects.filter(p => p.status === 'qualified').length,
        converted: prospects.filter(p => p.status === 'converted').length,
        notQualified: prospects.filter(p => p.status === 'not_qualified').length,
        archived: prospects.filter(p => p.status === 'archived').length,
      };
      
      res.json(stats);
    } catch (error: any) {
      log.error("Error fetching prospect stats", error);
      res.status(500).json({ message: error.message || "Failed to fetch prospect statistics" });
    }
  });
}

