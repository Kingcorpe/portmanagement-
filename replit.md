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
- **Individual Accounts**: Cash, TFSA, FHSA, RRSP, LIRA, LIFF, RIF
- **Corporate Accounts**: Cash, IPP (Individual Pension Plan)
- **Joint Accounts**: Joint Cash, RESP

### Key Design Decisions
- **Separate Account Tables**: Dedicated tables for individual, corporate, and joint accounts for type safety.
- **Unified Positions Table**: Single table for all holdings, simplifying data retrieval.
- **Calculated Account Balances**: Account balances are computed dynamically from positions (quantity × currentPrice) rather than stored manually. Backend methods calculate these values and return them as `calculatedBalance`. Frontend transforms this to `balance` for display.
- **Account-Specific Target Allocations**: Each account has its own target allocations stored in the `accountTargetAllocations` table. Users can manually enter allocations or copy from a model portfolio. Portfolio comparison uses account-specific allocations with variance analytics (over/under/on-target status).
- **Copy from Model Portfolio**: Users can copy allocations from a model portfolio to any account. This clears existing allocations and replaces them with cloned allocations from the selected model.
- **Robust Validation**: Zod is used for all input validation, especially for monetary fields, which are coerced to numbers, validated, and then stored as strings in Drizzle for decimal precision.
- **Cascading Deletes**: Configured for data integrity across related entities.
- **UUIDs**: All primary keys utilize UUIDs.
- **Delete Functionality**: Users can delete accounts and households with confirmation dialogs using AlertDialog. Delete buttons (trash icon) appear on account rows and household headers. Confirmations prevent accidental deletion.

### API Endpoints Overview
The API provides comprehensive CRUD operations for households, individuals, corporations, and various account types. It includes specialized endpoints for managing joint account ownership, positions, and trades. A bulk endpoint (`/api/households/:id/full`) fetches complete household data with all nested entities. Authentication endpoints handle user login, logout, and session management.

### TradingView Webhook Integration
A dedicated webhook endpoint (`POST /api/webhooks/tradingview`) is available for receiving BUY/SELL alerts from TradingView. The system supports optional webhook secret validation for enhanced security.

### Yahoo Finance Integration
The platform integrates with Yahoo Finance to fetch real-time market prices for positions:
- **Refresh Market Prices**: Users can click "Refresh Prices" on the Holdings & Portfolio Analysis section to update all position prices from Yahoo Finance.
- **Canadian Ticker Support**: Automatically tries multiple exchange suffixes (.TO for TSX, .V for TSX Venture, .CN for CSE) if the symbol doesn't include one.
- **Cash Position Handling**: Cash positions (CASH, CAD, USD, MONEY MARKET) are automatically assigned a price of $1.
- **Price Updated Timestamp**: The `priceUpdatedAt` field tracks when each position's price was last refreshed from Yahoo Finance.
- **API Endpoints**:
  - `POST /api/market-prices/quotes` - Fetch current quotes for a list of symbols
  - `POST /api/accounts/:accountType/:accountId/refresh-prices` - Refresh all position prices for an account

## External Dependencies
- **Replit Auth**: Used for user authentication, supporting OIDC providers like Google, GitHub, X, Apple, and email/password.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database for persistent data storage.
- **TradingView**: External charting and analysis platform, integrated via webhooks for alert reception.
- **Yahoo Finance (yahoo-finance2)**: Used to fetch real-time stock and ETF prices for portfolio valuation.