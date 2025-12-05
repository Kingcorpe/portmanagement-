import type { Express } from "express";
import { eq, and, asc, desc } from "drizzle-orm";
import { db } from "../db";
import { roadmapItems, insertRoadmapItemSchema, updateRoadmapItemSchema } from "../../shared/schema";
import { isAuthenticated } from "../replitAuth";
import { logger } from "../logger";

export function registerRoadmapRoutes(app: Express) {
  // Get all roadmap items for the current user
  app.get("/api/roadmap", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const items = await db
        .select()
        .from(roadmapItems)
        .where(eq(roadmapItems.userId, userId))
        .orderBy(asc(roadmapItems.sortOrder), desc(roadmapItems.createdAt));
      
      res.json(items);
    } catch (error) {
      logger.error("Error fetching roadmap items:", error);
      res.status(500).json({ error: "Failed to fetch roadmap items" });
    }
  });

  // Create a new roadmap item
  app.post("/api/roadmap", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertRoadmapItemSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const [item] = await db
        .insert(roadmapItems)
        .values({
          ...parsed.data,
          userId,
        })
        .returning();

      res.status(201).json(item);
    } catch (error) {
      logger.error("Error creating roadmap item:", error);
      res.status(500).json({ error: "Failed to create roadmap item" });
    }
  });

  // Update a roadmap item
  app.patch("/api/roadmap/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const parsed = updateRoadmapItemSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      // Check if status is being changed to completed
      const updateData: any = {
        ...parsed.data,
        updatedAt: new Date(),
      };
      
      if (parsed.data.status === "completed") {
        updateData.completedAt = new Date();
      }

      const [item] = await db
        .update(roadmapItems)
        .set(updateData)
        .where(and(eq(roadmapItems.id, id), eq(roadmapItems.userId, userId)))
        .returning();

      if (!item) {
        return res.status(404).json({ error: "Roadmap item not found" });
      }

      res.json(item);
    } catch (error) {
      logger.error("Error updating roadmap item:", error);
      res.status(500).json({ error: "Failed to update roadmap item" });
    }
  });

  // Delete a roadmap item
  app.delete("/api/roadmap/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const [item] = await db
        .delete(roadmapItems)
        .where(and(eq(roadmapItems.id, id), eq(roadmapItems.userId, userId)))
        .returning();

      if (!item) {
        return res.status(404).json({ error: "Roadmap item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting roadmap item:", error);
      res.status(500).json({ error: "Failed to delete roadmap item" });
    }
  });

  // Bulk update sort order
  app.post("/api/roadmap/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { items } = req.body as { items: { id: string; sortOrder: number; status?: string }[] };

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items must be an array" });
      }

      // Update each item's sort order and optionally status
      await Promise.all(
        items.map(({ id, sortOrder, status }) =>
          db
            .update(roadmapItems)
            .set({ 
              sortOrder, 
              ...(status ? { status: status as any } : {}),
              updatedAt: new Date() 
            })
            .where(and(eq(roadmapItems.id, id), eq(roadmapItems.userId, userId)))
        )
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error reordering roadmap items:", error);
      res.status(500).json({ error: "Failed to reorder roadmap items" });
    }
  });
}

