# Canadian Investment Portfolio Management Platform

## Overview
This project is a secure, web-based investment portfolio management system for Canadian financial advisors. It manages household-based client portfolios across various Canadian account types (individual, corporate, joint) and integrates with TradingView for alert management. Its purpose is to provide a comprehensive tool for overseeing client investments, tracking holdings, and acting on trading signals, aiming to streamline portfolio management for financial professionals.

## User Preferences
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
The platform uses a household-based client management interface with collapsible cards, creation dialogs for all entities and account types, and form validation. Monetary values are displayed in Canadian dollars (CA$) with color-coded performance indicators.

### Data Model and Key Design Decisions
The system uses a household-based hierarchy supporting various Canadian account types:
- **Individual Accounts**: Cash, TFSA, FHSA, RRSP, LIRA, LIF, RIF
- **Corporate Accounts**: Cash, IPP
- **Joint Accounts**: Joint Cash, RESP
Data is structured with separate tables for each account type but a unified `positions` table with nullable foreign keys. Joint accounts use a many-to-many relationship.
- **Calculated Account Balances**: Balances are dynamically computed from positions (quantity × currentPrice).
- **Account-Specific Target Allocations**: Each account has distinct target allocations, which can be manually entered or copied from model portfolios. Variance analytics (over/under/on-target) are provided.
- **Inline Target % Editing**: Allows direct editing of target allocations in the holdings table, automatically adding new tickers to Universal Holdings if needed.
- **Universal Holdings Categories**: Tickers are categorized (e.g., basket_etf, security, auto_added).
- **Robust Validation**: Zod is used for all input, especially monetary fields which are stored as strings for precision.
- **Cascading Deletes**: Configured for data integrity.
- **UUIDs**: All primary keys.
- **Delete Functionality**: Accounts and households can be deleted with confirmation dialogs.
- **Individual and Spouse Date of Birth**: Optional DOB fields for individuals and spouses, used for RIF minimum withdrawal calculations.
- **Watchlist Portfolio**: Each account can have an optional watchlist for experimental positions, toggled with "Real" positions. It provides independent analysis without affecting real portfolio metrics.

### API Endpoints
Comprehensive CRUD operations for all entities (households, individuals, corporations, accounts, positions, trades). Includes a bulk endpoint (`/api/households/:id/full`) and authentication endpoints.

### TradingView Webhook Integration
A webhook (`POST /api/webhooks/tradingview`) receives BUY/SELL alerts from TradingView.
- **Alert Display**: Collapsible cards show affected accounts with status indicators (Underweight, Overweight, On Target, No Target) and smart sorting.
- **Target Allocation Detection**: Alerts now trigger for accounts that have target allocations for a ticker, even if they don't currently hold any shares. For BUY signals, accounts with planned targets but no position are flagged as "Not Currently Held" opportunities.
- **Automated Reports**: BUY signals automatically trigger PDF rebalancing report generation for underweight accounts (including zero-position accounts with targets), which are then emailed.
- **Secret Validation**: Optional webhook secret for security.

### Yahoo Finance Integration
Integrates with Yahoo Finance for real-time market prices and dividend information.
- **Price Refresh**: Users can manually refresh position prices or all Universal Holdings prices.
- **Dividend Data**: Fetches dividend yield, rate, and payout frequency.
- **Canadian Ticker Support**: Automatically handles common Canadian exchange suffixes (.TO, .V, .CN).
- **Cash Position Handling**: Cash positions are assigned a price of $1.
- **Duplicate Ticker Handling**: Caches price lookups to reduce API calls.

### Key Metrics Page
A centralized dashboard displaying aggregate portfolio statistics:
- **Total AUM**: Sum of all account balances with weighted average performance
- **Account Breakdown**: Distribution by account type (Individual, Corporate, Joint) with progress bars
- **Tasks Overview**: Pending, in-progress, urgent, and high-priority task counts
- **Trading Alerts**: Pending/executed alerts with BUY/SELL signal breakdown
- **AUM Distribution**: Visual breakdown of assets by account category
- **Quick Stats**: Average account size, accounts per household, and average household value

### Task Management
Each account has a Tasks section with statuses (Pending, In Progress) and priorities (Low, Medium, High, Urgent). Completed tasks are logged to Change History and removed from the active list.

### Change History / Audit Trail
A collapsible section per account tracks all modifications, including:
- Account setup and updates
- Position actions (add, update, delete)
- Target allocation changes
- Task creation, completion, and deletion
- Price refreshes and model portfolio copies
Actions are color-coded with old/new value comparisons and timestamps.

### Holdings Search
A dedicated page that allows searching for tickers across all accounts in the system with powerful filtering and direct navigation to accounts.
- **Search Endpoint**: `/api/holdings/search?ticker=BANK.TO&category=anchor&minValue=1000&maxValue=50000`
- **Core Features**: 
  - Search across all households, individuals, corporations, and joint accounts simultaneously
  - Automatic ticker normalization (.TO, .V, .CN, .NE, .TSX, .NYSE, .NASDAQ suffixes)
  - Clickable results rows that navigate directly to the full account view
- **Filters** (optional, combine as needed):
  - **Household Category**: Filter by Evergreen, Anchor, Pulse, Emerging Pulse, or Emerging Anchor
  - **Min/Max Value**: Filter holdings by their dollar value range
- **Results Display**: 
  - Household name and category, owner name/type, account type
  - Quantity held, current price, and total value
  - Summary cards showing total holdings count, total quantity, and aggregate value
  - **Clickable rows**: Click any result to drill into the account with all holdings and details
- **Navigation**: Click "Holdings Search" in the sidebar to access

## External Dependencies
- **Replit Auth**: User authentication (OIDC providers, email/password).
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database.
- **TradingView**: External charting and analysis platform, integrated via webhooks.
- **Yahoo Finance (yahoo-finance2)**: Fetches real-time stock/ETF prices and dividend data.
