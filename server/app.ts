import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";

import { registerRoutes } from "./routes";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// SECURITY: Add security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy (relaxed for development, stricter in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.accounts.dev https://*.clerk.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; " +
      "connect-src 'self' https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://*.clerk.accounts.dev https://clerk.accounts.dev https://api.clerk.dev https://*.clerk.com; " +
      "frame-src 'self' https://*.clerk.accounts.dev https://clerk.accounts.dev https://*.clerk.com; " +
      "worker-src 'self' blob:;"
    );
  }
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  console.log("[APP] runApp starting...");
  
  try {
    console.log("[APP] Registering routes...");
    const server = await registerRoutes(app);
    console.log("[APP] Routes registered successfully");

    // HIGH PRIORITY FIX #8: Use sanitized error handler
    console.log("[APP] Loading error handler...");
    const { createErrorHandler } = await import("./errorUtils");
    app.use(createErrorHandler(process.env.NODE_ENV === 'production'));
    console.log("[APP] Error handler loaded");

    // importantly run the final setup after setting up all the other routes so
    // the catch-all route doesn't interfere with the other routes
    console.log("[APP] Running setup...");
    await setup(app, server);
    console.log("[APP] Setup complete");

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = process.env.LOCAL_DEV === 'true' ? '127.0.0.1' : '0.0.0.0';
    console.log(`[APP] Starting server on ${host}:${port}...`);
    server.listen(port, host, () => {
      log(`serving on http://${host}:${port}`);
      console.log(`[APP] Server successfully listening on ${host}:${port}`);
    });
  } catch (error) {
    console.error("[APP] FATAL ERROR during startup:", error);
    process.exit(1);
  }
}
