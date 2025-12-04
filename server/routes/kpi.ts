// KPI Routes
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { kpiDailyTasks } from "@shared/schema";
import { insertKpiObjectiveSchema, updateKpiObjectiveSchema } from "@shared/schema";
import { log } from "../logger";

export function registerKpiRoutes(app: Express) {
  // KPI Objectives API routes
  app.get('/api/kpi-objectives', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const objectives = await storage.getKpiObjectivesByUser(userId);
      res.json(objectives);
    } catch (error: any) {
      log.error("Error fetching KPI objectives", error);
      res.status(500).json({ message: error.message || "Failed to fetch KPI objectives" });
    }
  });

  app.post('/api/kpi-objectives', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertKpiObjectiveSchema.parse({ ...req.body, userId });
      const objective = await storage.createKpiObjective(data);
      res.status(201).json(objective);
    } catch (error: any) {
      log.error("Error creating KPI objective", error);
      res.status(500).json({ message: error.message || "Failed to create KPI objective" });
    }
  });

  app.patch('/api/kpi-objectives/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getKpiObjectiveById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      const data = updateKpiObjectiveSchema.parse(req.body);
      const objective = await storage.updateKpiObjective(id, data);
      res.json(objective);
    } catch (error: any) {
      log.error("Error updating KPI objective", error);
      res.status(500).json({ message: error.message || "Failed to update KPI objective" });
    }
  });

  app.delete('/api/kpi-objectives/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getKpiObjectiveById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      await storage.deleteKpiObjective(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting KPI objective", error);
      res.status(500).json({ message: error.message || "Failed to delete KPI objective" });
    }
  });

  // KPI Daily Tasks API routes
  app.get('/api/kpi-objectives/:id/daily-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership of the objective
      const objective = await storage.getKpiObjectiveById(id);
      if (!objective || objective.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      const tasks = await storage.getDailyTasksByObjective(id);
      res.json(tasks);
    } catch (error: any) {
      log.error("Error fetching daily tasks", error);
      res.status(500).json({ message: error.message || "Failed to fetch daily tasks" });
    }
  });

  app.post('/api/kpi-objectives/:id/daily-tasks/initialize', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { days, trackerMode } = req.body; // Array of day numbers and tracker mode
      const userId = req.user.claims.sub;
      
      // Verify ownership of the objective
      const objective = await storage.getKpiObjectiveById(id);
      if (!objective || objective.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      // Delete existing tasks first
      await storage.deleteDailyTasksByObjective(id);
      
      // Update objective with tracker mode
      if (trackerMode) {
        await storage.updateKpiObjective(id, { dailyTrackerMode: trackerMode });
      }
      
      // Create new tasks for each day
      const tasksToCreate = days.map((dayNumber: number) => ({
        objectiveId: id,
        dayNumber,
        isCompleted: 0,
      }));
      
      const tasks = await storage.createBulkDailyTasks(tasksToCreate);
      res.status(201).json(tasks);
    } catch (error: any) {
      log.error("Error initializing daily tasks", error);
      res.status(500).json({ message: error.message || "Failed to initialize daily tasks" });
    }
  });

  app.patch('/api/kpi-daily-tasks/:id/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get the task and verify ownership through the objective
      const tasks = await db.select()
        .from(kpiDailyTasks)
        .where(eq(kpiDailyTasks.id, id));
      
      if (tasks.length === 0) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const objective = await storage.getKpiObjectiveById(tasks[0].objectiveId);
      if (!objective || objective.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      const task = await storage.toggleDailyTask(id);
      res.json(task);
    } catch (error: any) {
      log.error("Error toggling daily task", error);
      res.status(500).json({ message: error.message || "Failed to toggle daily task" });
    }
  });

  app.delete('/api/kpi-objectives/:id/daily-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership of the objective
      const objective = await storage.getKpiObjectiveById(id);
      if (!objective || objective.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      await storage.deleteDailyTasksByObjective(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting daily tasks", error);
      res.status(500).json({ message: error.message || "Failed to delete daily tasks" });
    }
  });

  // KPI Export endpoint
  app.get('/api/kpi-objectives/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { mode, month } = req.query;
      
      const objectives = await storage.getKpiObjectivesByUser(userId);
      
      let filtered = objectives;
      if (mode === "single" && month) {
        filtered = objectives.filter(o => o.month === month);
      }
      
      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ margin: 40 });
      const filename = mode === "all" 
        ? `KPI_Dashboard_12Months_${new Date().toISOString().split('T')[0]}.pdf`
        : `KPI_Dashboard_${month}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      doc.pipe(res);
      
      doc.fontSize(24).font("Helvetica-Bold").text("KPI Dashboard", { align: "center" });
      doc.fontSize(12).font("Helvetica").text(mode === "all" ? "12-Month Overview" : `Month: ${month}`, { align: "center" });
      doc.moveDown();
      
      const months = new Map<string, { personal: typeof filtered, business: typeof filtered }>();
      filtered.forEach(obj => {
        if (!months.has(obj.month)) months.set(obj.month, { personal: [], business: [] });
        const entry = months.get(obj.month)!;
        if (obj.type === "personal") entry.personal.push(obj);
        else entry.business.push(obj);
      });

      // Helper to format month from YYYY-MM to Month Year
      const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      };
      
      months.forEach((groups, monthKey) => {
        doc.fontSize(13).font("Helvetica-Bold").text(formatMonth(monthKey));
        doc.moveDown(0.2);
        
        ["personal", "business"].forEach(type => {
          const objectives = groups[type as keyof typeof groups];
          if (objectives.length > 0) {
            const typeLabel = type === "personal" ? "Personal" : "Business";
            objectives.forEach((obj, idx) => {
              const statusLabel = obj.status.charAt(0).toUpperCase() + obj.status.slice(1);
              const isCompleted = obj.status === "completed";
              const titleText = `• ${obj.title} — ${statusLabel}`;
              doc.fontSize(10).font("Helvetica");
              if (isCompleted) {
                doc.text(titleText, { indent: 15, strike: true });
              } else {
                doc.text(titleText, { indent: 15 });
              }
              if (obj.description && !isCompleted) {
                const formattedDesc = obj.description
                  .split('\n')
                  .map(line => line.replace(/^\s*\*\s/, '• '))
                  .join('\n')
                  .split('\n')[0]
                  .slice(0, 80);
                doc.fontSize(9).font("Helvetica").fillColor("#666666").text(formattedDesc, { indent: 20 });
                doc.fillColor("#000000");
              }
              doc.moveDown(0.3);
            });
          }
        });
        doc.moveDown();
      });
      
      doc.end();
    } catch (error: any) {
      log.error("Error exporting KPI objectives", error);
      res.status(500).json({ message: error.message || "Failed to export PDF" });
    }
  });
}

