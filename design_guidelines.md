# Investment Portfolio Management Platform - Design Guidelines

## Design Approach: Modern Financial Dashboard

**Selected Approach:** Design System (Professional SaaS Dashboard)
**Primary References:** Stripe Dashboard (clean data hierarchy), Linear (typography excellence), Robinhood (financial data clarity)
**Core Principle:** Data clarity and efficient workflows for financial decision-making

---

## Typography System

**Primary Font:** Inter (via Google Fonts CDN)
**Secondary Font:** JetBrains Mono (for numbers, financial data, codes)

**Hierarchy:**
- Page Titles: text-3xl font-semibold (Inter)
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Captions/Labels: text-sm text-gray-600
- Financial Data: JetBrains Mono, tabular-nums for alignment
- Metrics/Numbers: text-2xl to text-4xl font-bold (JetBrains Mono)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 or p-6
- Section gaps: gap-4 or gap-6
- Container margins: mb-6 or mb-8
- Card spacing: space-y-4

**Grid Structure:**
- Sidebar: fixed w-64 (desktop), collapsible on mobile
- Main content: flex-1 with max-w-7xl
- Dashboard cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

---

## Component Library

### Navigation
- **Fixed Sidebar** (left): Dark background, vertical navigation with icons (Heroicons)
- Logo at top, main nav items, user profile at bottom
- Active state: subtle left border accent
- **Top Bar:** Breadcrumbs, search, notifications, user menu

### Dashboard Cards
- White background with subtle border (border border-gray-200)
- Rounded corners (rounded-lg)
- Padding: p-6
- Shadow: shadow-sm on hover
- Header with icon, title, and optional action button

### Data Tables
- Striped rows for readability (alternate row shading)
- Fixed header on scroll
- Column sorting indicators
- Pagination at bottom
- Highlight positive values (green) and negative (red)
- Monospace font for numerical columns

### Charts & Metrics
- **Metric Cards:** Large number display with trend indicator (↑↓ arrows), percentage change, sparkline
- **Performance Charts:** Line charts for portfolio value over time
- **Holdings Pie Chart:** Asset allocation visualization
- Use recharts or Chart.js via CDN

### Forms & Inputs
- Labels: text-sm font-medium mb-2
- Input fields: border-gray-300, focus:border-blue-500, focus:ring-1
- Grouped inputs with consistent spacing (space-y-4)
- Primary button: Medium size, rounded, prominent placement

### Alert Management
- **Alert Cards:** Timestamp, trading pair, signal type, action buttons
- Status badges: rounded-full px-3 py-1 text-xs
- Action buttons: "Execute", "Dismiss", "View Details"

### Client Management
- **Client Cards:** Avatar, name, portfolio value, performance metric
- List view with sortable columns
- Quick actions menu (three-dot icon)

---

## Key Screens Layout

### Main Dashboard
- Top metrics row: 4 cards (Total AUM, Active Clients, Today's P&L, Pending Alerts)
- Portfolio performance chart (60% width)
- Recent alerts sidebar (40% width)
- Recent trades table

### Client Portfolio View
- Client header: Name, contact, total value
- Holdings table with live positions
- Performance chart
- Trade history

### TradingView Alerts Feed
- Real-time alert stream
- Filters: Symbol, signal type, date range
- Bulk action toolbar

---

## Icons & Assets

**Icon Library:** Heroicons (via CDN)
**Key Icons Needed:**
- Navigation: HomeIcon, UserGroupIcon, BellIcon, ChartBarIcon, CogIcon
- Actions: PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon
- Financial: TrendingUpIcon, TrendingDownIcon, CurrencyDollarIcon

**Images:**
No hero images needed. This is a data-focused dashboard application. Use icon-based visual hierarchy instead.

---

## Authentication & Security Screens

- **Login Page:** Centered card (max-w-md), logo, email/password inputs, "Secure Portal" tagline
- Two-factor authentication prompt when applicable
- Professional, minimal design with lock icon

---

## Animations

Minimal, performance-focused:
- Hover state transitions: 150ms ease
- Chart animations: 500ms on load only
- Loading spinners for data fetching
- No scroll animations or complex interactions

---

## Accessibility

- High contrast for financial data (black text on white)
- Keyboard navigation for all tables and forms
- ARIA labels for icon-only buttons
- Focus visible states on all interactive elements
- Skip to content link