// Task Routes
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { log } from "../logger";
import { insertAccountTaskSchema, updateAccountTaskSchema } from "@shared/schema";
import { sendEmailWithAttachment } from "../gmail";

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

export function registerTasksRoutes(app: Express) {
  // Get tasks for individual accounts
  app.get('/api/individual-accounts/:accountId/tasks', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('individual', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getTasksByIndividualAccount(req.params.accountId);
      res.json(tasks);
    } catch (error) {
      log.error("Error fetching tasks", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get tasks for corporate accounts
  app.get('/api/corporate-accounts/:accountId/tasks', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('corporate', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getTasksByCorporateAccount(req.params.accountId);
      res.json(tasks);
    } catch (error) {
      log.error("Error fetching tasks", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get tasks for joint accounts
  app.get('/api/joint-accounts/:accountId/tasks', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('joint', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getTasksByJointAccount(req.params.accountId);
      res.json(tasks);
    } catch (error) {
      log.error("Error fetching tasks", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Create task
  app.post('/api/account-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertAccountTaskSchema.parse(req.body);
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (parsed.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', parsed.individualAccountId);
      } else if (parsed.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', parsed.corporateAccountId);
      } else if (parsed.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const task = await storage.createAccountTask(parsed);
      
      // Create audit log entry
      await storage.createAuditLogEntry({
        individualAccountId: parsed.individualAccountId || undefined,
        corporateAccountId: parsed.corporateAccountId || undefined,
        jointAccountId: parsed.jointAccountId || undefined,
        userId,
        action: "task_add",
        changes: { 
          title: task.title,
          dueDate: task.dueDate
        },
      });
      
      res.json(task);
    } catch (error: any) {
      log.error("Error creating task", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Update task
  app.patch('/api/account-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getAccountTask(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (existing.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', existing.individualAccountId);
      } else if (existing.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', existing.corporateAccountId);
      } else if (existing.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', existing.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateAccountTaskSchema.parse(req.body);
      const task = await storage.updateAccountTask(req.params.id, parsed);
      res.json(task);
    } catch (error: any) {
      log.error("Error updating task", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Complete task - marks as completed with ability to restore
  app.post('/api/account-tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getAccountTask(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (existing.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', existing.individualAccountId);
      } else if (existing.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', existing.corporateAccountId);
      } else if (existing.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', existing.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Create audit log entry with full task details for future reference
      await storage.createAuditLogEntry({
        individualAccountId: existing.individualAccountId || undefined,
        corporateAccountId: existing.corporateAccountId || undefined,
        jointAccountId: existing.jointAccountId || undefined,
        userId,
        action: "task_complete",
        changes: { 
          title: existing.title,
          description: existing.description || null,
          priority: existing.priority,
          dueDate: existing.dueDate ? new Date(existing.dueDate).toLocaleDateString() : null,
        },
      });
      
      // If this is a protection review task, update protectionReviewedAt on the position
      if (existing.title.includes("Review protection for")) {
        try {
          // Extract symbol from task title (format: "Review protection for SYMBOL - up X%")
          const symbolMatch = existing.title.match(/Review protection for ([A-Z0-9.\-]+)/);
          if (symbolMatch) {
            const symbol = symbolMatch[1];
            // Find matching position(s) by account and symbol
            let positions: any[] = [];
            if (existing.individualAccountId) {
              positions = await storage.getPositionsByIndividualAccount(existing.individualAccountId);
            } else if (existing.corporateAccountId) {
              positions = await storage.getPositionsByCorporateAccount(existing.corporateAccountId);
            } else if (existing.jointAccountId) {
              positions = await storage.getPositionsByJointAccount(existing.jointAccountId);
            }
            
            // Update protectionReviewedAt for matching positions
            const matchingPositions = positions.filter(p => p.symbol === symbol);
            for (const pos of matchingPositions) {
              await storage.updatePosition(pos.id, { protectionReviewedAt: new Date() });
              log.debug(`[PROTECTION] Marked ${symbol} as reviewed (protectionReviewedAt updated)`);
            }
          }
        } catch (err) {
          log.error("Error updating protectionReviewedAt", err);
          // Don't fail the task completion if this fails
        }
      }
      
      // Mark task as completed instead of deleting
      const updated = await storage.updateAccountTask(req.params.id, { status: "completed" });
      
      res.json(updated);
    } catch (error) {
      log.error("Error completing task", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Restore task - changes status from completed back to pending
  app.post('/api/account-tasks/:id/restore', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getAccountTask(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (existing.status !== "completed" && !existing.archivedAt) {
        return res.status(400).json({ message: "Task is not completed or archived" });
      }
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (existing.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', existing.individualAccountId);
      } else if (existing.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', existing.corporateAccountId);
      } else if (existing.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', existing.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Handle both completed and archived tasks
      if (existing.archivedAt) {
        // Restore from archive
        const restored = await storage.restoreAccountTask(req.params.id);
        res.json(restored);
      } else {
        // Restore from completed to pending
        await storage.createAuditLogEntry({
          individualAccountId: existing.individualAccountId || undefined,
          corporateAccountId: existing.corporateAccountId || undefined,
          jointAccountId: existing.jointAccountId || undefined,
          userId,
          action: "update",
          changes: { 
            title: existing.title,
            statusChanged: "completed → pending",
          },
        });
        
        const updated = await storage.updateAccountTask(req.params.id, { status: "pending" });
        res.json(updated);
      }
    } catch (error) {
      log.error("Error restoring task", error);
      res.status(500).json({ message: "Failed to restore task" });
    }
  });

  // Archive task (soft delete - moves to archive for 30 days)
  app.delete('/api/account-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getAccountTask(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (existing.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', existing.individualAccountId);
      } else if (existing.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', existing.corporateAccountId);
      } else if (existing.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', existing.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Archive instead of delete
      await storage.archiveAccountTask(req.params.id);
      
      // Create audit log entry
      await storage.createAuditLogEntry({
        individualAccountId: existing.individualAccountId || undefined,
        corporateAccountId: existing.corporateAccountId || undefined,
        jointAccountId: existing.jointAccountId || undefined,
        userId,
        action: "task_delete",
        changes: { 
          title: existing.title,
          archived: true
        },
      });
      
      res.status(204).send();
    } catch (error) {
      log.error("Error archiving task", error);
      res.status(500).json({ message: "Failed to archive task" });
    }
  });

  // Bulk archive tasks (soft delete - moves to archive for 30 days)
  app.post('/api/account-tasks/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "taskIds must be a non-empty array" });
      }
      
      let archivedCount = 0;
      const errors: string[] = [];
      
      for (const taskId of taskIds) {
        try {
          const existing = await storage.getAccountTask(taskId);
          if (!existing) {
            errors.push(`Task ${taskId} not found`);
            continue;
          }
          
          // Determine account type and get household ID
          let householdId: string | null = null;
          if (existing.individualAccountId) {
            householdId = await storage.getHouseholdIdFromAccount('individual', existing.individualAccountId);
          } else if (existing.corporateAccountId) {
            householdId = await storage.getHouseholdIdFromAccount('corporate', existing.corporateAccountId);
          } else if (existing.jointAccountId) {
            householdId = await storage.getHouseholdIdFromAccount('joint', existing.jointAccountId);
          }
          
          if (!householdId) {
            errors.push(`Account not found for task ${taskId}`);
            continue;
          }
          
          const canEdit = await storage.canUserEditHousehold(userId, householdId);
          if (!canEdit) {
            errors.push(`Access denied for task ${taskId}`);
            continue;
          }
          
          // Archive instead of delete
          await storage.archiveAccountTask(taskId);
          
          // Create audit log entry
          await storage.createAuditLogEntry({
            individualAccountId: existing.individualAccountId || undefined,
            corporateAccountId: existing.corporateAccountId || undefined,
            jointAccountId: existing.jointAccountId || undefined,
            userId,
            action: "task_delete",
            changes: { 
              title: existing.title,
              bulkArchive: true
            },
          });
          
          archivedCount++;
        } catch (taskError) {
          errors.push(`Failed to archive task ${taskId}`);
        }
      }
      
      res.json({ 
        deleted: archivedCount, 
        total: taskIds.length,
        errors: errors.length > 0 ? errors : undefined 
      });
    } catch (error) {
      log.error("Error bulk archiving tasks", error);
      res.status(500).json({ message: "Failed to bulk archive tasks" });
    }
  });

  // Get all tasks for the current user (across all accounts)
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getAllTasksForUser(userId);
      res.json(tasks);
    } catch (error) {
      log.error("Error fetching all tasks", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get all archived tasks for the current user
  app.get('/api/tasks/archived', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getArchivedTasksForUser(userId);
      res.json(tasks);
    } catch (error) {
      log.error("Error fetching archived tasks", error);
      res.status(500).json({ message: "Failed to fetch archived tasks" });
    }
  });

  // Download tasks as PDF
  app.get('/api/tasks/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getAllTasksForUser(userId);
      
      // @ts-ignore
      const PDFDocument = (await import('pdfkit')).default;
      
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ 
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(18).font('Helvetica-Bold')
           .text('Tasks Report', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica')
           .fillColor('#666666')
           .text(`${new Date().toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}`, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.4);

        // Summary (inline format)
        const pendingTasks = tasks.filter(t => t.status !== 'completed');
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent');
        
        doc.fontSize(9).font('Helvetica');
        let summaryText = '';
        if (urgentTasks.length > 0) summaryText += `${urgentTasks.length} urgent • `;
        summaryText += `${pendingTasks.length} pending • ${completedTasks.length} completed`;
        doc.fillColor('#666666').text(summaryText, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.3);

        // Separator
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.3);

        // Group tasks by household
        const tasksByHousehold: Record<string, typeof tasks> = {};
        for (const task of tasks) {
          if (!tasksByHousehold[task.householdName]) {
            tasksByHousehold[task.householdName] = [];
          }
          tasksByHousehold[task.householdName].push(task);
        }

        // Account type labels
        const accountTypeLabels: Record<string, string> = {
          cash: 'Cash', tfsa: 'TFSA', fhsa: 'FHSA', rrsp: 'RRSP', 
          lira: 'LIRA', lif: 'LIF', rif: 'RIF',
          corporate_cash: 'Corporate Cash', ipp: 'IPP',
          joint_cash: 'Joint Cash', resp: 'RESP'
        };

        // Priority colors
        const priorityLabels: Record<string, string> = {
          urgent: 'URGENT', high: 'HIGH', medium: 'MEDIUM', low: 'LOW'
        };

        // Render each household
        for (const [householdName, householdTasks] of Object.entries(tasksByHousehold)) {
          if (doc.y > 620) {
            doc.addPage();
          }

          // Household header
          doc.fontSize(12).font('Helvetica-Bold')
             .text(householdName);
          doc.moveDown(0.3);

          // Sort tasks: pending first, then by priority
          const sortedTasks = [...householdTasks].sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (b.status === 'completed' && a.status !== 'completed') return -1;
            const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
            return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
          });

          for (const task of sortedTasks) {
            if (doc.y > 700) {
              doc.addPage();
            }

            const isCompleted = task.status === 'completed';
            const accountLabel = accountTypeLabels[task.accountTypeLabel] || task.accountTypeLabel;
            const titleColor = isCompleted ? '#999999' : '#000000';
            
            // Draw checkbox
            const checkboxSize = 10;
            const checkboxX = 50;
            const checkboxY = doc.y;
            doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize).stroke();
            
            // If completed, draw checkmark inside
            if (isCompleted) {
              doc.save();
              doc.strokeColor('#666666');
              doc.moveTo(checkboxX + 2, checkboxY + 5)
                 .lineTo(checkboxX + 4, checkboxY + 8)
                 .lineTo(checkboxX + 8, checkboxY + 2)
                 .stroke();
              doc.restore();
            }
            
            // Task title (indented to account for checkbox)
            doc.fontSize(10).font(isCompleted ? 'Helvetica-Oblique' : 'Helvetica-Bold').fillColor(titleColor)
               .text(task.title, checkboxX + checkboxSize + 6, checkboxY, { continued: false });
            
            // Task details
            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            const details = [];
            details.push(`${task.ownerName}`);
            if (task.accountNickname) {
              details.push(`${accountLabel} - ${task.accountNickname}`);
            } else {
              details.push(accountLabel);
            }
            if (task.dueDate) {
              details.push(`Due: ${new Date(task.dueDate).toLocaleDateString('en-CA')}`);
            }
            details.push(`[${task.priority.toUpperCase()}]`);
            doc.text(details.join(' • '), checkboxX + checkboxSize + 6);
            
            if (task.description) {
              doc.fontSize(8).font('Helvetica').fillColor('#777777')
                 .text(task.description, checkboxX + checkboxSize + 6, doc.y, { width: 450, height: 30 });
            }
            
            doc.fillColor('#000000');
            doc.moveDown(0.4);
          }

          doc.moveDown(0.2);
        }

        doc.end();
      });

      const fileName = `Account_Tasks_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
      
    } catch (error: any) {
      log.error("Error generating tasks PDF", error);
      res.status(500).json({ message: error.message || "Failed to generate tasks PDF" });
    }
  });

  // Email tasks PDF
  app.post('/api/tasks/email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getAllTasksForUser(userId);
      const recipientEmail = process.env.TRADINGVIEW_REPORT_EMAIL;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: "No email configured. Please set TRADINGVIEW_REPORT_EMAIL." });
      }
      
      // @ts-ignore
      const PDFDocument = (await import('pdfkit')).default;
      
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ 
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(18).font('Helvetica-Bold')
           .text('Tasks Report', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica')
           .fillColor('#666666')
           .text(`${new Date().toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}`, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.4);

        // Summary
        const pendingTasks = tasks.filter(t => t.status !== 'completed');
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent');
        
        doc.fontSize(9).font('Helvetica');
        let summaryText = '';
        if (urgentTasks.length > 0) summaryText += `${urgentTasks.length} urgent • `;
        summaryText += `${pendingTasks.length} pending • ${completedTasks.length} completed`;
        doc.fillColor('#666666').text(summaryText, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.3);

        // Separator
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.3);

        // Group tasks by household
        const tasksByHousehold: Record<string, typeof tasks> = {};
        for (const task of tasks) {
          if (!tasksByHousehold[task.householdName]) {
            tasksByHousehold[task.householdName] = [];
          }
          tasksByHousehold[task.householdName].push(task);
        }

        const accountTypeLabels: Record<string, string> = {
          cash: 'Cash', tfsa: 'TFSA', fhsa: 'FHSA', rrsp: 'RRSP', 
          lira: 'LIRA', lif: 'LIF', rif: 'RIF',
          corporate_cash: 'Corporate Cash', ipp: 'IPP',
          joint_cash: 'Joint Cash', resp: 'RESP'
        };

        // Render each household
        for (const [householdName, householdTasks] of Object.entries(tasksByHousehold)) {
          if (doc.y > 620) {
            doc.addPage();
          }

          doc.fontSize(12).font('Helvetica-Bold').text(householdName);
          doc.moveDown(0.3);

          const sortedTasks = [...householdTasks].sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (b.status === 'completed' && a.status !== 'completed') return -1;
            const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
            return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
          });

          for (const task of sortedTasks) {
            if (doc.y > 700) {
              doc.addPage();
            }

            const isCompleted = task.status === 'completed';
            const accountLabel = accountTypeLabels[task.accountTypeLabel] || task.accountTypeLabel;
            const titleColor = isCompleted ? '#999999' : '#000000';
            
            const checkboxSize = 10;
            const checkboxX = 50;
            const checkboxY = doc.y;
            doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize).stroke();
            
            if (isCompleted) {
              doc.save();
              doc.strokeColor('#666666');
              doc.moveTo(checkboxX + 2, checkboxY + 5)
                 .lineTo(checkboxX + 4, checkboxY + 8)
                 .lineTo(checkboxX + 8, checkboxY + 2)
                 .stroke();
              doc.restore();
            }
            
            doc.fontSize(10).font(isCompleted ? 'Helvetica-Oblique' : 'Helvetica-Bold').fillColor(titleColor)
               .text(task.title, checkboxX + checkboxSize + 6, checkboxY, { continued: false });
            
            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            const details = [];
            details.push(`${task.ownerName}`);
            if (task.accountNickname) {
              details.push(`${accountLabel} - ${task.accountNickname}`);
            } else {
              details.push(accountLabel);
            }
            if (task.dueDate) {
              details.push(`Due: ${new Date(task.dueDate).toLocaleDateString('en-CA')}`);
            }
            details.push(`[${task.priority.toUpperCase()}]`);
            doc.text(details.join(' • '), checkboxX + checkboxSize + 6);
            
            if (task.description) {
              doc.fontSize(8).font('Helvetica').fillColor('#777777')
                 .text(task.description, checkboxX + checkboxSize + 6, doc.y, { width: 450, height: 30 });
            }
            
            doc.fillColor('#000000');
            doc.moveDown(0.4);
          }

          doc.moveDown(0.2);
        }

        doc.end();
      });

      const fileName = `Account_Tasks_${new Date().toISOString().split('T')[0]}.pdf`;
      const subject = 'Tasks Report - Investment Portfolio Management Platform';
      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Tasks Report</h2>
          <p>Please find attached your tasks report.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Generated on ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
      `;
      
      await sendEmailWithAttachment(recipientEmail, subject, body, pdfBuffer, fileName);
      
      res.json({ 
        success: true, 
        message: `Tasks report sent successfully to ${recipientEmail}` 
      });
    } catch (error: any) {
      log.error("Error emailing tasks PDF", error);
      res.status(500).json({ message: error.message || "Failed to email tasks PDF" });
    }
  });
}



