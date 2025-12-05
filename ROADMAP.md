# Roadmap - Port Management System

**Last Updated:** December 2025  
**Purpose:** Single source of truth for project tracking and priorities

---

## Current Focus (This Week)

### In Progress
- [ ] **Routes.ts Refactoring** - Continue extracting modules (11/17 done, 65%)
  - Next up: Webhook routes (~740 lines)
  - Then: Household routes (~500 lines)
  - See: [REFACTORING_PLAN.md](REFACTORING_PLAN.md) for details

### Blocked / Waiting
- None currently

---

## Up Next (Queued)

### Priority 1: Code Quality
1. [ ] **Extract Webhook Routes** - Large complex module (~740 lines)
2. [ ] **Extract Household Routes** - Account management core (~500 lines)
3. [ ] **Extract Account Routes** - Individual, corporate, joint (~800 lines)
4. [ ] **Extract Position Routes** - Position tracking (~600 lines)

### Priority 2: Feature Completion
5. [ ] **Clients Page - Replace Mock Data** (`client/src/pages/clients.tsx`)
   - Currently using hardcoded mock clients
   - Need to integrate with real household/account data from API
   - TODO marker at line 10

6. [ ] **Insurance Tasks Feature** (`client/src/pages/insurance-tasks.tsx`)
   - UI exists but shows "Coming soon" placeholder
   - Should track insurance-related tasks separately from investment tasks
   - Need: API endpoints, database schema, CRUD operations

### Priority 3: Security Enhancements
7. [ ] **TradingView Webhook IP Whitelist**
   - Currently relies on webhook secret only
   - TODO at `server/routes.ts:1972`
   - Add IP whitelist for TradingView servers

---

## Ideas Backlog

### Features to Consider
- [ ] Mobile-responsive improvements
- [ ] Client portal (read-only access for clients)
- [ ] Automated rebalancing suggestions
- [ ] Performance comparison vs benchmarks
- [ ] Tax-loss harvesting alerts
- [ ] Integration with other data sources

### Technical Debt
- [ ] Add integration tests for critical paths
- [ ] Test backup restoration process
- [ ] Review and optimize database queries
- [ ] Add API documentation (Swagger/OpenAPI)

### Documentation
- [x] ~~Consolidate backup docs into single guide~~ → `docs/BACKUPS.md`
- [x] ~~Consolidate deployment docs into single guide~~ → `docs/DEPLOYMENT.md`
- [ ] Create user guide / feature documentation

---

## Completed (Recent)

### December 2025
- [x] Routes.ts refactoring started - 11 modules extracted
- [x] Security fixes (logging, error sanitization, input validation)
- [x] Winston logging system implemented
- [x] Rate limiter documentation added
- [x] Documentation consolidated (24+ docs → 9 root + 2 consolidated + 38 archived)

### January 2025
- [x] All critical security fixes (CSRF, IP whitelist framework, local dev safety)
- [x] High priority fixes (5/6 complete)
- [x] Testing checklist created
- [x] Deployment documentation

### Core Features (Complete)
- [x] Household and account management
- [x] Position tracking with real-time market data
- [x] Target allocations with variance analytics
- [x] Trading journal with image uploads
- [x] TradingView webhook integration
- [x] Task management (account-specific)
- [x] Revenue tracking (Insurance & Investment)
- [x] KPI dashboard with PDF export
- [x] Milestones tracking (Business & Personal)
- [x] Admin section (Universal Holdings, webhook logs, settings)
- [x] Demo mode for prospect demonstrations
- [x] Authentication (Replit Auth)
- [x] Database backups (automated daily)
- [x] Railway deployment + Neon PostgreSQL

---

## Progress Summary

| Area | Progress | Notes |
|------|----------|-------|
| Core Features | 100% | All major features implemented |
| Security Fixes | 95% | IP whitelist TODO remaining |
| Routes Refactoring | 65% | 11/17 modules extracted |
| Documentation | 95% | Consolidated into docs/ |
| Testing | 50% | Manual testing, needs automation |

---

## Quick Links

### Key Documentation
- [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - System architecture overview
- [REFACTORING_PLAN.md](REFACTORING_PLAN.md) - Routes.ts extraction roadmap
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Detailed status and quick reference

### Deployment & Operations
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - All deployment guides (consolidated)
- [docs/BACKUPS.md](docs/BACKUPS.md) - All backup guides (consolidated)

### Key Files
- `server/routes.ts` - Main API routes (being refactored)
- `server/routes/` - Extracted route modules
- `client/src/pages/` - Frontend pages
- `shared/schema.ts` - Database schema

---

## How to Use This Document

1. **Start here** - Check "Current Focus" for what to work on
2. **Pick next task** - Move item from "Up Next" to "Current Focus"
3. **Capture ideas** - Add to "Ideas Backlog" without losing them
4. **Mark complete** - Move finished items to "Completed" section
5. **Update weekly** - Keep this document current

---

*This is your command center. All other docs provide detail; this provides direction.*
