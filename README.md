# AssetManager

AssetManager is a Next.js + TypeScript web app for tracking investments, cash flow, and personal money accounts in one workspace.

## Features

- Portfolio dashboard with holdings, allocation, and P/L insights
- Cash flow tracking for MYR deposits and USD conversions
- Money manager for account balances and transactions
- Command palette (`Ctrl/Cmd + K`) for fast navigation and actions
- PWA support with service worker registration

## Stack

- Next.js (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Recharts
- Google Sheets integration via server actions

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

Use Node.js 20.11 or later for the regression tests.

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Tests replace Google Sheets and Yahoo with local substitutes. They do not read or
modify live records. The build downloads the existing Google Fonts if not cached.

## Data Integrity

- `/demo` and the no-credentials workspace are read-only. Forms and server-side
  mutation guards both enforce this for normal app requests.
- Credit-card settlement updates the charges and appends the payment in one
  atomic Sheets batch. A persisted operation ID makes retries of that payment
  idempotent. Generic edits/deletes of settled charges and payment records are
  blocked; a linked reversal workflow is not implemented.
- Recurring debits are deduplicated by rule and calendar month. Deleting one
  occurrence retains a non-financial cancellation marker in its row. Do not
  manually clear these markers if the rule should remain cancelled for that month.
- Schedule edits finish already-due occurrences using the old rule, then apply
  the new schedule prospectively from the edit date. Existing months are not
  charged a second time.
- The transaction schema adds `Settlement ID` in `MM_Transactions!O`; recurring
  rules add `Schedule Effective From` in `MM_AutoDebits!P`. These columns must be
  available for app metadata. The normal live initialization/refresh updates the
  headers; existing rows remain compatible. No live schema migration is run by tests.
- Mutation/recurrence serialization is per spreadsheet within **one Node.js
  process**. Multiple server processes or instances require a distributed lock or
  transactional database before sharing this spreadsheet. Manual sheet changes
  are outside this lock.
- Calendar dates use the local runtime timezone. Run the server in the same
  timezone as the user, for example `TZ=Asia/Kuala_Lumpur npm run dev`.
- Failed refreshes keep the last successful datasets and show an incomplete-sync
  state. Card expenses are recognized on their payment date; activity retains the
  original purchase date.

This remains a local single-user app. `NEXT_PUBLIC_APP_PASSWORD` is a client-side
screen lock, not server authentication. Its existing `admin` fallback is accepted
when unset. Do not expose the app publicly without server-side authentication and
appropriate dependency/security updates.

These fixes prevent new inconsistencies. They do not reconcile duplicate,
deleted, or partially settled records already present in a live spreadsheet.

## Project Structure

```text
app/                 Next.js routes and server actions
components/          Reusable UI and feature components
components/layout/   Shared app shell (sidebar, topbar, content)
lib/                 External service integrations
public/              Static assets
types.ts             Domain models
types/ui.ts          UI shell and command palette models
```
