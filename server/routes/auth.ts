// Auth Routes
import type { Express } from "express";
import { isAuthenticated, isLocalDev } from "../replitAuth";
import { storage } from "../storage";
import { log } from "../logger";
import { authRateLimiter } from "./rateLimiter";
import { rateLimit } from "./rateLimiter";

export function registerAuthRoutes(app: Express) {
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

