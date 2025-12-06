// Auth Routes
import type { Express } from "express";
import { isAuthenticated, isLocalDev } from "../clerkAuth";
import { storage } from "../storage";
import { log } from "../logger";
import { authRateLimiter } from "./rateLimiter";
import { rateLimit } from "./rateLimiter";
import { db } from "../db";
import { sql } from "drizzle-orm";

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

  // Health check endpoint - checks all critical services
  app.get('/api/health', async (_req, res) => {
    const health: Record<string, { status: 'ok' | 'error' | 'warning'; message?: string; latency?: number }> = {};

    // Check Database
    const dbStart = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      health.database = { status: 'ok', latency: Date.now() - dbStart };
    } catch (error: any) {
      health.database = { status: 'error', message: error.message || 'Connection failed' };
    }

    // Check Email (Gmail) configuration
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      health.email = { status: 'ok', message: 'Configured' };
    } else {
      health.email = { status: 'warning', message: 'Not configured' };
    }

    // Check Auth (Clerk) configuration
    if (process.env.CLERK_SECRET_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
      health.auth = { status: 'ok', message: 'Configured' };
    } else {
      health.auth = { status: 'warning', message: 'Not configured' };
    }

    // Check Market Data API (Alpha Vantage or similar)
    const marketStart = Date.now();
    try {
      if (process.env.ALPHA_VANTAGE_API_KEY) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (response.ok) {
          health.marketData = { status: 'ok', latency: Date.now() - marketStart };
        } else {
          health.marketData = { status: 'warning', message: 'API returned error' };
        }
      } else {
        health.marketData = { status: 'warning', message: 'API key not configured' };
      }
    } catch (error: any) {
      health.marketData = { 
        status: 'error', 
        message: error.name === 'AbortError' ? 'Timeout' : (error.message || 'Failed')
      };
    }

    // Overall status
    const hasError = Object.values(health).some(h => h.status === 'error');
    const hasWarning = Object.values(health).some(h => h.status === 'warning');
    const overall = hasError ? 'error' : hasWarning ? 'warning' : 'ok';

    res.json({ overall, services: health, timestamp: new Date().toISOString() });
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



