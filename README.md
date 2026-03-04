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
