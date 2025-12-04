# Routes.ts Refactoring Plan

**Date:** January 2025  
**Status:** 🟢 **IN PROGRESS** - Incremental refactoring

---

## 📊 Current State

- **Original File:** `server/routes.ts` (8,112 lines)
- **Goal:** Split into modular route files
- **Approach:** Incremental extraction (one module at a time)

---

## ✅ Completed Extractions

### 1. Rate Limiter Module ✅
- **File:** `server/routes/rateLimiter.ts`
- **Status:** Extracted and working
- **Contains:** RateLimiter class, rate limiters, rateLimit middleware
- **Lines Extracted:** ~150 lines

### 2. Auth Routes ✅
- **File:** `server/routes/auth.ts`
- **Status:** Extracted and working
- **Contains:** `/api/auth/user` endpoint
- **Lines Extracted:** ~53 lines

### 3. Alert Routes ✅
- **File:** `server/routes/alerts.ts`
- **Status:** Extracted and working
- **Contains:** `/api/alerts` endpoints (GET, PATCH, dismiss-all)
- **Lines Extracted:** ~120 lines

---

## 🔄 In Progress

### 4. Webhook Routes (Next - Large)
- **File:** `server/routes/webhooks.ts` (to be created)
- **Contains:** TradingView webhook endpoint
- **Estimated Size:** ~740 lines
- **Status:** Planning extraction (large, complex route with many dependencies)

---

## 📋 Planned Extractions

### Phase 1: Core Routes (Priority)
1. ✅ Rate Limiter - DONE
2. ✅ Auth Routes - DONE
3. ⏳ Webhook Routes - NEXT
4. ⏳ Household Routes - ~500 lines
5. ⏳ Account Routes - ~800 lines (individual, corporate, joint)

### Phase 2: Feature Routes
6. ⏳ Position Routes - ~600 lines
7. ⏳ Alert Routes - ~200 lines
8. ⏳ Task Routes - ~400 lines
9. ⏳ Trading Journal Routes - ~300 lines

### Phase 3: Admin & Reports
10. ⏳ Report Routes - ~400 lines
11. ⏳ Admin Routes - ~300 lines
12. ⏳ Revenue Routes - ~400 lines
13. ⏳ KPI Routes - ~300 lines

### Phase 4: Supporting Routes
14. ⏳ User Settings Routes - ~200 lines
15. ⏳ Library Routes - ~200 lines
16. ⏳ Milestone Routes - ~200 lines
17. ⏳ Reference Links Routes - ~200 lines

---

## 🏗️ Target Structure

```
server/
  routes/
    index.ts              # Main router (imports all routes)
    rateLimiter.ts        # ✅ Rate limiting utilities
    auth.ts               # ✅ Authentication routes
    webhooks.ts           # ⏳ Webhook endpoints
    households.ts         # ⏳ Household management
    accounts.ts           # ⏳ Account management
    positions.ts          # ⏳ Position tracking
    alerts.ts             # ⏳ Alert management
    tasks.ts              # ⏳ Task management
    trading-journal.ts    # ⏳ Trading journal
    reports.ts            # ⏳ Report generation
    admin.ts              # ⏳ Admin routes
    revenue.ts            # ⏳ Revenue tracking
    kpi.ts                # ⏳ KPI dashboard
    settings.ts           # ⏳ User settings
    library.ts            # ⏳ Library documents
    milestones.ts         # ⏳ Milestones
    reference-links.ts    # ⏳ Reference links
  routes.ts               # ⏳ Will become thin wrapper (or removed)
```

---

## 📝 Extraction Process

### For Each Module:

1. **Create new file** in `server/routes/`
2. **Extract related routes** from `routes.ts`
3. **Export register function** (e.g., `registerAuthRoutes`)
4. **Import dependencies** (storage, schemas, etc.)
5. **Update main routes.ts** to import and call register function
6. **Test** that routes still work
7. **Commit** changes

### Example Pattern:

```typescript
// server/routes/auth.ts
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";

export function registerAuthRoutes(app: Express) {
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    // ... route handler
  });
}

// server/routes.ts
export async function registerRoutes(app: Express): Promise<Server> {
  // ... setup
  
  const { registerAuthRoutes } = await import("./routes/auth");
  registerAuthRoutes(app);
  
  // ... other routes
}
```

---

## ✅ Benefits of This Approach

1. **Incremental** - One module at a time
2. **Testable** - Test after each extraction
3. **Low Risk** - Easy to rollback if issues
4. **Maintainable** - Each module is self-contained
5. **Scalable** - Easy to add new routes

---

## 🎯 Progress Tracking

**Lines Extracted:** ~323 / 7,906 (4.1%)  
**Modules Extracted:** 3 / 17 (18%)  
**Estimated Remaining:** ~7,583 lines

**Note:** Webhook routes are large (~740 lines) and complex. Consider extracting after smaller modules are done.

**Next Steps:**
1. Extract webhook routes
2. Extract household routes
3. Continue incrementally

---

## 📌 Notes

- Each extraction is independent
- Can be done over time
- No rush - quality over speed
- Test thoroughly after each extraction

---

*Refactoring is incremental and low-risk. Each module extraction is tested before moving to the next.*

