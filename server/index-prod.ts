console.log("[STARTUP] Beginning server initialization...");

import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

console.log("[STARTUP] Core modules loaded");

import express, { type Express } from "express";
console.log("[STARTUP] Express loaded");

import runApp from "./app";
console.log("[STARTUP] App module loaded");

export async function serveStatic(app: Express, _server: Server) {
  // Look for dist/public relative to project root (one level up from server/)
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  
  console.log("[STATIC] import.meta.dirname:", import.meta.dirname);
  console.log("[STATIC] Resolved distPath:", distPath);
  console.log("[STATIC] distPath exists:", fs.existsSync(distPath));
  
  // Also try alternative path (directly under dist)
  const altPath = path.resolve(import.meta.dirname, "public");
  console.log("[STATIC] Alt path:", altPath);
  console.log("[STATIC] Alt path exists:", fs.existsSync(altPath));
  
  // List contents of import.meta.dirname to help debug
  try {
    const dirContents = fs.readdirSync(import.meta.dirname);
    console.log("[STATIC] Contents of dirname:", dirContents);
  } catch (e) {
    console.log("[STATIC] Could not list dirname contents");
  }

  // Determine which path to use
  let finalPath = distPath;
  if (!fs.existsSync(distPath)) {
    if (fs.existsSync(altPath)) {
      console.log("[STATIC] Using alternative path");
      finalPath = altPath;
    } else {
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`,
      );
    }
  }
  
  console.log("[STATIC] Final path:", finalPath);

  // Support base path from environment variable (e.g., BASE_PATH=/app)
  // Defaults to '/' if not set (backward compatible)
  const basePath = process.env.BASE_PATH || '/';
  
  // Normalize base path (ensure it starts with / and ends with /)
  const normalizedBasePath = basePath === '/' ? '/' : basePath.replace(/\/$/, '') + '/';

  // CACHE BUSTING: Serve hashed assets with long cache (1 year)
  // Files in /assets/ have content hashes in their names, so they can be cached forever
  app.use(
    `${normalizedBasePath}assets`,
    express.static(path.join(finalPath, "assets"), {
      maxAge: "1y",
      immutable: true,
    })
  );
  console.log("[STATIC] Hashed assets middleware registered with 1 year cache");

  // Serve other static files (favicon, etc.) with short cache
  app.use(normalizedBasePath, express.static(finalPath, {
    maxAge: "1h",
    // Exclude index.html from this middleware (handled separately below)
    index: false,
  }));
  console.log("[STATIC] Static middleware registered for:", normalizedBasePath);

  // Handle SPA routing - serve index.html for all routes under base path
  // IMPORTANT: Set no-cache for index.html so browsers always get the latest version
  // This ensures new deployments are picked up without clearing browser cache
  app.use(`${normalizedBasePath}*`, (_req, res) => {
    // Only send if headers haven't been sent (prevents "Can't set headers" error)
    if (!res.headersSent) {
      // Prevent caching of index.html
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.resolve(finalPath, "index.html"));
    }
  });
  console.log("[STATIC] SPA routing registered with no-cache for index.html");
}

(async () => {
  await runApp(serveStatic);
})();
