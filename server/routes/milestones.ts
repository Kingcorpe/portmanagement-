// Milestones Routes
import type { Express } from "express";
import { isAuthenticated } from "../clerkAuth";
import { storage } from "../storage";
import { insertMilestoneSchema, updateMilestoneSchema } from "@shared/schema";
import { generateMilestonesReport } from "../pdf-report";
import { sendEmailWithAttachment } from "../gmail";
import { log } from "../logger";

export function registerMilestonesRoutes(app: Express) {
  // Get all milestones
  app.get('/api/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type } = req.query;
      const milestoneType = type === 'personal' ? 'personal' : type === 'business' ? 'business' : undefined;
      const milestones = await storage.getMilestonesByUser(userId, milestoneType);
      res.json(milestones);
    } catch (error: any) {
      log.error("Error fetching milestones", error);
      res.status(500).json({ message: error.message || "Failed to fetch milestones" });
    }
  });

  // Create milestone
  app.post('/api/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertMilestoneSchema.parse({ ...req.body, userId });
      const milestone = await storage.createMilestone(data);
      res.status(201).json(milestone);
    } catch (error: any) {
      log.error("Error creating milestone", error);
      res.status(500).json({ message: error.message || "Failed to create milestone" });
    }
  });

  // Update milestone
  app.patch('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existing = await storage.getMilestoneById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      
      const data = updateMilestoneSchema.parse(req.body);
      const milestone = await storage.updateMilestone(id, data);
      res.json(milestone);
    } catch (error: any) {
      log.error("Error updating milestone", error);
      res.status(500).json({ message: error.message || "Failed to update milestone" });
    }
  });

  // Delete milestone
  app.delete('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existing = await storage.getMilestoneById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      
      await storage.deleteMilestone(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting milestone", error);
      res.status(500).json({ message: error.message || "Failed to delete milestone" });
    }
  });

  // Milestones PDF Export
  app.get('/api/milestones/export/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type } = req.query;
      const milestoneType = type === 'personal' ? 'personal' : type === 'business' ? 'business' : undefined;
      const milestones = await storage.getMilestonesByUser(userId, milestoneType);
      
      const reportTitle = type === 'personal' ? 'Personal Milestones' : type === 'business' ? 'Business Milestones' : 'Milestones & Wins';
      const pdfBuffer = await generateMilestonesReport(milestones, reportTitle);
      
      const filePrefix = type === 'personal' ? 'Personal_Milestones' : type === 'business' ? 'Business_Milestones' : 'Milestones';
      const fileName = `${filePrefix}_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      log.error("Error exporting milestones PDF", error);
      res.status(500).json({ message: error.message || "Failed to export PDF" });
    }
  });

  // Milestones Email PDF
  app.post('/api/milestones/export/email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { to, subject, message, type } = req.body;
      
      if (!to || !to.includes('@')) {
        return res.status(400).json({ message: "Valid email address required" });
      }
      
      const milestoneType = type === 'personal' ? 'personal' : type === 'business' ? 'business' : undefined;
      const milestones = await storage.getMilestonesByUser(userId, milestoneType);
      const reportTitle = type === 'personal' ? 'Personal Milestones' : type === 'business' ? 'Business Milestones' : 'Milestones & Wins';
      const pdfBuffer = await generateMilestonesReport(milestones, reportTitle);
      
      const fileName = `Milestones_${new Date().toISOString().split('T')[0]}.pdf`;
      const emailSubject = subject || 'Milestones & Wins Report';
      const emailBody = message || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Milestones & Wins Report</h2>
          <p style="color: #4b5563;">Please find attached your Milestones & Wins report.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            Generated from PracticeOS on ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
      `;
      
      await sendEmailWithAttachment(to, emailSubject, emailBody, pdfBuffer, fileName);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      log.error("Error emailing milestones PDF", error);
      res.status(500).json({ message: error.message || "Failed to send email" });
    }
  });
}



