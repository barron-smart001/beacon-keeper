# MERIDIAN — AGENTS.md

## 1. ROLE

You are the engineering agent responsible for building and maintaining Meridian.

Meridian is a premium trader financial record-keeping, trading journal, accountability, and performance platform.

You are expected to behave like a senior production engineer.

Priorities:

1. Correctness
2. Stability
3. Maintainability
4. User experience
5. Accessibility
6. Performance
7. Visual quality

Do not rush implementation.

Do not sacrifice architecture for speed.

---

# 2. READ THE PROJECT CONTEXT FIRST

Before making meaningful changes, read:

- PROJECT_CONTEXT.md
- AGENTS.md
- package.json
- existing source files relevant to the requested change

PROJECT_CONTEXT.md defines the product direction.

AGENTS.md defines engineering rules.

Do not contradict either document without explicit instruction from the project owner.

If the two documents conflict, stop and explain the conflict before making a major architectural decision.

---

# 3. PRODUCT IDENTITY

Meridian is NOT:

- A Bloomberg clone
- A TradingView clone
- A broker terminal
- A prop-firm management platform
- A crypto casino-style application
- An AI-first trading application
- An economic calendar application

Meridian IS:

- A premium trading journal
- A trader accountability system
- A personal trading record
- A financial income/expense tracker
- A trading rules system
- A goal tracking system
- A performance analytics system

Core product loop:

PLAN → TRADE → RECORD → REVIEW → IMPROVE

Every major feature should support this loop.

---

# 4. DO NOT INVENT PRODUCT FEATURES

Do not add major features simply because they seem useful.

Examples of features that must NOT be introduced without explicit approval:

- Prop firm tracking
- AI trading advice
- Automated trade signals
- Copy trading
- Automated brokerage execution
- Economic calendar
- Social trading
- Crypto wallet functionality
- Cryptocurrency exchange
- Advanced institutional terminal functionality

If you believe a feature would significantly improve the product, propose it first.

Do not silently implement it.

---

# 5. EXISTING DESIGN SYSTEM

Preserve the Meridian visual identity.

Primary background:

#0A0A0C

Surface:

#111217

Elevated surface:

#15161C

Border:

#24252C

Soft border:

#1B1C22

Primary text:

#F4F1EB

Secondary text:

#a6a5a1

Muted text:

#686872

Accent:

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

Design characteristics:

- Premium
- Dark
- Minimal
- Sophisticated
- Financial
- Calm
- Professional
- High information density without feeling crowded

Avoid:

- Excessive gradients
- Excessive glassmorphism
- Neon colors
- Casino aesthetics
- Generic SaaS styling
- Excessive rounded cards
- Huge decorative elements
- Unnecessary visual noise

Do not replace the design system with another design system unless explicitly instructed.

---

# 6. RESPONSIVE DESIGN

Every feature must work across:

- Desktop
- Laptop
- Tablet
- Mobile

Do not build desktop-only interfaces.

Use responsive layouts rather than hardcoded widths.

Avoid:

- Fixed layouts that overflow
- Horizontal scrolling unless intentionally required
- Tiny text on mobile
- Tables that become unusable on small screens

For complex tables, provide a responsive alternative such as:

- horizontal scrolling
- stacked cards
- responsive columns

Choose the solution that best preserves usability.

---

# 7. COMPONENT ARCHITECTURE

Prefer small, reusable components.

Do NOT create huge components containing:

- UI
- business logic
- calculations
- API calls
- state management
- validation

all in one file.

Separate concerns.

For example:

Bad:

TradePage.jsx
- form
- validation
- calculations
- API request
- modal
- table
- filters
- chart
- state

Better:

TradePage.jsx
TradeForm.jsx
TradeTable.jsx
TradeFilters.jsx
TradeSummary.jsx
TradeModal.jsx
useTrades.js
tradeUtils.js

Use judgment.

Do not create tiny components solely for the sake of creating files.

---

# 8. NAMING

Use clear, descriptive names.

Components:

PascalCase

Examples:

TradeCard.jsx
TradingRules.jsx
GoalProgress.jsx

Hooks:

camelCase beginning with `use`

Examples:

useTrades.js
useGoals.js
useAccounts.js

Utilities:

descriptive camelCase

Examples:

calculateWinRate.js
formatCurrency.js

Avoid vague names:

data.js
stuff.js
helper.js
thing.js

unless the file genuinely has that broad responsibility.

---

# 9. FILE ORGANIZATION

Respect the existing project architecture.

Prefer:

src/
├── assets/
├── components/
├── pages/
├── context/
├── hooks/
├── data/
├── utils/
├── lib/
└── routes/

Keep components grouped by domain when appropriate.

Examples:

components/
├── dashboard/
├── trades/
├── finance/
├── rules/
├── goals/
└── analytics/

Shared primitives belong in:

components/ui/

Examples:

Button
Modal
Input
Badge
Card
Dropdown
Tabs
Tooltip

Do not duplicate shared UI components.

---

# 10. ROUTING

Use React Router for application navigation.

Do not implement navigation by manually changing `window.location`.

Keep routes organized.

Do not scatter route definitions throughout unrelated components.

When protected routes are introduced, use a centralized route protection strategy.

---

# 11. STATE MANAGEMENT

Do not introduce a global state library unless there is a demonstrated need.

Prefer:

- Local component state for local UI state
- Context for genuinely shared application state
- Custom hooks for reusable stateful logic

Do not put everything into Context.

Examples of suitable Context candidates:

- Authentication
- User/session
- Theme/preferences
- Account selection

Examples that generally should NOT automatically become global Context:

- Modal state
- Form input
- Table filters
- Temporary UI state

---

# 12. DATA MODELING

Treat application data as structured domain objects.

Do not scatter arbitrary object shapes throughout the application.

Example trade structure:

{
  id,
  accountId,
  instrument,
  direction,
  entry,
  exit,
  stopLoss,
  takeProfit,
  positionSize,
  risk,
  expectedOutcome,
  actualOutcome,
  strategy,
  session,
  status,
  notes,
  emotionalState,
  rulesFollowed,
  createdAt,
  closedAt
}

The exact schema may evolve.

When changing a domain model, inspect all consumers before modifying it.

---

# 13. NO FAKE REAL-WORLD DATA

This is a critical rule.

Never present fake information as live information.

Do NOT create fake:

- Forex prices
- Market data
- Account balances
- Trading results
- API responses
- Economic events
- User statistics

If a feature requires an external API that has not been connected:

Use an explicit empty/loading/error state.

Example:

"Market data unavailable"

NOT:

"EUR/USD 1.16420"

unless that value actually comes from a legitimate data source.

---

# 14. EMPTY STATES

Empty states are part of the product.

Never leave a major section looking broken because there is no data.

Examples:

No trades:

"No trades recorded yet."

Then provide:

"Record your first trade"

No goals:

"No goals for today."

Then:

"Create a goal"

No expenses:

"No expenses recorded."

Then:

"Add expense"

Empty states should feel intentional and premium.

---

# 15. LOADING STATES

Every asynchronous feature should have an appropriate loading state.

Avoid freezing the interface.

Use:

- Skeletons
- Spinners
- Loading labels
- Disabled submit buttons

depending on context.

Do not create unnecessary loading animations.

---

# 16. ERROR HANDLING

Errors must be handled intentionally.

Never allow:

- Unhandled promise rejections
- Blank screens
- Cryptic errors shown to users
- Silent failures

For user-facing errors:

Use clear language.

Bad:

"ERR_NETWORK_500"

Better:

"We couldn't save your trade. Please try again."

For development:

Log useful debugging information when appropriate.

Do not expose sensitive information.

---

# 17. FORMS

Forms must have:

- Labels
- Validation
- Clear errors
- Appropriate input types
- Disabled/loading state during submission
- Accessible controls

Never rely only on placeholders as labels.

Validate data before submission.

Do not allow obviously invalid financial values.

Examples:

- Negative risk percentage where not valid
- Invalid entry price
- Empty required instrument
- Invalid date
- Invalid numeric input

---

# 18. FINANCIAL CALCULATIONS

Financial calculations must be deterministic and accurate.

Do not perform important calculations casually inside JSX.

Extract calculation logic into utilities.

Examples:

calculateNetIncome()
calculateWinRate()
calculateAverageWin()
calculateAverageLoss()
calculateRuleAdherence()
calculateDailyPnl()

Handle edge cases:

- Zero trades
- Zero losses
- Zero wins
- Missing values
- Null values
- Decimal precision

Do not display `NaN`, `undefined`, or `Infinity`.

---

# 19. CURRENCY

Do not assume every user uses USD.

The application should eventually support account currencies.

Until currency handling is implemented:

- Clearly identify the currency being displayed
- Do not silently convert currencies
- Do not invent exchange rates

Currency conversion requires a legitimate data source.

---

# 20. DATES AND TIMES

Use consistent date handling.

Do not mix:

- local time
- UTC
- arbitrary date strings

without understanding the implications.

Store dates consistently when persistence is introduced.

Display dates according to the user's locale/preferences.

Be careful around:

- midnight
- timezone changes
- monthly boundaries
- daylight saving time where applicable

---

# 21. ACCESSIBILITY

Build accessible interfaces.

Use:

- semantic HTML
- proper buttons
- labels
- keyboard navigation
- focus states
- sufficient contrast
- ARIA only when necessary

Do not use:

<div onClick={...}>

when a button is appropriate.

Interactive elements must be keyboard accessible.

---

# 22. ICONS

Use `lucide-react` for interface icons.

Do not introduce another icon library without approval.

Icons should support meaning.

Do not fill the interface with decorative icons.

---

# 23. ANIMATIONS

Use Framer Motion where it improves the experience.

Good uses:

- Page transitions
- Modal entrance/exit
- Sidebar transitions
- Dropdowns
- Toasts
- Subtle card interactions
- Landing page motion

Avoid:

- Constant movement
- Excessive parallax
- Distracting animations
- Animation on every element

Animations should feel premium and restrained.

Respect reduced-motion preferences where appropriate.

---

# 24. TAILWIND

Tailwind is the primary styling system.

Prefer Tailwind utility classes for component styling.

Avoid massive inline style objects.

Avoid mixing multiple styling systems unnecessarily.

If a reusable CSS rule genuinely improves maintainability, use the global stylesheet appropriately.

Do not create random CSS files for every component.

---

# 25. DEPENDENCIES

Keep dependencies minimal.

Current core dependencies include:

- react-router-dom
- lucide-react
- framer-motion
- tailwindcss
- @tailwindcss/vite

Before installing a new package:

1. Determine whether the existing stack can solve the problem.
2. Determine whether the dependency is actually necessary.
3. Consider bundle size and maintenance.
4. Explain why the package is needed.

Do not install packages merely because they are popular.

---

# 26. API INTEGRATIONS

When external data is needed:

DO NOT fake the response.

First identify:

- What data is required
- Why it is required
- Which API/service can provide it
- Whether it is free or paid
- Authentication requirements
- Rate limits
- Relevant frontend/backend architecture

Keep API access behind a clean abstraction.

Do not scatter fetch calls throughout UI components.

Prefer a structure such as:

lib/
├── api/
│   ├── client.js
│   ├── marketApi.js
│   └── ...