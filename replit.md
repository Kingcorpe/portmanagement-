# PracticeOS - Canadian Advisory Practice Management Platform

## Overview
PracticeOS is a comprehensive practice management system designed for Canadian financial advisors. Its primary purpose is to streamline practice operations by providing a unified platform for managing household-based client portfolios across various Canadian account types, integrating with TradingView for alert management, tracking insurance and investment revenue, and offering KPI dashboards for business metrics. The platform aims to centralize client investment oversight, holding tracking, task management, and revenue goal monitoring to enhance efficiency and decision-making for advisory practices.

## User Preferences
- I prefer simple language and clear explanations.
- I appreciate iterative development with regular updates.
- Please ask before making any major architectural changes or decisions.
- I expect detailed explanations for complex implementations.
- Do not make changes to files or folders related to UI/UX design specifications without explicit approval.

## System Architecture

### UI/UX Decisions
The platform features a household-based client management interface with collapsible cards, creation dialogs for all entities and account types, and robust form validation. Monetary values are consistently displayed in Canadian dollars (CA$) and performance indicators are color-coded for quick visual assessment.

### Technical Implementations
- **Technology Stack**: React, TypeScript, Vite, Wouter (Frontend); Express, TypeScript (Backend); PostgreSQL (Neon) (Database); Drizzle (ORM); Replit Auth (OIDC) (Authentication); Zod (Validation).
- **Data Model**: Household-based hierarchy supporting diverse Canadian account types (Individual, Corporate, Joint). Account balances are dynamically calculated from positions.
- **Target Allocations**: Account-specific target allocations with variance analytics (over/under/on-target) and inline editing capabilities. Tickers automatically added to Universal Holdings if new.
- **Validation**: Zod is used for all input validation, especially for precise monetary values stored as strings.
- **Data Integrity**: Cascading deletes and UUIDs for primary keys ensure data consistency.
- **Watchlist Portfolio**: Optional per-account watchlist for experimental positions, independent of real portfolio metrics.
- **API Endpoints**: Comprehensive CRUD operations for all entities, including a bulk endpoint and authentication.
- **Search**: A dedicated holdings search page with filtering by household category and value ranges.
- **Demo Mode**: A toggleable feature for prospect demonstrations using sample data, protecting real client information.

### Feature Specifications
- **TradingView Webhook Integration**: Receives BUY/SELL alerts, displays them with status indicators, detects target allocation opportunities, and automates PDF rebalancing report generation for underweight accounts.
- **Yahoo Finance Integration**: Fetches real-time market prices and dividend information, handling Canadian ticker suffixes and cash positions.
- **Key Metrics Page**: A dashboard showing total AUM, account breakdown, task overview, trading alerts, AUM distribution, and quick stats.
- **Task Management**: Account-specific tasks with comprehensive statuses (Pending, In Progress, Blocked, On Hold, Completed, Cancelled) and priorities (Low, Medium, High, Urgent), sorted by status, priority, and due date.
- **Monthly Dividend Income Display**: Shows estimated monthly dividend income per account and per position, including yield and payout frequency.
- **Change History / Audit Trail**: A collapsible audit trail per account tracking all modifications with color-coded entries and old/new value comparisons.
- **Insurance Revenue Tracking**: Dedicated page for tracking insurance commissions with specialized calculations for various policy types, status workflows (Planned → Pending → Received), and goal tracking.
- **Investment Revenue Tracking**: Dedicated page for tracking dividends and new AUM, with status workflows and separate goal tracking for dividends and AUM.
- **Reference Links**: A page to manage quick-access links with icon support and CRUD operations.
- **KPI Dashboard**: Tracks monthly objectives with daily task management and PDF export functionality.
- **Admin Section**: Provides system management tools including Universal Holdings management (CRUD, bulk price/dividend refresh, categorization), webhook logs, and system settings (webhook URL, email config, price refresh schedule, demo mode toggle).

## External Dependencies
- **Replit Auth**: Utilized for user authentication, supporting OIDC providers and email/password.
- **Neon (PostgreSQL)**: The cloud-hosted PostgreSQL database solution.
- **TradingView**: Integrated via webhooks for receiving and processing trading alerts.
- **Yahoo Finance (yahoo-finance2)**: Used to fetch real-time stock/ETF prices and dividend data.