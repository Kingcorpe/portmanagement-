// Authentication service - supports both Replit OIDC and local dev mode
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if running in local development mode
export const isLocalDev = process.env.LOCAL_DEV === "true" || !process.env.REPL_ID;

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use database store if DATABASE_URL is available (Railway/production)
  // Use memory store only for true local dev (when DATABASE_URL is not set)
  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true, // Create table if it doesn't exist
      ttl: sessionTtl,
      tableName: "sessions",
    });
    return session({
      secret: process.env.SESSION_SECRET || "local-dev-secret-change-in-production",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: sessionTtl,
        sameSite: 'lax',
      },
    });
  }
  
  // Memory store only for true local dev (no database)
  return session({
    secret: process.env.SESSION_SECRET || "local-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Allow HTTP in local dev
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local development mode - skip OIDC setup (works on Railway/local)
  if (isLocalDev) {
    console.log("🔓 Running in LOCAL DEV mode - authentication bypassed");
    
    // Use existing user ID to access existing data
    // Change this to your user ID if you have existing data
    let devUserId = process.env.DEV_USER_ID || "50142011";
    
    // CRITICAL: Ensure user exists in database
    // Handle both cases: user doesn't exist, or user exists with different ID but same email
    try {
      let existingUser = await storage.getUser(devUserId);
      if (!existingUser) {
        // Try to create user
        try {
          existingUser = await storage.upsertUser({
            id: devUserId,
            email: "dev@localhost",
            firstName: "Local",
            lastName: "Developer",
            profileImageUrl: null,
          });
          console.log(`User ${devUserId} created successfully`);
        } catch (createError: any) {
          // If duplicate email, find existing user and use that ID
          if (createError?.code === '23505' && createError?.constraint === 'users_email_unique') {
            const { db } = await import("./db");
            const { users } = await import("@shared/schema");
            const { eq } = await import("drizzle-orm");
            const usersWithEmail = await db.select().from(users).where(eq(users.email, "dev@localhost"));
            if (usersWithEmail.length > 0) {
              existingUser = usersWithEmail[0];
              console.log(`User with email dev@localhost already exists with ID ${existingUser.id}, using that`);
              // Update devUserId to match existing user
              devUserId = existingUser.id;
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }
      if (!existingUser) {
        throw new Error("Failed to ensure user exists in database");
      }
    } catch (error: any) {
      console.error("Error ensuring user exists:", error);
      // Don't throw - let the app start, but log the error
    }
    
    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    // Auto-login middleware for local dev
    // Skip auto-login if user is logging out
    app.use((req: any, res, next) => {
      // Don't auto-login if this is a logout request
      if (req.path === '/api/logout') {
        return next();
      }
      
      if (!req.user) {
        const user = {
          claims: {
            sub: devUserId,
            email: "dev@localhost",
            first_name: "Local",
            last_name: "Developer",
          },
          expires_at: Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year from now
        };
        req.user = user;
        req.isAuthenticated = () => true;
        // Save to session so it persists
        req.login(user, (err: any) => {
          if (err) console.error("Session save error:", err);
          next();
        });
      } else {
        next();
      }
    });

    app.get("/api/login", (req: any, res) => {
      // Ensure user is logged in
      if (!req.user) {
        const user = {
          claims: {
            sub: devUserId,
            email: "dev@localhost",
            first_name: "Local",
            last_name: "Developer",
          },
          expires_at: Math.floor(Date.now() / 1000) + 86400 * 365,
        };
        req.login(user, (err: any) => {
          if (err) console.error("Login error:", err);
          res.redirect("/");
        });
      } else {
        res.redirect("/");
      }
    });

    app.get("/api/callback", (req, res) => {
      res.redirect("/");
    });

    app.get("/api/logout", (req: any, res) => {
      // Clear user from request before destroying session
      req.user = null;
      req.isAuthenticated = () => false;
      
      // Destroy the session to actually log out
      req.logout((err: any) => {
        if (err) {
          console.error("Logout error:", err);
        }
        // Destroy the session
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Session destroy error:", err);
          }
          // Clear the session cookie
          res.clearCookie('connect.sid', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
          // Redirect to a page that won't auto-login
          res.redirect("/?loggedOut=true");
        });
      });
    });

    return;
  }

  // Production mode - use Replit OIDC
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // In local dev mode, always allow
  if (isLocalDev) {
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
