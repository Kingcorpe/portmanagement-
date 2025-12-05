// Clerk Authentication for Express
import { clerkMiddleware, getAuth, requireAuth } from "@clerk/express";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Local dev mode flag - kept for backward compatibility but no longer bypasses auth
export const isLocalDev = process.env.LOCAL_DEV === "true" && process.env.NODE_ENV !== 'production';

// Extended request type with Clerk auth
export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string | null;
    sessionId: string | null;
  };
  user?: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

// Upsert user to database when they authenticate
async function upsertUserFromClerk(userId: string, email?: string, firstName?: string, lastName?: string) {
  try {
    await storage.upsertUser({
      id: userId,
      email: email || null,
      firstName: firstName || null,
      lastName: lastName || null,
      profileImageUrl: null,
    });
  } catch (error) {
    console.error("Error upserting user from Clerk:", error);
  }
}

export async function setupAuth(app: Express) {
  // Add Clerk middleware to all routes
  app.use(clerkMiddleware());
  
  console.log("🔐 Clerk authentication enabled");

  // Login redirect - Clerk handles this on the frontend, but we provide an API endpoint
  app.get("/api/login", (req, res) => {
    // Clerk handles login on the frontend via ClerkProvider
    // This endpoint just redirects to home where the frontend will show sign-in
    res.redirect("/");
  });

  // Callback - not needed with Clerk (handled automatically)
  app.get("/api/callback", (req, res) => {
    res.redirect("/");
  });

  // Logout - Clerk handles this on the frontend, but we provide an API endpoint
  app.get("/api/logout", (req, res) => {
    // Clerk handles logout on the frontend via signOut()
    // This endpoint just redirects to home
    res.redirect("/");
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    
    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Add user info to request in the format expected by existing routes
    req.user = {
      claims: {
        sub: auth.userId,
        // Note: To get email/name, you'd need to fetch from Clerk API or pass from frontend
      }
    };

    // Ensure user exists in database
    await upsertUserFromClerk(auth.userId);

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Helper to get user ID from request (for use in routes)
export function getUserId(req: AuthenticatedRequest): string | null {
  const auth = getAuth(req);
  return auth.userId;
}
