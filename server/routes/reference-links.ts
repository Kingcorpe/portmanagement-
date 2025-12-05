// Reference Links Routes
import type { Express } from "express";
import { isAuthenticated } from "../clerkAuth";
import { storage } from "../storage";
import { insertReferenceLinkSchema, updateReferenceLinkSchema } from "@shared/schema";
import { log } from "../logger";

export function registerReferenceLinksRoutes(app: Express) {
  // Get all reference links
  app.get('/api/reference-links', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const links = await storage.getReferenceLinksByUser(userId);
      res.json(links);
    } catch (error: any) {
      log.error("Error fetching reference links", error);
      res.status(500).json({ message: error.message || "Failed to fetch reference links" });
    }
  });

  // Create reference link
  app.post('/api/reference-links', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertReferenceLinkSchema.parse({ ...req.body, userId });
      const link = await storage.createReferenceLink(data);
      res.status(201).json(link);
    } catch (error: any) {
      log.error("Error creating reference link", error);
      res.status(500).json({ message: error.message || "Failed to create reference link" });
    }
  });

  // Update reference link
  app.patch('/api/reference-links/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existing = await storage.getReferenceLinkById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Link not found" });
      }
      
      const data = updateReferenceLinkSchema.parse(req.body);
      const link = await storage.updateReferenceLink(id, data);
      res.json(link);
    } catch (error: any) {
      log.error("Error updating reference link", error);
      res.status(500).json({ message: error.message || "Failed to update reference link" });
    }
  });

  // Delete reference link
  app.delete('/api/reference-links/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existing = await storage.getReferenceLinkById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Link not found" });
      }
      
      await storage.deleteReferenceLink(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting reference link", error);
      res.status(500).json({ message: error.message || "Failed to delete reference link" });
    }
  });
}



