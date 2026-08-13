# MERIDIAN — PROJECT CONTEXT

## Product

Meridian is a premium trader financial record-keeping and accountability platform.

It is NOT intended to be a Bloomberg/TradingView replacement and should NOT become an institutional trading terminal.

The core idea:

PLAN → TRADE → RECORD → REVIEW → IMPROVE

The product helps traders keep track of:
- Daily income
- Daily expenses
- Active trades
- Completed trades
- Trading rules
- Rule adherence
- Daily/weekly/monthly goals
- Trading performance
- Financial progress
- Trading history
- Accounts

---

## Target Users

The platform should work for different types of traders:
- Forex traders
- Day traders
- Scalpers
- Swing traders
- Position traders
- Beginner traders
- Experienced traders

Do not design the product exclusively around prop-firm traders.

---

## Features

### Dashboard
The dashboard is the trader's daily command center.

It should show:
- Money in
- Money out
- Trading P/L
- Net result
- Active trades
- Today's goals
- Rule adherence
- Daily progress

Do NOT use fake financial data in production.

---

### Trades

Users should be able to record trades.

Trade fields can include:
- Account
- Instrument/pair
- Direction
- Entry
- Exit
- Stop loss
- Take profit
- Position size
- Risk
- Expected outcome
- Actual outcome
- Strategy
- Session
- Date/time
- Notes
- Emotional state
- Rule adherence

Trades should have states such as:
- Active
- Completed
- Cancelled

Active trades should appear in the active-trades area.

Completed trades should appear in trade history and contribute to analytics.

---

### Money

Users should record:

INCOME:
- Trading
- Salary
- Freelance
- Business
- Other

EXPENSES:
- Food
- Transport
- Data
- Subscriptions
- Trading fees
- Education
- Other

The application should calculate:
Income - Expenses = Net

No external API is required for manually entered financial records.

---

### Trading Rules

Users create their own trading rules.

Examples:
- Risk no more than 1%
- Only take A+ setups
- Always define stop loss
- No revenge trading
- Stop after 2 consecutive losses

Before/after trades, users should be able to confirm whether they followed their rules.

The application should track:
- Rules followed
- Rules broken
- Rule adherence percentage
- Most frequently violated rules

This is one of Meridian's core differentiating features.

---

### Pre-Trade Checklist

Before confirming a trade, users should be able to check their trading rules/process.

Example:

- Higher timeframe bias confirmed
- Liquidity identified
- Setup confirmed
- Risk acceptable
- Stop loss defined
- Take profit defined

The user can then confirm the trade.

---

### Post-Trade Review

After a trade closes, the user should be able to record:

- Did I follow my rules?
- What went well?
- What went wrong?
- Emotional state
- Lessons learned

---

### Goals

Users can create:
- Daily goals
- Weekly goals
- Monthly goals
- Trading goals
- Financial goals
- Habit goals

Goal states:
- Completed
- In progress
- Missed

Example:
"Make $100 today"

Once achieved:
✓ COMPLETED

---

### Calendar

This is a TRADER ACTIVITY CALENDAR, NOT an economic calendar.

Each date can show:
- Trades
- P/L
- Income
- Expenses
- Goals
- Rule adherence
- Notes

Clicking a date should reveal that day's activity.

---

### Analytics

Analytics should be calculated from the user's own records.

Possible metrics:
- Total P/L
- Win rate
- Number of trades
- Average win
- Average loss
- Best pair
- Worst pair
- Best strategy
- Worst strategy
- Rule adherence
- Average risk
- Daily performance
- Monthly performance
- Trading consistency

Do not fabricate analytics data.

---

### Accounts

Users should be able to create multiple accounts.

Examples:
- Personal
- Broker
- Demo
- Other

Accounts can have:
- Balance
- Trades
- Income
- Expenses

There should also eventually be an "All Accounts" view.

---

## Features explicitly removed

DO NOT BUILD:

- Prop Firm Tracker
- Prop Firm Challenge tracking
- AI Trader Intelligence
- Economic Calendar
- Bloomberg-style terminal
- TradingView clone
- Fake live market data
- Fake portfolio data
- Institutional margin/exposure system

AI is NOT a core feature.

If an optional free AI integration becomes useful later, it can be considered separately.

---

# Landing Page

Meridian MUST have a premium public landing page.

The landing page is part of V1.

Suggested sections:

1. Navbar
2. Hero
3. Problem
4. Product/features
5. Trading accountability
6. Daily command center
7. Analytics
8. PLAN → TRADE → RECORD → REVIEW → IMPROVE
9. Product preview
10. Pricing
11. FAQ
12. Final CTA
13. Footer

The landing page should sell Meridian as a premium trader accountability and financial record-keeping platform.

Suggested positioning:

"Your trading. Your money. Your discipline. One place."

Potential CTA:
"Start Tracking Free"

---

# Visual Identity

Use the existing Meridian UI as the visual foundation.

DO NOT replace the visual identity with a generic SaaS design.

Primary background:
#0A0A0C

Surface:
#111217

Elevated surface:
#15161C

Border:
#24252C

Primary text:
#F4F1EB

Secondary text:
#a6a5a1

Muted text:
#686872

Primary accent:
#C9A876

Accent light:
#DFC59A

Success:
#34C77B

Danger:
#E15C55

Warning:
#D9A441

Typography:
Inter
JetBrains Mono

The design should feel:
- Premium
- Minimal
- Sophisticated
- Financial
- Modern
- Trustworthy
- Calm
- Professional

Avoid:
- Excessive neon
- Excessive gradients
- Excessive glassmorphism
- Crypto aesthetics
- Casino-like green/red styling
- Generic dashboard templates

---

# Existing UI Reference

The original Meridian UI was a dark fintech/trading dashboard.

We are adapting its visual language rather than copying its old functionality.

Keep:
- Dark graphite background
- Champagne/gold accent
- Inter typography
- JetBrains Mono for financial numbers
- Premium borders
- Sidebar/navigation style
- Subtle animations
- Command-palette concept
- Premium spacing

But redesign the information architecture around the new Meridian product.

---

# Technical Direction

Current project:
React + Vite

Installed/expected packages:
- react-router-dom
- lucide-react
- framer-motion
- tailwindcss
- @tailwindcss/vite

Keep dependencies minimal.

Do not install additional packages unless there is a clear reason.

---

# Engineering Rules

Write production-quality React.

Priorities:
1. Correctness
2. Maintainability
3. Reusability
4. Responsive design
5. Accessibility
6. Clean state management
7. Minimal dependencies

Avoid:
- Huge monolithic components
- Duplicated JSX
- Hardcoded business logic everywhere
- Fake API responses presented as real
- Unnecessary dependencies
- Unused components
- Undefined variables
- Broken imports
- Placeholder functionality presented as complete

Build reusable components.

Use clear naming.

Keep business logic separate from UI where appropriate.

---

# API/Data Rule

If a feature requires external real-time data, DO NOT fabricate it.

Leave a clean integration point and clearly identify the API/service required.

Most V1 features do NOT require external APIs because users manually enter their own data.

Potential future external integrations:
- Live forex market data
- Broker synchronization
- Currency conversion
- Optional AI

Do not implement these unless explicitly requested.

---

# Development Approach

Build incrementally.

Recommended order:

1. Project foundation
2. Design system
3. Routing
4. Landing page
5. Authentication UI
6. Onboarding
7. Application shell
8. Dashboard
9. Trade system
10. Money system
11. Rules system
12. Goals
13. Calendar
14. Analytics
15. Accounts
16. Settings
17. Persistence/backend
18. Testing/error cleanup
19. Responsive/mobile refinement

Before making major architectural changes, inspect the existing project.

Do not rewrite working code unnecessarily.

---

# Product Principle

Meridian should make traders want to open the app every day.

The core loop is:

PLAN
↓
TRADE
↓
RECORD
↓
REVIEW
↓
IMPROVE

The product should feel like a premium personal trading journal + financial tracker + accountability system.