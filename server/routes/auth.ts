// Auth Routes
import type { Express } from "express";
import { isAuthenticated, isLocalDev } from "../clerkAuth";
import { storage } from "../storage";
import { log } from "../logger";
import { authRateLimiter } from "./rateLimiter";
import { rateLimit } from "./rateLimiter";
import { getHealthState, acknowledgeAlert } from "../healthMonitor";
import { testEmailConnection } from "../gmail";

// Capture deploy time at server startup
const DEPLOY_TIME = new Date().toISOString();
const GIT_COMMIT = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || 'local';
const GIT_MESSAGE = process.env.RAILWAY_GIT_COMMIT_MESSAGE || 'Local development';

export function registerAuthRoutes(app: Express) {
  // Version/deploy status endpoint (public, no auth required)
  app.get('/api/version', (_req, res) => {
    res.json({
      deployedAt: DEPLOY_TIME,
      commit: GIT_COMMIT,
      message: GIT_MESSAGE,
      uptime: Math.floor(process.uptime()) + 's',
    });
  });

  // Health check endpoint - uses the health monitor for live data
  app.get('/api/health', (_req, res) => {
    const state = getHealthState();
    
    // Transform to simpler format for frontend
    const services: Record<string, { status: string; message?: string; latency?: number }> = {};
    for (const [key, value] of Object.entries(state.services)) {
      services[key] = {
        status: value.status,
        message: value.message,
        latency: value.latency,
      };
    }
    
    const hasError = Object.values(state.services).some(h => h.status === 'error');
    const hasWarning = Object.values(state.services).some(h => h.status === 'warning');
    const overall = hasError ? 'error' : hasWarning ? 'warning' : 'ok';
    
    res.json({ 
      overall, 
      services, 
      activeAlerts: state.activeAlerts,
      timestamp: new Date().toISOString() 
    });
  });

  // Get active alerts endpoint
  app.get('/api/health/alerts', (_req, res) => {
    const state = getHealthState();
    res.json({
      alerts: state.activeAlerts,
      count: state.activeAlerts.length,
      hasErrors: state.activeAlerts.some(a => a.severity === 'error'),
      hasWarnings: state.activeAlerts.some(a => a.severity === 'warning'),
    });
  });

  // Acknowledge an alert
  app.post('/api/health/alerts/:alertId/acknowledge', isAuthenticated, (req, res) => {
    const { alertId } = req.params;
    const success = acknowledgeAlert(alertId);
    if (success) {
      res.json({ success: true, message: 'Alert acknowledged' });
    } else {
      res.status(404).json({ success: false, message: 'Alert not found' });
    }
  });
  // Test email configuration endpoint
  app.get('/api/test-email', isAuthenticated, async (_req, res) => {
    try {
      const result = await testEmailConnection();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Unknown error',
      });
    }
  });

  // Auth routes
  app.get('/api/auth/user', rateLimit(authRateLimiter, (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.claims?.sub || 'anonymous';
    return `${ip}:${userId}`;
  }), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Local dev mode - return user from session if database lookup fails
      if (isLocalDev) {
        try {
          const user = await storage.getUser(userId);
          if (user) {
            return res.json(user);
          }
        } catch (error) {
          // If user doesn't exist in DB, return user from session
        }
        
        // Return user from session for local dev
        return res.json({
          id: req.user.claims.sub,
          email: req.user.claims.email || "dev@localhost",
          firstName: req.user.claims.first_name || "Local",
          lastName: req.user.claims.last_name || "Developer",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      // Production mode - must exist in database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      log.error("Error fetching user", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}



