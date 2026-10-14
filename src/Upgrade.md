# MERIDIAN

### Professional Forex Trading Journal & Analytics

**Your trading. Your money. Your discipline.**

Meridian is a premium forex trading journal and analytics platform designed to help traders record, review, and understand their trading performance. Its goal is to eliminate manual trade entry for supported broker accounts through secure, automatic trade synchronization.

This repository contains the existing Meridian application. All development must extend the current project rather than replace it.

---

## 1. Project Mission

Upgrade Meridian from a primarily manual trading journal into a broker-connected trading journal.

The main integration target is:

* **Broker:** Exness
* **Trading platform:** MetaTrader 5 (MT5)
* **Integration provider:** MetaApi, subject to verification of compatibility and account access
* **Synchronization:** Automatic background synchronization plus a manual Sync Now button
* **Database and authentication:** Existing Supabase project
* **Frontend:** Existing React and Vite application

The objective is for supported trading activity to appear automatically in Meridian's Trades page and update the Dashboard, P&L, Calendar, and Analytics.

Do not implement a fake integration or claim that an account is connected unless the provider confirms a real connection.

## 2. Existing Technology Stack

Preserve the existing stack and conventions found in the repository.

Expected technologies include:

* React
* Vite
* TypeScript and/or JavaScript, according to the existing codebase
* Supabase Auth
* Supabase PostgreSQL
* Supabase Row Level Security (RLS)
* Supabase Edge Functions
* Existing routing and UI components
* Existing charting, animation, and icon libraries
* Existing Paystack subscription and payment integration

Before changing dependencies, inspect `package.json` and reuse existing packages wherever practical.

Do not migrate the project to Next.js or another framework as part of this task.

## 3. Existing Application Features

Meridian already includes the following product areas:

* Overview / Dashboard
* Trades
* Money
* Rules
* Goals
* Calendar
* Accounts
* Settings
* Authentication
* Subscription and billing
* Paystack payment integration

Inspect the actual routes, database tables, components, and business logic before making changes. These names describe the intended product areas and are not permission to assume particular file paths or database columns.

Preserve all working features.

## 4. Subscription and Access Rules

Meridian uses a paid-only model for core trade-management functionality.

The intended access model is:

### Unsubscribed users

* May access the dashboard in accordance with the existing access model.
* May view permitted journal information.
* May access Settings.
* Must not bypass subscription restrictions to create or modify paid features.
* Must not initiate protected broker synchronization if their subscription does not permit it.

### Subscribed users

* May use the trade-management features permitted by their subscription.
* May connect eligible broker accounts.
* May synchronize supported trading activity.
* May use Sync Now when authorized.
* May access the corresponding trade history, analytics, and journal features.

Important security rule: enforce subscription status on the backend. Hiding buttons or disabling components in React is not sufficient.

Read the current subscription implementation before changing it. Preserve existing Paystack verification and subscription-expiry logic.

Do not introduce new subscription prices, products, or billing rules without approval.

## 5. Broker Integration Requirements

### 5.1 Verify the provider first

Before implementing provider-specific functionality, consult the current official documentation:

* MetaApi client documentation: https://metaapi.cloud/docs/client/
* MetaApi account provisioning: https://metaapi.cloud/docs/provisioning/api/account/createAccount/
* MetaApi historical deals: https://metaapi.cloud/docs/client/restApi/api/retrieveHistoricalData/readDealsByTimeRange/
* Exness API documentation: https://get.exness.help/hc/en-us/articles/27866287512476-Exness-API

Confirm:

1. Whether the target Exness MT5 server and account type are supported.
2. Whether historical deals can be retrieved.
3. Whether read-only investor-password authentication is supported for the selected flow.
4. Whether the provider supports the account connection, synchronization, and historical data required by Meridian.
5. The provider's current pricing, limits, and deployment requirements.

Do not assume that Exness's official API is available to all accounts.

If any essential capability cannot be verified, explain the blocker and propose alternatives before implementing a misleading connection flow.

### 5.2 Connection management

Build a secure broker connection interface that supports:

* Connecting an eligible Exness MT5 account.
* Displaying the connection status.
* Displaying the associated Meridian account.
* Showing the last successful synchronization.
* Showing sync errors in a safe, understandable form.
* Disconnecting an account.
* Recovering from expired credentials or provider outages.

Use a provider-supported secure credential flow wherever available.

Never request a main trading password unnecessarily. Prefer read-only access, and never enable order placement or withdrawals.

### 5.3 Automatic synchronization

Implement a backend synchronization service that:

* Imports available historical deals.
* Fetches new deals periodically.
* Detects updated or corrected records.
* Handles pagination and overlapping time windows.
* Uses safe checkpoints.
* Retries temporary failures with bounded backoff.
* Prevents duplicate jobs for the same connection.
* Records the result of every sync attempt.
* Recovers safely after a failed or interrupted run.

A five-minute background schedule is the initial target if provider limits and the chosen architecture support it. Do not promise real-time updates or guaranteed five-minute completion.

Use Supabase Cron and a secure server-side invocation mechanism, or the existing scheduler if appropriate.

### 5.4 Manual synchronization

Provide a Sync Now action that calls the same backend service as automatic synchronization.

The interface should show:

* Idle state
* Connecting state
* Syncing state
* Successful completion
* Partial completion, where applicable
* Failure and retry guidance

Repeated clicks must not create duplicate trades or conflicting synchronization jobs.

The UI must not display a successful sync before the backend confirms completion.

## 6. Trade Import and Normalization

MT5 deals and positions are different entities. A single trading position may involve multiple entry and exit deals, partial closes, commissions, and swaps.

Do not treat every broker deal as a separate completed journal trade.

Implement a documented normalization layer that maps provider data to Meridian's existing trade model.

Where available, preserve:

* Provider deal ID
* Provider order ID
* Provider position ID
* Trading symbol
* Buy/sell direction
* Entry and exit information
* Deal volume
* Execution price
* Execution timestamp
* Realized profit
* Commission
* Swap
* Account currency
* Relevant position status

Use the provider's actual documented response fields. Do not assume that every field is available for every account or deal type.

### Duplicate prevention

Use a database-level unique constraint based on the broker connection and the provider's stable deal identifier.

Synchronization must be idempotent: repeating the same request must not create duplicate records.

### Manual versus imported records

Preserve existing manual trades.

Imported records must be identifiable as broker-originated and linked to their source connection and external identifiers.

Do not silently overwrite unrelated manual trades.

If the existing database design requires a separate imported-deals table and normalized trades, implement the relationship explicitly. Avoid duplicate records in dashboard calculations.

### Open positions

Where supported, display open positions separately from completed trades.

Keep floating P&L separate from realized P&L. Do not represent an open position as a finalized closed trade.

## 7. Financial Calculation Rules

Do not use a simplistic formula such as:

`(exit price - entry price) × lot size`

as a universal forex P&L calculation.

Instrument contract specifications, tick values, account currency, conversion rates, partial closes, commission, and swap can affect the correct result.

Use broker-reported realized profit for imported closed deals where available.

Define clearly how commission and swap are incorporated. Ensure they are included exactly once.

Do not add broker-reported net profit to commission and swap again if the provider's reported field already includes those costs.

Keep these metrics distinct:

* Realized P&L
* Unrealized / floating P&L
* Gross profit
* Commission
* Swap
* Net profit
* Account balance
* Account equity, where available

Inspect the existing Meridian financial calculations before changing them. Maintain consistent definitions across the Dashboard, Trades, Calendar, and Analytics.

## 8. Database and Security

Add the smallest set of schema changes needed to support the integration.

Potential additions include:

* Broker connection records
* Imported broker deals
* Synchronization checkpoints and status
* Sync history, if required

Reuse existing accounts and trades tables wherever practical.

Do not replace existing tables or drop data.

### Row Level Security

Enable and verify RLS on every new user-facing table.

Users may access only records belonging to their own authenticated identity.

Verify account ownership when creating a broker connection. A valid foreign key alone does not prove that the account belongs to the current user.

Do not create public policies that allow unrestricted access.

Browser clients must not be able to write privileged broker records directly.

Use trusted backend functions for provider calls and protected writes.

### Secret management

Never expose:

* MetaApi access tokens
* Supabase service-role keys
* Broker credentials
* Private webhook secrets
* Other privileged environment variables

Do not use a `VITE_` prefix for secrets.

Never place credentials in source control, frontend bundles, browser local storage, error responses, or logs.

Validate and sanitize provider responses before storing or displaying them.

## 9. User Interface Requirements

Integrate the feature into the existing Meridian interface.

Follow the current design system, routing, and component conventions. Do not redesign unrelated pages.

Provide a Broker Connections interface with:

* Provider and platform identification
* Connection status
* Account association
* Connect and Disconnect actions
* Sync Now
* Last successful sync
* Sync progress and imported record counts
* Helpful error messages
* Empty and loading states

After a successful synchronization, update or invalidate the appropriate frontend queries so that the Trades page, Dashboard, Calendar, and Analytics reflect the latest database state.

Do not create a disconnected demonstration page that is unrelated to the existing application.

## 10. Testing Requirements

Add tests appropriate to the existing project and tooling.

At minimum, test:

1. Duplicate deal imports.
2. Repeated sync requests.
3. Concurrent sync requests.
4. Historical pagination.
5. Partial closes.
6. Multiple deals associated with one position.
7. Open and closed positions.
8. Corrected or delayed records.
9. Missing or invalid provider fields.
10. Expired credentials.
11. Provider outages and rate limits.
12. Subscription restrictions.
13. RLS isolation between users.
14. Account ownership checks.
15. P&L calculations and double-count prevention.
16. Manual trade preservation.
17. Dashboard and calendar updates.
18. Secure disconnection.

Run the actual lint, type-check, test, and production build commands available in the repository.

Do not claim tests passed unless they were executed and passed.

Do not use mocked provider responses as proof that a live broker account can connect. Mocks may be used for automated unit tests, clearly separated from live integration verification.

## 11. Implementation Phases

Work in this order.

### Phase 1 — Audit

Inspect the existing codebase, schema, routes, authentication, subscriptions, accounts, trades, calculations, and deployment configuration.

Report the findings without changing files.

### Phase 2 — Database foundation

Create additive migrations for broker connections, imported deals, required indexes, unique constraints, RLS, and any necessary relationships.

Verify ownership constraints and preserve existing data.

### Phase 3 — Provider connection

Verify MetaApi compatibility and implement secure connection management and account-status verification.

Do not proceed as though the integration is live until a supported account has been verified.

### Phase 4 — Import and normalization

Implement historical deal import, pagination, normalization, idempotency, position aggregation, and reconciliation.

### Phase 5 — Synchronization engine

Implement scheduled background synchronization, Sync Now, checkpoints, locking, retry behavior, and sanitized sync history.

### Phase 6 — Frontend integration

Connect the backend to the existing Meridian UI and ensure all relevant pages update from the same normalized records.

### Phase 7 — Security and regression testing

Verify RLS, secret handling, authorization, subscription enforcement, duplicate prevention, calculations, and existing features.

### Phase 8 — Deployment

Document the exact migration commands, secret names, Supabase configuration, provider setup, scheduling, and Vercel deployment steps.

Only claim completion for functionality that has actually been implemented and tested.

## 12. Required Environment Configuration

Inspect the existing project before deciding which variables to add.

Expected server-side configuration may include:

* `METAAPI_TOKEN`
* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`

Use the actual existing environment-variable conventions where appropriate. These are names, not secret values.

Configure privileged variables in the appropriate server-side environment or Supabase secret store.

Do not expose them through Vite's client environment.

Do not print secret values in the README, source code, terminal output, or deployment report.

If the integration requires additional provider configuration, document it explicitly.

## 13. Deployment and Handover

At completion, provide:

* A summary of implemented functionality.
* A list of all changed and created files.
* All SQL migration files and instructions for applying them.
* Required environment-variable names and where to configure them.
* Instructions for setting up MetaApi.
* Instructions for scheduling background sync.
* The tests executed and their actual results.
* Any outstanding blockers or provider limitations.
* The procedure for connecting the first MT5 account.
* The procedure for testing Sync Now.
* The deployment steps for Supabase and Vercel.

Never ask the user to publish secrets or commit credentials.

## 14. Instructions to the Coding Agent

You are expected to modify the existing repository directly.

Do not merely provide example code or a theoretical implementation plan.

Inspect before editing. Implement incrementally. Test after every phase. Preserve working features and existing data.

If you encounter an unknown schema, missing provider capability, migration conflict, unavailable secret, or ambiguous financial calculation, investigate and report it instead of inventing a solution.

Do not delete, recreate, or migrate the existing database without explicit approval.

Do not stop after the UI. The objective is a functioning, secure broker synchronization system.

**Definition of done:** A supported Exness MT5 account can be connected securely, historical deals can be imported without duplication, new trading activity can be synchronized automatically or through Sync Now, and the existing Meridian journal reflects those records correctly without compromising user data or account security.
