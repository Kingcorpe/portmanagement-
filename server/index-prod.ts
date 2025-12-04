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

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Support base path from environment variable (e.g., BASE_PATH=/app)
  // Defaults to '/' if not set (backward compatible)
  const basePath = process.env.BASE_PATH || '/';
  
  // Normalize base path (ensure it starts with / and ends with /)
  const normalizedBasePath = basePath === '/' ? '/' : basePath.replace(/\/$/, '') + '/';

  // Serve static files from base path
  app.use(normalizedBasePath, express.static(distPath));

  // Handle SPA routing - serve index.html for all routes under base path
  // This allows client-side routing to work
  app.use(`${normalizedBasePath}*`, (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

(async () => {
  await runApp(serveStatic);
})();
