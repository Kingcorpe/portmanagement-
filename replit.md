# Canadian Investment Portfolio Management Platform

## Overview
This project is a secure, web-based investment portfolio management system designed for financial advisors in Canada. It enables the management of household-based client portfolios, encompassing various Canadian individual, corporate, and joint account types. A key feature is its integration with TradingView for alert management, providing a comprehensive tool for financial professionals to oversee client investments, track holdings, and act on trading signals.

## User Preferences
I want to ensure the agent understands my working preferences:
- I prefer simple language and clear explanations.
- I appreciate iterative development with regular updates.
- Please ask before making any major architectural changes or decisions.
- I expect detailed explanations for complex implementations.
- Do not make changes to files or folders related to UI/UX design specifications without explicit approval.

## System Architecture

### Technology Stack
- **Frontend**: React, TypeScript, Vite, Wouter
- **Backend**: Express, TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle
- **Authentication**: Replit Auth (OIDC)
- **Validation**: Zod

### UI/UX Decisions
The platform features a household-based client management interface with collapsible cards to display household details, including individuals, corporations, and joint accounts. It provides creation dialogs for all entities and account types, integrated with form validation. Monetary values are displayed in Canadian dollars (CA$) with clear performance indicators (positive/negative, color-coded).

### Data Model
The system uses a household-based hierarchy to organize client data, distinguishing between individuals, corporations, and joint accounts. A unified `positions` table manages all holdings across different account types, linked via nullable foreign keys. Joint account ownership is handled through a many-to-many relationship.

**Canadian Account Types Supported:**
- **Individual Accounts**: Cash, TFSA, FHSA, RRSP, LIRA, LIF, RIF
- **Corporate Accounts**: Cash, IPP (Individual Pension Plan)
- **Joint Accounts**: Joint Cash, RESP

### Key Design Decisions
- **Separate Account Tables**: Dedicated tables for individual, corporate, and joint accounts for type safety.
- **Unified Positions Table**: Single table for all holdings, simplifying data retrieval.
- **Calculated Account Balances**: Account balances are computed dynamically from positions (quantity × currentPrice) rather than stored manually. Backend methods calculate these values and return them as `calculatedBalance`. Frontend transforms this to `balance` for display.
- **Account-Specific Target Allocations**: Each account has its own target allocations stored in the `accountTargetAllocations` table. Users can manually enter allocations or copy from a model portfolio. Portfolio comparison uses account-specific allocations with variance analytics (over/under/on-target status).
- **Inline Target % Editing**: Users can click on the Target % column in the holdings table to edit target allocations directly. If the ticker doesn't exist in Universal Holdings, it's automatically added with the "auto_added" category. Changes sync to the Target Allocations section. Clearing the field removes the target allocation.
- **Copy from Model Portfolio**: Users can copy allocations from a model portfolio to any account. This clears existing allocations and replaces them with cloned allocations from the selected model.
- **Universal Holdings Categories**: Tickers in Universal Holdings are categorized as: basket_etf, single_etf, double_long_etf, security, auto_added (for tickers automatically added via inline target editing), or misc (for miscellaneous holdings).
- **Robust Validation**: Zod is used for all input validation, especially for monetary fields, which are coerced to numbers, validated, and then stored as strings in Drizzle for decimal precision.
- **Cascading Deletes**: Configured for data integrity across related entities.
- **UUIDs**: All primary keys utilize UUIDs.
- **Delete Functionality**: Users can delete accounts and households with confirmation dialogs using AlertDialog. Delete buttons (trash icon) appear on account rows and household headers. Confirmations prevent accidental deletion.

### API Endpoints Overview
The API provides comprehensive CRUD operations for households, individuals, corporations, and various account types. It includes specialized endpoints for managing joint account ownership, positions, and trades. A bulk endpoint (`/api/households/:id/full`) fetches complete household data with all nested entities. Authentication endpoints handle user login, logout, and session management.

### TradingView Webhook Integration
A dedicated webhook endpoint (`POST /api/webhooks/tradingview`) is available for receiving BUY/SELL alerts from TradingView.

**Alert Display Features:**
- **Collapsible Alert Cards**: Each alert card can be expanded to show affected accounts
- **Affected Accounts View**: Shows all accounts holding the alerted symbol with their allocation status
- **Status Indicators**: Accounts are labeled as Underweight, Overweight, On Target, or No Target
- **Smart Sorting**: Accounts sorted by relevance (underweight first for BUY signals, overweight first for SELL)
- **Clickable Links**: Each account links directly to its detail page for quick navigation

**Webhook Features:**
- **Secret Validation**: Optional webhook secret via `TRADINGVIEW_WEBHOOK_SECRET` environment variable
- **Automatic Report Generation**: When a BUY signal is received, the system automatically:
  1. Finds all accounts holding positions in the alerted ticker
  2. Identifies which accounts have the position below target allocation (underweight)
  3. Generates PDF portfolio rebalancing reports for those accounts
  4. Emails the reports to the configured address

**Webhook Payload Format:**
```json
{
  "symbol": "XIU.TO",
  "signal": "BUY",
  "price": 35.50,
  "message": "Optional message",
  "email": "optional@email.com",
  "secret": "optional-secret"
}
```

**Email Configuration:**
- Reports are sent to the `email` in the webhook payload, or falls back to `TRADINGVIEW_REPORT_EMAIL` environment variable
- Requires Gmail integration to be configured

**Response Format:**
```json
{
  "success": true,
  "alertId": "uuid",
  "reportsSent": 2,
  "accounts": ["TFSA - Retirement (Smith Household)", "RRSP - Growth (Smith Household)"]
}
```

### Yahoo Finance Integration
The platform integrates with Yahoo Finance to fetch real-time market prices and dividend information for positions and Universal Holdings:

**Account Position Prices:**
- **Refresh Market Prices**: Users can click "Refresh Prices" on the Holdings & Portfolio Analysis section to update all position prices from Yahoo Finance.
- **Price Updated Timestamp**: The `priceUpdatedAt` field tracks when each position's price was last refreshed.

**Universal Holdings Prices & Dividends:**
- **Automatic Pricing**: Price field is optional when adding holdings; prices are fetched automatically from Yahoo Finance.
- **Refresh All Prices**: Users can click "Refresh Prices" on the Universal Holdings tab to update all holding prices at once.
- **Refresh Dividends**: Users can click "Refresh Dividends" to fetch dividend yield, rate, and payout frequency from Yahoo Finance.
- **Dividend Data Display**: Shows dividend yield (%), payout frequency (monthly/quarterly/etc.), and ex-dividend date.
- **Price Display**: Shows current price with the date it was last updated.
- **Clickable Ticker**: Clicking a ticker in the Universal Holdings table opens the edit dialog for that holding.

**Common Features:**
- **Canadian Ticker Support**: Automatically tries multiple exchange suffixes (.TO for TSX, .V for TSX Venture, .CN for CSE) if the symbol doesn't include one.
- **Cash Position Handling**: Cash positions (CASH, CAD, USD, MONEY MARKET) are automatically assigned a price of $1.
- **Duplicate Ticker Handling**: Price lookups are cached to avoid redundant API calls for duplicate tickers.

**API Endpoints**:
  - `POST /api/market-prices/quotes` - Fetch current quotes for a list of symbols
  - `POST /api/accounts/:accountType/:accountId/refresh-prices` - Refresh all position prices for an account
  - `POST /api/universal-holdings/refresh-prices` - Refresh all Universal Holdings prices from Yahoo Finance
  - `POST /api/universal-holdings/refresh-dividends` - Refresh dividend data (yield, rate, ex-date, payout frequency) for all Universal Holdings

### Individual Date of Birth & Spouse DOB
- **Date of Birth Field**: Individuals can have an optional date of birth (DOB) stored.
- **Spouse Date of Birth**: Optional field for a younger spouse's DOB, used for RIF minimum withdrawal calculations.
- **RIF Conversion Date**: For RIF accounts, the conversion date is calculated based on age 71 in Canada.
  - If a spouse DOB is provided and the spouse is younger, their age is used instead.
  - Display shows "(spouse)" indicator when using spouse's DOB for the calculation.
- Both DOB fields are stored on the individual, not the account, since RIF calculations are person-specific.

### Task Management
Each account has a Tasks section for tracking action items. Tasks have statuses (Pending, In Progress) and priorities (Low, Medium, High, Urgent).

**Task Completion Behavior:**
- When a task is marked as complete (by clicking the circle/checkbox), it is removed from the active task list
- The completion is logged to the Change History with full task details (title, description, priority, due date)
- Completed tasks are no longer visible in the Tasks section but can be reviewed in Change History for historical reference
- This keeps the active task list clean while preserving a complete audit trail

**Task Status Filter:**
- All Tasks: Shows pending and in-progress tasks
- Pending: Shows only pending tasks
- In Progress: Shows only in-progress tasks

### Change History / Audit Trail
Each account (individual, corporate, or joint) has a collapsible Change History section at the bottom of its detail page that tracks all modifications.

**Tracked Actions:**
- **Account Setup**: When an account is created, the initial settings (account type, nickname, risk percentages) are logged
- **Account Updates**: Changes to account fields (nickname, risk allocations, notes, protection settings)
- **Position Actions**: Adding, updating, or deleting positions, including bulk uploads
- **Target Allocation Changes**: Adding, updating, or removing target allocations
- **Task Management**: Creating, completing (with full task details archived), or deleting tasks
- **Price Refresh**: When market prices are manually refreshed
- **Model Portfolio Copy**: When allocations are copied from a model portfolio

**Display Features:**
- Color-coded badges for each action type (emerald for account setup, green for additions, red for deletions)
- Old/new value comparisons for field updates
- Timestamps for all entries
- Collapsible card that defaults to closed to reduce visual clutter

## External Dependencies
- **Replit Auth**: Used for user authentication, supporting OIDC providers like Google, GitHub, X, Apple, and email/password.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database for persistent data storage.
- **TradingView**: External charting and analysis platform, integrated via webhooks for alert reception.
- **Yahoo Finance (yahoo-finance2)**: Used to fetch real-time stock and ETF prices for portfolio valuation.

## SaaS Conversion Task List (Future Development)
This is the roadmap for converting the platform to a multi-tenant SaaS product.

### Phase 1: Data Isolation (3-4 days)
1. Add userId to households table and update schema
2. Create user_settings table for per-user configuration (email, webhook secret, plan type)
3. Update storage layer - Filter all queries by userId for data isolation
4. Update API routes to use authenticated user's ID for all operations

### Phase 2: User Experience (3-4 days)
5. Create user settings page - Email configuration, webhook secret display/regenerate
6. Update webhook endpoint to route alerts to correct user based on secret
7. Create onboarding flow for new users (welcome screen, setup wizard)
8. Update navigation/UI for multi-tenant experience (user dashboard, account menu)

### Phase 3: Payments (3-5 days)
9. Integrate Stripe for subscription payments (checkout, webhooks, portal)
10. Implement plan limits (free tier: 1 household, paid: unlimited)
11. Add subscription status checks to protected features

### Phase 4: Polish (2-3 days)
12. Create landing/marketing page for new visitors
13. Add TradingView setup instructions page with user's unique webhook URL
14. Testing and polish - Verify data isolation, payment flow, alert routing

**Estimated Total: 2-3 weeks**