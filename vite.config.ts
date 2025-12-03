import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Conditionally load Replit plugins only if on Replit
const isReplit = process.env.REPL_ID !== undefined;
const isDev = process.env.NODE_ENV !== "production";

// Helper to safely load Replit plugins
async function loadReplitPlugins() {
  if (!isReplit || !isDev) {
    return [];
  }
  
  const plugins = [];
  
  try {
    const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal");
    plugins.push(runtimeErrorOverlay.default());
  } catch (e) {
    // Plugin not available, skip
  }
  
  try {
    const cartographer = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographer.cartographer());
  } catch (e) {
    // Plugin not available, skip
  }
  
  try {
    const devBanner = await import("@replit/vite-plugin-dev-banner");
    plugins.push(devBanner.devBanner());
  } catch (e) {
    // Plugin not available, skip
  }
  
  return plugins;
}

export default defineConfig(async () => {
  const replitPlugins = await loadReplitPlugins();
  
  return {
    plugins: [
      react(),
      ...replitPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
