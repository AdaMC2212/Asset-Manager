import React, { useState } from 'react';
import { AppWorkspace } from '../../components/layout/AppWorkspace';
import { WorkspaceModeProvider } from '../../components/WorkspaceMode';
import { AppModule, InvestmentTab } from '../../types/ui';
import { CashFlowSummary, MoneyManagerData, PortfolioSummary } from '../../types';

const money: MoneyManagerData = {
  accounts: [
    { name: 'Maybank', category: 'Bank', logoUrl: '', initialBalance: 18450, currentBalance: 18450 },
    { name: 'Touch n Go', category: 'Wallet', logoUrl: '', initialBalance: 4090, currentBalance: 4090 },
    { name: 'Cash', category: 'Cash', logoUrl: '', initialBalance: 2000, currentBalance: 2000 },
    { name: 'Card', category: 'Credit Card', logoUrl: '', initialBalance: 0, currentBalance: -1260, billingDayOfMonth: 15 },
  ],
  transactions: [
    { id: 'groceries', date: '2026-09-30', type: 'Expense', category: 'Groceries', amount: 86.5, fromAccount: 'Maybank', rowIndex: 2 },
    { id: 'salary', date: '2026-09-29', type: 'Income', category: 'Salary', amount: 8500, toAccount: 'Maybank', rowIndex: 3 },
    { id: 'transport', date: '2026-09-29', type: 'Expense', category: 'Transport', amount: 12, fromAccount: 'Touch n Go', rowIndex: 4 },
    { id: 'top-up', date: '2026-09-28', type: 'Transfer', category: 'Wallet top-up', amount: 200, fromAccount: 'Maybank', toAccount: 'Touch n Go', rowIndex: 5 },
    { id: 'expenses', date: '2026-09-20', type: 'Expense', category: 'Bills', amount: 3161.5, fromAccount: 'Maybank', rowIndex: 6 },
    { id: 'statement', date: '2026-09-10', type: 'Expense', category: 'Shopping', amount: 980, fromAccount: 'Card', isCardCharge: true, rowIndex: 7 },
    { id: 'unbilled', date: '2026-09-20', type: 'Expense', category: 'Shopping', amount: 280, fromAccount: 'Card', isCardCharge: true, rowIndex: 8 },
  ],
  totalBalance: 23280, monthlyStats: { income: 8500, expense: 3260, incomeGrowth: 0, expenseGrowth: 0 },
  categorySpending: [], graphData: [], upcomingBills: [], categories: ['Salary', 'Groceries'],
  incomeCategories: ['Salary'], expenseCategories: ['Groceries', 'Transport', 'Bills', 'Shopping'],
};
const portfolio: PortfolioSummary = {
  netWorth: 24860, totalCost: 19500, totalPL: 1860, totalPLPercent: 9.54, cashBalance: 3500,
  holdings: [{ ticker: 'AAPL', quantity: 100, avgCost: 195, currentPrice: 213.6, currentValue: 21360, totalCost: 19500,
    unrealizedPL: 1860, unrealizedPLPercent: 9.54, allocation: 85.92, sector: 'Technology', assetClass: 'Stock' }],
};
const cashFlow: CashFlowSummary = {
  totalDepositedMYR: 100000, totalConvertedMYR: 4200, totalConvertedUSD: 1000, avgRate: 4.2, deposits: [],
  conversions: [{ date: '2026-09-28', amountMYR: 4200, amountUSD: 1000, rate: 4.2 }],
};

export function OverviewBrowser({ variant }: { variant: string }) {
  const [module, setModule] = useState<AppModule>('overview');
  const [tab, setTab] = useState<InvestmentTab>('dashboard');
  const [hideBalance, setHideBalance] = useState(false);
  const [hideInvestments, setHideInvestments] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const missing = variant === 'missing';
  const empty = variant === 'empty';
  const long = variant === 'long';
  const currentMoney = empty ? { ...money, accounts: [], transactions: [], totalBalance: 0 } : long ? {
    ...money,
    accounts: money.accounts.map((account, index) => ({ ...account, name: `AccountWithAnExceptionallyLongNameThatMustWrap${index}`, currentBalance: 1234567890.12 })),
    transactions: money.transactions.map((transaction) => ({ ...transaction, category: 'VeryLongTransactionCategoryWithoutSpaces', fromAccount: 'VeryLongAccountNameWithoutSpaces', amount: 1234567890.12 })),
  } : money;
  return <WorkspaceModeProvider value={variant === 'demo'}>
    <AppWorkspace
      data={missing ? null : empty ? { ...portfolio, holdings: [], netWorth: 0 } : long ? {
        ...portfolio, netWorth: 1234567890.12, totalPL: -123456789.12, cashBalance: 123456789.12,
        holdings: portfolio.holdings.map((holding) => ({ ...holding, ticker: 'LONGTICKERSYMBOL', sector: 'SectorWithAnExceptionallyLongNameThatMustWrap',
          quantity: 123456789, currentValue: 1234567890.12, unrealizedPL: -123456789.12 })),
      } : portfolio}
      moneyData={missing ? null : currentMoney}
      cashFlowData={missing ? null : empty ? { ...cashFlow, conversions: [] } : long ? {
        ...cashFlow, totalDepositedMYR: 1234567890.12, totalConvertedUSD: 123456789.12,
        deposits: [{ date: '2026-09-30', amountMYR: 1234567890.12, reason: 'DepositWithAnExceptionallyLongDescriptionWithoutSpaces' }],
        conversions: [{ date: '2026-09-30', amountMYR: -1234567890.12, amountUSD: -123456789.12, rate: 10 }],
      } : cashFlow}
      loading={variant === 'loading'}
      error={missing ? 'Sync failed. Refresh to retry.' : syncError}
      lastSyncedAt={new Date('2026-09-30T09:41:00')}
      isDemo={variant === 'demo'}
      activeModule={module}
      activeInvTab={tab}
      hideBalance={hideBalance}
      hideInvestments={hideInvestments}
      onSelectModule={setModule}
      onSelectInvTab={setTab}
      onToggleHideBalance={() => setHideBalance((value) => !value)}
      onToggleHideInvestments={() => setHideInvestments((value) => !value)}
      onOpenSearch={() => {}}
      onOpenAddTrade={() => {}}
      onRefresh={() => setSyncError('Sync failed. Last available data is shown.')}
    />
  </WorkspaceModeProvider>;
}
