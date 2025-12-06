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

    // Check Market Data API - Marketstack (primary), Twelve Data (alt), Yahoo (fallback)
    const marketStart = Date.now();
    const marketstackKey = process.env.MARKETSTACK_API_KEY;
    const twelveDataKey = process.env.TWELVE_DATA_API_KEY;
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      if (marketstackKey) {
        // Check Marketstack (primary paid API)
        const response = await fetch(
          `https://api.marketstack.com/v1/eod/latest?access_key=${marketstackKey}&symbols=AAPL`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (response.ok) {
          const data = await response.json();
          if (data?.data?.[0]?.close) {
            health.marketData = { status: 'ok', message: 'Marketstack', latency: Date.now() - marketStart };
          } else if (data?.error) {
            health.marketData = { status: 'warning', message: `Marketstack: ${data.error.message || 'Error'}` };
          } else {
            health.marketData = { status: 'warning', message: 'Marketstack: No data' };
          }
        } else {
          health.marketData = { status: 'error', message: `Marketstack: HTTP ${response.status}` };
        }
      } else if (twelveDataKey) {
        // Check Twelve Data (alternate paid API)
        const response = await fetch(
          `https://api.twelvedata.com/price?symbol=AAPL&apikey=${twelveDataKey}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (response.ok) {
          const data = await response.json();
          if (data?.price) {
            health.marketData = { status: 'ok', message: 'Twelve Data', latency: Date.now() - marketStart };
          } else {
            health.marketData = { status: 'warning', message: 'Twelve Data: No price' };
          }
        } else {
          health.marketData = { status: 'error', message: `Twelve Data: HTTP ${response.status}` };
        }
      } else {
        // Fallback to Yahoo Finance (free, no API key)
        clearTimeout(timeout);
        const yahooController = new AbortController();
        const yahooTimeout = setTimeout(() => yahooController.abort(), 5000);
        const response = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
          { signal: yahooController.signal }
        );
        clearTimeout(yahooTimeout);
        if (response.ok) {
          health.marketData = { status: 'warning', message: 'Yahoo (no paid API configured)', latency: Date.now() - marketStart };
        } else {
          health.marketData = { status: 'error', message: 'Yahoo: Failed' };
        }
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



