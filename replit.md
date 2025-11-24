# Canadian Investment Portfolio Management Platform

## Project Overview
A secure investment portfolio management system for Canadian client accounts (individuals and corporations) with TradingView alert integration. Built for financial advisors to manage household-based client portfolios with multiple Canadian account types.

## Current Status
**Backend Complete** - Database schema, authentication, and API routes fully implemented with comprehensive validation.

**Frontend** - In progress (basic UI prototypes exist, needs integration with backend)

## Architecture

### Technology Stack
- **Frontend**: React + TypeScript + Vite + Wouter (routing)
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL (Neon)
- **Authentication**: Replit Auth (OIDC)
- **Validation**: Zod
- **ORM**: Drizzle

### Data Model

#### Household-Based Hierarchy
```
Households
├── Individuals
│   ├── Cash Account
│   ├── TFSA (Tax-Free Savings Account)
│   ├── FHSA (First Home Savings Account)
│   ├── RRSP (Registered Retirement Savings Plan)
│   ├── LIRA (Locked-In Retirement Account)
│   ├── LIFF (Life Income Fund)
│   └── RIF (Retirement Income Fund)
├── Corporations
│   ├── Cash Account
│   └── IPP (Individual Pension Plan)
└── Joint Accounts
    ├── Joint Cash
    └── RESP (Registered Education Savings Plan)
```

#### Database Tables
- **users** - Authentication (Replit Auth integration)
- **sessions** - Session management
- **households** - Top-level client groupings
- **individuals** - Individual clients within households
- **corporations** - Corporate entities within households
- **individual_accounts** - Individual Canadian account types (Cash, TFSA, FHSA, RRSP, LIRA, LIFF, RIF)
- **corporate_accounts** - Corporate Canadian account types (Cash, IPP)
- **joint_accounts** - Joint account types (Joint Cash, RESP)
- **joint_account_ownership** - Many-to-many join table linking individuals to joint accounts
- **positions** - Unified holdings/positions table supporting all account types
- **alerts** - TradingView webhook alerts (BUY/SELL signals)
- **trades** - Manual trade records

### Key Design Decisions

1. **Separate Account Tables**: Individual, corporate, and joint accounts are stored in separate tables with dedicated enums for type safety
2. **Unified Positions Table**: All holdings use a single `positions` table with nullable foreign keys to different account types
3. **Joint Account Ownership**: Proper many-to-many relationship via `joint_account_ownership` table for referential integrity
4. **Numeric Validation**: All monetary fields (balance, performance, price, quantity) use Zod's `z.coerce.number()` with validation, then transform to strings for Drizzle decimal storage
5. **CAD Currency**: All amounts displayed in Canadian dollars

## API Endpoints

### Authentication
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout user

### Households
- `GET /api/households` - List all households
- `POST /api/households` - Create household
- `GET /api/households/:id` - Get household details
- `PATCH /api/households/:id` - Update household
- `DELETE /api/households/:id` - Delete household

### Individuals & Corporations
- `GET /api/households/:householdId/individuals` - List individuals in household
- `POST /api/individuals` - Create individual
- `GET /api/households/:householdId/corporations` - List corporations in household
- `POST /api/corporations` - Create corporation

### Accounts
- `GET /api/individuals/:individualId/accounts` - List individual accounts
- `POST /api/individual-accounts` - Create individual account
- `GET /api/corporations/:corporationId/accounts` - List corporate accounts
- `POST /api/corporate-accounts` - Create corporate account
- `GET /api/households/:householdId/joint-accounts` - List joint accounts
- `POST /api/joint-accounts` - Create joint account

### Joint Account Ownership
- `GET /api/joint-accounts/:jointAccountId/owners` - List account owners
- `POST /api/joint-account-ownership` - Add owner to joint account

### Positions
- `GET /api/individual-accounts/:accountId/positions` - List positions
- `GET /api/corporate-accounts/:accountId/positions` - List positions
- `GET /api/joint-accounts/:accountId/positions` - List positions
- `POST /api/positions` - Create position
- `PATCH /api/positions/:id` - Update position

### Alerts (TradingView Integration)
- `GET /api/alerts` - List all alerts (optional ?status=pending|executed|dismissed)
- `PATCH /api/alerts/:id` - Update alert status
- `POST /api/webhooks/tradingview` - TradingView webhook endpoint (no auth)

### Trades
- `GET /api/trades` - List all trades
- `POST /api/trades` - Record manual trade

## Validation & Error Handling

All endpoints use Zod validation schemas with proper error handling:
- **400 Bad Request**: Validation errors (ZodError) with detailed error messages
- **401 Unauthorized**: Authentication required or session expired
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Database or operational failures

Monetary field validation:
- `balance`, `performance`, `price`, `quantity` all validated as positive/non-negative numbers
- Automatic coercion from various input formats
- Transformation to string for Drizzle decimal storage

## TradingView Webhook Integration

### Webhook Endpoint
`POST /api/webhooks/tradingview`

### Expected Payload
```json
{
  "symbol": "AAPL",
  "signal": "BUY",  // or "SELL"
  "price": 150.25,
  "message": "Optional message"
}
```

### Validation
- Symbol: required, 1-20 characters
- Signal: must be "BUY" or "SELL"
- Price: required, positive number
- Message: optional string

## Security Features
- Replit Auth with OIDC (supports Google, GitHub, X, Apple, email/password)
- Session-based authentication stored in PostgreSQL
- Session TTL: 7 days
- Protected routes using `isAuthenticated` middleware
- Secure cookie settings (httpOnly, secure, maxAge)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `SESSION_SECRET` - Session encryption key (auto-provided by Replit)
- `ISSUER_URL` - OIDC issuer URL (defaults to Replit)
- `REPL_ID` - Replit application ID

## Development Commands
- `npm run dev` - Start development server (Express + Vite)
- `npm run db:push` - Sync database schema
- `npm run db:push -- --force` - Force sync (for major schema changes)

## Next Steps

### Immediate (Frontend Integration)
1. Create `client/src/hooks/useAuth.ts` - Authentication hook
2. Create `client/src/lib/authUtils.ts` - Auth utility functions
3. Add auth guards to protected pages (Dashboard, Households, Alerts)
4. Implement unauthorized error handling (page-level and endpoint-level)
5. Create landing page for logged-out users
6. Update routing to show landing vs. authenticated views

### Core Features
1. Household management UI
   - List view with expandable cards
   - Create/edit/delete households
   - View individuals, corporations, and joint accounts per household
2. Account management
   - Create accounts for individuals/corporations
   - Manage joint account ownership
   - Display account balances and performance
3. Position/Holdings management
   - View positions per account
   - Import holdings from Excel
   - Update current prices
4. Alerts feed
   - Display TradingView alerts
   - Filter by status (pending/executed/dismissed)
   - Update alert status
5. Trade recording
   - Manual trade entry
   - Link trades to specific accounts
   - Trade history view

### Future Enhancements
- Excel import functionality for holdings
- Real-time price updates integration
- Performance analytics and reporting
- Multi-user support (advisors + junior advisors with role-based permissions)
- Audit trail for all transactions
- Export reports to PDF/Excel
- TradingView webhook secret validation

## File Structure
```
├── server/
│   ├── index.ts          # Express app entry
│   ├── db.ts             # Drizzle database connection
│   ├── storage.ts        # Data access layer
│   ├── routes.ts         # API route handlers
│   └── replitAuth.ts     # Authentication setup
├── shared/
│   └── schema.ts         # Drizzle schema + Zod validation
├── client/
│   └── src/
│       ├── App.tsx       # React app root
│       ├── pages/        # Page components
│       ├── components/   # Reusable components
│       └── hooks/        # React hooks (auth, etc.)
└── design_guidelines.md  # UI/UX design specifications
```

## Canadian Account Types Reference

### Individual Accounts
- **Cash**: Non-registered taxable account
- **TFSA**: Tax-free growth and withdrawals
- **FHSA**: First-time home buyer savings
- **RRSP**: Tax-deferred retirement savings
- **LIRA**: Locked-in pension funds
- **LIFF**: Pension income withdrawal
- **RIF**: Retirement income fund

### Corporate Accounts
- **Cash**: Corporate non-registered account
- **IPP**: Individual Pension Plan (incorporated professionals)

### Joint Accounts
- **Joint Cash**: Shared non-registered account
- **RESP**: Education savings for beneficiaries

## Notes
- All monetary values stored as decimal(15,2) for precision
- Performance metrics stored as decimal(8,4) for percentage accuracy
- UUIDs used for all primary keys via `gen_random_uuid()`
- Cascading deletes configured for data integrity
- Timestamps automatically managed for created_at/updated_at

---

Last Updated: November 24, 2025
