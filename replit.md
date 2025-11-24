# Canadian Investment Portfolio Management Platform

## Project Overview
A secure investment portfolio management system for Canadian client accounts (individuals and corporations) with TradingView alert integration. Built for financial advisors to manage household-based client portfolios with multiple Canadian account types.

## Current Status
**Backend Complete** - Full CRUD API with all routes implemented, tested, and validated.

**Frontend Authentication** - Replit Auth integrated with protected routes, landing page, and error handling.

**Frontend Data Integration** - In progress (connecting household management UI to real API)

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
- `GET /api/households/:id/full` - **Get complete household with all nested data (individuals, corporations, accounts)**
- `PATCH /api/households/:id` - Update household
- `DELETE /api/households/:id` - Delete household

### Individuals
- `GET /api/households/:householdId/individuals` - List individuals in household
- `POST /api/individuals` - Create individual
- `PATCH /api/individuals/:id` - Update individual
- `DELETE /api/individuals/:id` - Delete individual

### Corporations
- `GET /api/households/:householdId/corporations` - List corporations in household
- `POST /api/corporations` - Create corporation
- `PATCH /api/corporations/:id` - Update corporation
- `DELETE /api/corporations/:id` - Delete corporation

### Individual Accounts
- `GET /api/individuals/:individualId/accounts` - List individual accounts
- `POST /api/individual-accounts` - Create individual account
- `PATCH /api/individual-accounts/:id` - Update individual account
- `DELETE /api/individual-accounts/:id` - Delete individual account

### Corporate Accounts
- `GET /api/corporations/:corporationId/accounts` - List corporate accounts
- `POST /api/corporate-accounts` - Create corporate account
- `PATCH /api/corporate-accounts/:id` - Update corporate account
- `DELETE /api/corporate-accounts/:id` - Delete corporate account

### Joint Accounts
- `GET /api/households/:householdId/joint-accounts` - List joint accounts
- `POST /api/joint-accounts` - Create joint account
- `PATCH /api/joint-accounts/:id` - Update joint account
- `DELETE /api/joint-accounts/:id` - Delete joint account

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

## Recent Changes (Nov 24, 2025)

### API Enhancements
1. **Full CRUD Operations**: Added PATCH and DELETE routes for individuals, corporations, and all account types
2. **Bulk Household Endpoint**: New `/api/households/full` returns all households with complete nested data in one efficient call
3. **Single Household Endpoint**: `/api/households/:id/full` returns complete nested data for one household
4. **Type-Safe Data Layer**: Created `HouseholdWithDetails`, `IndividualWithAccounts`, `CorporationWithAccounts`, and `JointAccountWithOwners` types
5. **Efficient Batching**: Uses batched SQL queries to minimize database round trips (7 queries total for all households vs N+1 pattern)

### Frontend Integration
1. **Replit Auth Integration**: Complete authentication system with session management
2. **Auth Guards**: Protected routes redirect to landing page when not authenticated
3. **Real Data Connection**: Households page now fetches and displays real data from database
4. **Accurate Calculations**: Properly calculates total portfolio value and weighted average performance
5. **Data Transformation**: Handles enum format conversion (snake_case to hyphenated) and numeric type safety

### Technical Implementation
- **Performance Calculation**: Weighted average using `(balance * performance/100)` across all accounts
- **Type Safety**: End-to-end TypeScript types from database to UI components
- **Error Handling**: Comprehensive error handling with fallback values to prevent NaN

## Next Steps

### Ready to Build
1. Implement household creation/editing UI with forms
2. Build account management interface (add/edit/delete accounts)
3. Add positions/holdings tracking for each account

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
