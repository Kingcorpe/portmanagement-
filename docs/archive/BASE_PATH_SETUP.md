# Serving App at Base Path (e.g., `/app`)

This guide shows how to configure your app to serve from a base path like `www.completeretirementsolutions.com/app` instead of the root domain.

## ⚠️ Important Notes

- This requires code changes and a rebuild
- All assets and routes will be prefixed with `/app`
- API routes can stay at root or be moved to `/app/api`
- You'll need to set the `BASE_PATH` environment variable

## 🚀 Implementation Steps

### Step 1: Add Base Path Environment Variable

Add to Railway environment variables:
```
BASE_PATH=/app
```

Or leave unset for root path (backward compatible).

### Step 2: Update Vite Configuration

The Vite config needs to use the base path for asset URLs.

### Step 3: Update Express Static Serving

The Express server needs to serve static files from the base path.

### Step 4: Update React Router

React Router needs to know about the base path.

### Step 5: Update API Route References

Any hardcoded API URLs need to account for the base path.

## 📝 Detailed Changes

### 1. Update `vite.config.ts`

Add base path configuration:

```typescript
export default defineConfig(async () => {
  const basePath = process.env.BASE_PATH || '/';
  
  return {
    base: basePath, // This is the key change
    // ... rest of config
  };
});
```

### 2. Update `server/index-prod.ts`

Serve static files from base path:

```typescript
export async function serveStatic(app: Express, _server: Server) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  const basePath = process.env.BASE_PATH || '/';

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}`);
  }

  // Serve static files from base path
  app.use(basePath, express.static(distPath));

  // Handle SPA routing - serve index.html for all routes under base path
  app.use(`${basePath}*`, (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

### 3. Update `server/index-dev.ts`

For development, update Vite middleware:

```typescript
export async function setupVite(app: Express, server: Server) {
  const basePath = process.env.BASE_PATH || '/';
  
  // ... vite setup ...
  
  app.use(basePath, vite.middlewares);
  
  app.use(`${basePath}*`, async (req, res, next) => {
    // ... existing code ...
  });
}
```

### 4. Update Router (Wouter)

Your app uses **wouter** for routing. Wouter automatically works with the browser's location, so as long as Vite's base path is configured correctly, wouter will work automatically. No changes needed to your router code!

However, if you need to programmatically access the base path in your code:

```typescript
const basePath = import.meta.env.VITE_BASE_PATH || '/';
```

### 5. Update Vite Environment Variables

Vite needs to know the base path at build time. Update `vite.config.ts`:

```typescript
export default defineConfig(async () => {
  const basePath = process.env.BASE_PATH || '/';
  
  return {
    base: basePath,
    define: {
      'import.meta.env.VITE_BASE_PATH': JSON.stringify(basePath),
    },
    // ... rest
  };
});
```

### 6. Update API Calls (if needed)

If your API calls use relative paths, they should work. If they use absolute paths, update them:

```typescript
// Instead of:
fetch('/api/something')

// Use:
const basePath = import.meta.env.VITE_BASE_PATH || '';
fetch(`${basePath}/api/something`)
```

However, since your API routes are at `/api/*`, they should work fine as-is if you keep them at root.

## 🔧 Alternative: Keep API at Root, App at `/app`

If you want:
- App UI at: `www.completeretirementsolutions.com/app`
- API at: `www.completeretirementsolutions.com/api`

This is actually easier! Your API routes stay as-is, and only the frontend serves from `/app`.

### Simplified Approach:

1. **Vite base path**: Set to `/app`
2. **Express static**: Serve from `/app`
3. **API routes**: Keep at root (no changes needed)
4. **React Router**: Use `/app` as basename

This way:
- `www.completeretirementsolutions.com/api/*` → Your API (unchanged)
- `www.completeretirementsolutions.com/app/*` → Your React app

## 🧪 Testing Locally

1. Set environment variable:
   ```bash
   export BASE_PATH=/app
   ```

2. Rebuild:
   ```bash
   npm run build
   ```

3. Start:
   ```bash
   npm start
   ```

4. Test:
   - Visit `http://localhost:5000/app` - should show your app
   - Visit `http://localhost:5000/api/...` - should work as before

## 🚀 Deploying to Railway

1. **Add environment variable in Railway:**
   - Go to Railway → Your Service → Variables
   - Add: `BASE_PATH=/app`

2. **Push code changes:**
   ```bash
   git add .
   git commit -m "Add base path support"
   git push origin main
   ```

3. **Railway will rebuild** with the new base path

4. **Configure your domain:**
   - Point `www.completeretirementsolutions.com` to Railway
   - App will be accessible at `www.completeretirementsolutions.com/app`

## ⚠️ Important Considerations

### Webhook URLs

Your webhook URLs will change:
- Old: `https://your-domain.com/api/webhooks/tradingview`
- New: `https://www.completeretirementsolutions.com/api/webhooks/tradingview` (if API stays at root)

### Authentication Callbacks

If using OAuth/callbacks, make sure callback URLs account for the base path if needed.

### Asset Loading

All assets (images, CSS, JS) will be loaded from `/app/assets/...` instead of `/assets/...`. Vite handles this automatically when you set the `base` option.

## 🎯 Quick Start (Already Implemented!)

The code changes have been made! Here's what to do:

1. **Set `BASE_PATH=/app` in Railway**
   - Go to Railway → Your Service → Variables
   - Add: `BASE_PATH=/app`

2. **Rebuild and deploy**
   ```bash
   git add .
   git commit -m "Add base path support"
   git push origin main
   ```

3. **Configure your domain**
   - Point `www.completeretirementsolutions.com` to Railway
   - App will be accessible at `www.completeretirementsolutions.com/app`
   - API will still work at `www.completeretirementsolutions.com/api`

This gives you:
- ✅ App at `/app`
- ✅ API at `/api` (unchanged)
- ✅ Wouter routing works automatically
- ✅ All assets load correctly

## 📚 Reference

- [Vite Base Path Docs](https://vitejs.dev/config/shared-options.html#base)
- [React Router Basename](https://reactrouter.com/en/main/router-components/browser-router#basename)
- [Express Static with Path](https://expressjs.com/en/starter/static-files.html)

