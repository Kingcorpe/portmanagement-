// Trading Journal Routes
import type { Express } from "express";
import { isAuthenticated } from "../clerkAuth";
import { storage } from "../storage";
import { insertTradingJournalEntrySchema, updateTradingJournalEntrySchema, insertTradingJournalImageSchema, insertTradingJournalTagSchema } from "@shared/schema";
import { log } from "../logger";

export function registerTradingJournalRoutes(app: Express) {
  // Get all journal entries with filters
  app.get('/api/trading-journal/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { symbol, tagIds, startDate, endDate, outcome, search } = req.query;
      
      const filters: any = {};
      if (symbol) filters.symbol = symbol;
      if (tagIds) {
        const tagArray = Array.isArray(tagIds) ? tagIds : tagIds.split(',').filter(Boolean);
        if (tagArray.length > 0) filters.tagIds = tagArray;
      }
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (outcome) filters.outcome = outcome;
      if (search) filters.search = search;

      const entries = await storage.getJournalEntries(userId, filters);
      res.json(entries);
    } catch (error: any) {
      log.error("Error fetching journal entries", error);
      res.status(500).json({ message: error.message || "Failed to fetch journal entries" });
    }
  });

  // Get single journal entry
  app.get('/api/trading-journal/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const entry = await storage.getJournalEntryWithDetails(id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Verify ownership
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(entry);
    } catch (error: any) {
      log.error("Error fetching journal entry", error);
      res.status(500).json({ message: error.message || "Failed to fetch journal entry" });
    }
  });

  // Create journal entry
  app.post('/api/trading-journal/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTradingJournalEntrySchema.parse(req.body);
      const entry = await storage.createJournalEntry(userId, data);
      res.status(201).json(entry);
    } catch (error: any) {
      log.error("Error creating journal entry", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create journal entry" });
    }
  });

  // Update journal entry
  app.put('/api/trading-journal/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const existing = await storage.getJournalEntryById(id);
      if (!existing) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = updateTradingJournalEntrySchema.parse(req.body);
      const entry = await storage.updateJournalEntry(id, data);
      res.json(entry);
    } catch (error: any) {
      log.error("Error updating journal entry", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to update journal entry" });
    }
  });

  // Delete journal entry
  app.delete('/api/trading-journal/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const existing = await storage.getJournalEntryById(id);
      if (!existing) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteJournalEntry(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting journal entry", error);
      res.status(500).json({ message: error.message || "Failed to delete journal entry" });
    }
  });

  // Add image to journal entry
  app.post('/api/trading-journal/entries/:id/images', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const entry = await storage.getJournalEntryById(id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = insertTradingJournalImageSchema.parse({ ...req.body, entryId: id });
      const image = await storage.addJournalImage(data);
      res.status(201).json(image);
    } catch (error: any) {
      log.error("Error adding journal image", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to add journal image" });
    }
  });

  // Remove image from journal entry
  app.delete('/api/trading-journal/entries/:id/images/:imageId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id, imageId } = req.params;
      
      const entry = await storage.getJournalEntryById(id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.removeJournalImage(imageId);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error removing journal image", error);
      res.status(500).json({ message: error.message || "Failed to remove journal image" });
    }
  });

  // Get all tags
  app.get('/api/trading-journal/tags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tags = await storage.getTags(userId);
      res.json(tags);
    } catch (error: any) {
      log.error("Error fetching tags", error);
      res.status(500).json({ message: error.message || "Failed to fetch tags" });
    }
  });

  // Create tag
  app.post('/api/trading-journal/tags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTradingJournalTagSchema.parse(req.body);
      const tag = await storage.createTag(userId, data);
      res.status(201).json(tag);
    } catch (error: any) {
      log.error("Error creating tag", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create tag" });
    }
  });

  // Update entry tags
  app.post('/api/trading-journal/entries/:id/tags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { tagIds } = req.body;
      
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ message: "tagIds must be an array" });
      }
      
      const entry = await storage.getJournalEntryById(id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.updateEntryTags(id, tagIds);
      const entryTags = await storage.getEntryTags(id);
      res.json(entryTags);
    } catch (error: any) {
      log.error("Error updating entry tags", error);
      res.status(500).json({ message: error.message || "Failed to update entry tags" });
    }
  });

  // Get journal analytics
  app.get('/api/trading-journal/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getJournalAnalytics(userId);
      res.json(analytics);
    } catch (error: any) {
      log.error("Error fetching journal analytics", error);
      res.status(500).json({ message: error.message || "Failed to fetch journal analytics" });
    }
  });
}



