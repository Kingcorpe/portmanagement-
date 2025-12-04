# ✅ Refactoring Checklist

**Quick reference for continuing refactoring work**

---

## 🎯 Next Module: Tasks Routes

### Pre-Extraction
- [ ] Review current tasks routes in `server/routes.ts`
- [ ] Identify all `/api/tasks` and `/api/*-tasks` endpoints
- [ ] Note dependencies (imports, helpers, schemas)

### Extraction
- [ ] Create `server/routes/tasks.ts`
- [ ] Copy routes to new file
- [ ] Add necessary imports
- [ ] Export `registerTasksRoutes` function
- [ ] Update `server/routes.ts` to import and call function
- [ ] Remove old route definitions from `server/routes.ts`

### Testing
- [ ] Run `npm run build` - should succeed
- [ ] Check for linter errors
- [ ] Test at least one route manually
- [ ] Verify no duplicate routes

### Commit
- [ ] `git add server/routes/tasks.ts server/routes.ts`
- [ ] `git commit -m "Refactor: Extract tasks routes to separate module"`
- [ ] Update progress in `REFACTORING_CONTINUATION_GUIDE.md`

---

## 📋 All Modules Status

- [x] Rate Limiter
- [x] Auth Routes
- [x] Alert Routes
- [ ] Tasks Routes ⬅️ **NEXT**
- [ ] Settings Routes
- [ ] Library Routes
- [ ] Milestone Routes
- [ ] Reference Links Routes
- [ ] Household Routes
- [ ] Position Routes
- [ ] Trading Journal Routes
- [ ] Account Routes
- [ ] Webhook Routes
- [ ] Report Routes
- [ ] Admin Routes
- [ ] Revenue Routes
- [ ] KPI Routes

---

## 🔄 After Each Extraction

1. ✅ Build succeeds
2. ✅ No linter errors
3. ✅ Routes work
4. ✅ Committed to git
5. ✅ Progress updated

---

**Last Updated:** January 2025  
**Current Progress:** 3/17 modules (18%)

