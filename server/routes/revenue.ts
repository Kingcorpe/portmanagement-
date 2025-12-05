// Revenue Routes (Insurance and Investment)
import type { Express } from "express";
import { isAuthenticated } from "../clerkAuth";
import { storage } from "../storage";
import { insertInsuranceRevenueSchema, updateInsuranceRevenueSchema, insertInvestmentRevenueSchema, updateInvestmentRevenueSchema } from "@shared/schema";
import { log } from "../logger";

export function registerRevenueRoutes(app: Express) {
  // Insurance Revenue API routes
  app.get('/api/insurance-revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getInsuranceRevenueByUser(userId);
      res.json(entries);
    } catch (error: any) {
      log.error("Error fetching insurance revenue", error);
      res.status(500).json({ message: error.message || "Failed to fetch insurance revenue" });
    }
  });

  app.post('/api/insurance-revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertInsuranceRevenueSchema.parse({ ...req.body, userId });
      const entry = await storage.createInsuranceRevenue(data);
      res.status(201).json(entry);
    } catch (error: any) {
      log.error("Error creating insurance revenue", error);
      res.status(500).json({ message: error.message || "Failed to create insurance revenue entry" });
    }
  });

  app.patch('/api/insurance-revenue/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getInsuranceRevenueById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      const data = updateInsuranceRevenueSchema.parse(req.body);
      const entry = await storage.updateInsuranceRevenue(id, data);
      res.json(entry);
    } catch (error: any) {
      log.error("Error updating insurance revenue", error);
      res.status(500).json({ message: error.message || "Failed to update insurance revenue entry" });
    }
  });

  app.delete('/api/insurance-revenue/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getInsuranceRevenueById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      await storage.deleteInsuranceRevenue(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting insurance revenue", error);
      res.status(500).json({ message: error.message || "Failed to delete insurance revenue entry" });
    }
  });

  // Investment Revenue API routes
  app.get('/api/investment-revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getInvestmentRevenueByUser(userId);
      res.json(entries);
    } catch (error: any) {
      log.error("Error fetching investment revenue", error);
      res.status(500).json({ message: error.message || "Failed to fetch investment revenue" });
    }
  });

  app.post('/api/investment-revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertInvestmentRevenueSchema.parse({ ...req.body, userId });
      const entry = await storage.createInvestmentRevenue(data);
      res.status(201).json(entry);
    } catch (error: any) {
      log.error("Error creating investment revenue", error);
      res.status(500).json({ message: error.message || "Failed to create investment revenue entry" });
    }
  });

  app.patch('/api/investment-revenue/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getInvestmentRevenueById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      const data = updateInvestmentRevenueSchema.parse(req.body);
      const entry = await storage.updateInvestmentRevenue(id, data);
      res.json(entry);
    } catch (error: any) {
      log.error("Error updating investment revenue", error);
      res.status(500).json({ message: error.message || "Failed to update investment revenue entry" });
    }
  });

  app.delete('/api/investment-revenue/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getInvestmentRevenueById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      await storage.deleteInvestmentRevenue(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting investment revenue", error);
      res.status(500).json({ message: error.message || "Failed to delete investment revenue entry" });
    }
  });
}

