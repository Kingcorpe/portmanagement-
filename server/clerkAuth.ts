// Clerk Authentication for Express
import { clerkMiddleware, getAuth, requireAuth } from "@clerk/express";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Local dev mode flag - kept for backward compatibility but no longer bypasses auth
export const isLocalDev = process.env.LOCAL_DEV === "true" && process.env.NODE_ENV !== 'production';

// Session configuration (needed for CSRF tokens)
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // SECURITY: Require SESSION_SECRET in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === 'production') {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }
  
  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });
    return session({
      secret: sessionSecret || "local-dev-secret-change-in-production",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: sessionTtl,
        sameSite: 'lax',
      },
    });
  }
  
  // Memory store only for local dev
  return session({
    secret: sessionSecret || "local-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: sessionTtl,
    },
  });
}

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
  // Trust proxy for secure cookies behind Railway's proxy
  app.set("trust proxy", 1);
  
  // Add session middleware (needed for CSRF tokens)
  app.use(getSession());
  
  // Log Clerk configuration status
  console.log("[CLERK] CLERK_SECRET_KEY set:", !!process.env.CLERK_SECRET_KEY);
  console.log("[CLERK] CLERK_SECRET_KEY length:", process.env.CLERK_SECRET_KEY?.length || 0);
  console.log("[CLERK] CLERK_PUBLISHABLE_KEY set:", !!process.env.CLERK_PUBLISHABLE_KEY);
  
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
