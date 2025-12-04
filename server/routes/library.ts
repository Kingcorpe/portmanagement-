// Library Document Routes
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { ObjectStorageService } from "../objectStorage";
import { insertLibraryDocumentSchema, updateLibraryDocumentSchema } from "@shared/schema";
import { log } from "../logger";

export function registerLibraryRoutes(app: Express) {
  // Get all library documents
  app.get('/api/library-documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getAllLibraryDocuments(userId);
      res.json(documents);
    } catch (error) {
      log.error("Error fetching library documents", error);
      res.status(500).json({ message: "Failed to fetch library documents" });
    }
  });

  // Get library documents by category
  app.get('/api/library-documents/category/:category', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const category = req.params.category as 'reports' | 'strategies';
      if (!['reports', 'strategies'].includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      const documents = await storage.getLibraryDocumentsByCategory(category, userId);
      res.json(documents);
    } catch (error) {
      log.error("Error fetching library documents by category", error);
      res.status(500).json({ message: "Failed to fetch library documents" });
    }
  });

  // Get single library document
  app.get('/api/library-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const document = await storage.getLibraryDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      // Check ownership
      if (document.uploadedBy && document.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(document);
    } catch (error) {
      log.error("Error fetching library document", error);
      res.status(500).json({ message: "Failed to fetch library document" });
    }
  });

  // Create library document (after file upload)
  app.post('/api/library-documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const objectStorageService = new ObjectStorageService();
      
      if (!req.body.objectPath) {
        return res.status(400).json({ message: "objectPath is required" });
      }
      
      // Set ACL policy and get normalized path
      // visibility: "public" allows all authenticated users to read (owner can write)
      // The /objects/ route still requires isAuthenticated, so only logged-in users can access
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(req.body.objectPath, {
        owner: userId,
        visibility: "public",
      });
      
      // Validate that the object path is properly normalized
      if (!objectPath.startsWith("/objects/")) {
        return res.status(400).json({ message: "Invalid object path" });
      }
      
      const parsed = insertLibraryDocumentSchema.parse({
        ...req.body,
        objectPath,
        uploadedBy: userId,
      });
      
      const document = await storage.createLibraryDocument(parsed);
      res.json(document);
    } catch (error: any) {
      log.error("Error creating library document", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create library document" });
    }
  });

  // Update library document
  app.patch('/api/library-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getLibraryDocument(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (existing.uploadedBy && existing.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateLibraryDocumentSchema.parse(req.body);
      const document = await storage.updateLibraryDocument(req.params.id, parsed);
      res.json(document);
    } catch (error: any) {
      log.error("Error updating library document", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update library document" });
    }
  });

  // Delete library document
  app.delete('/api/library-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getLibraryDocument(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (existing.uploadedBy && existing.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteLibraryDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting library document", error);
      res.status(500).json({ message: "Failed to delete library document" });
    }
  });
}

