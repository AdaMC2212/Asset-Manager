'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { AddTradeModal } from '../components/AddTradeModal';
import { CommandPalette } from '../components/CommandPalette';
import { AppWorkspace } from '../components/layout/AppWorkspace';
import { DecryptedText } from '../components/ui/DecryptedText';
import { getCashFlowData, getMoneyManagerData, getPortfolioData, checkDatabaseStatus } from './actions';
import { CashFlowSummary, MoneyManagerData, PortfolioSummary } from '../types';
import { AppModule, CommandSearchItem, InvestmentTab, QuickActionType } from '../types/ui';

const fallbackPortfolio: PortfolioSummary = {
  netWorth: 0,
  totalCost: 0,
  totalPL: 0,
  totalPLPercent: 0,
  cashBalance: 0,
  holdings: [],
};

const fallbackCashFlow: CashFlowSummary = {
  totalDepositedMYR: 0,
  totalConvertedMYR: 0,
  totalConvertedUSD: 0,
  avgRate: 0,
  deposits: [],
  conversions: [],
};

const fallbackMoneyData: MoneyManagerData = {
  accounts: [],
  transactions: [],
  totalBalance: 0,
  monthlyStats: { income: 0, expense: 0, incomeGrowth: 0, expenseGrowth: 0 },
  categorySpending: [],
  graphData: [],
  upcomingBills: [],
  categories: [],
  incomeCategories: [],
  expenseCategories: [],
};

const LockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const envPin = process.env.NEXT_PUBLIC_APP_PASSWORD;
    const targetPin = envPin || 'admin';

    if (pin === targetPin) {
      onUnlock();
      return;
    }

    setError(true);
    setPin('');
  };

  return (
    <div className="ambient-bg relative flex min-h-screen items-center justify-center p-4">
      <div className="panel-elevated relative w-full max-w-md overflow-hidden rounded-3xl p-8 sm:p-10">
        <div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-[var(--accent-primary)]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 rounded-2xl border border-[var(--border-soft)] bg-white/5 p-4">
              <ShieldCheck className="h-9 w-9 text-[var(--accent-primary)]" />
            </div>
            <h1 className="font-display text-3xl text-[var(--text-primary)]">
              <DecryptedText text="AssetManager" speed={45} className="text-[var(--text-primary)]" />
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Secure vault access for your financial workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Access PIN</label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(event) => {
                    setPin(event.target.value);
                    setError(false);
                  }}
                  className="focus-ring w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-base)] px-4 py-3 text-center text-2xl tracking-[0.45em] text-[var(--text-primary)] placeholder:tracking-normal"
                  placeholder="****"
                  autoFocus
                />
                <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
            </div>

            {error ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                <AlertCircle className="h-4 w-4" />
                Incorrect PIN. Try again.
              </div>
            ) : null}

            <button
              type="submit"
              className="focus-ring w-full rounded-2xl bg-[var(--accent-primary)] px-4 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--accent-secondary)]"
            >
              Unlock Workspace
            </button>
          </form>

          <div className="mt-8 border-t border-[var(--border-soft)] pt-5 text-center">
            <Link
              href="/demo"
              className="focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              View Demo Workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [isLocked, setIsLocked] = useState(true);
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowSummary | null>(null);
  const [moneyData, setMoneyData] = useState<MoneyManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; initialized: boolean; isDemo?: boolean } | null>(null);

  const [activeModule, setActiveModule] = useState<AppModule>('manager');
  const [activeInvTab, setActiveInvTab] = useState<InvestmentTab>('dashboard');
  const [hideBalance, setHideBalance] = useState(false);
  const [hideInvestments, setHideInvestments] = useState(false);

  const searchItems = useMemo<CommandSearchItem[]>(() => {
    const items: CommandSearchItem[] = [
      { id: 'module-manager', name: 'Money Manager', type: 'module', module: 'manager', keywords: ['wallet', 'expenses'] },
      { id: 'module-investment', name: 'Investments', type: 'module', module: 'investment', keywords: ['portfolio', 'holdings'] },
      { id: 'module-funding', name: 'Cash Flow', type: 'module', module: 'investment', keywords: ['funding', 'conversion'] },
      { id: 'action-add-trade', name: 'Add Trade', type: 'action', action: 'add_trade', module: 'investment' },
      { id: 'action-add-transaction', name: 'Add Transaction', type: 'action', action: 'add_transaction', module: 'manager' },
      { id: 'action-refresh', name: 'Refresh Data', type: 'action', action: 'refresh' },
    ];

    for (const holding of data?.holdings || []) {
      items.push({
        id: `asset-${holding.ticker}`,
        name: holding.ticker,
        type: 'asset',
        module: 'investment',
        action: 'open_asset',
        keywords: [holding.sector, holding.assetClass],
      });
    }

    return items;
  }, [data]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await checkDatabaseStatus();
      setDbStatus(status);

      if (!status.configured) {
        setError('Database connection is missing. Configure GOOGLE_SERVICE_ACCOUNT_KEY before loading data.');
        setData(fallbackPortfolio);
        setCashFlowData(fallbackCashFlow);
        setMoneyData(fallbackMoneyData);
        return;
      }

      const [portfolioResult, cashFlowResult, moneyResult] = await Promise.all([
        getPortfolioData().catch(() => null),
        getCashFlowData().catch(() => null),
        getMoneyManagerData().catch(() => null),
      ]);

      setData(portfolioResult || fallbackPortfolio);
      setCashFlowData(cashFlowResult || fallbackCashFlow);
      setMoneyData(moneyResult || fallbackMoneyData);
    } catch (err) {
      setError('Failed to initialize the workspace.');
      setData(fallbackPortfolio);
      setCashFlowData(fallbackCashFlow);
      setMoneyData(fallbackMoneyData);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAction = useCallback(
    (action?: QuickActionType) => {
      if (!action) return;

      if (action === 'add_trade') {
        setActiveModule('investment');
        setIsAddTradeOpen(true);
        return;
      }

      if (action === 'add_transaction') {
        setActiveModule('manager');
        return;
      }

      if (action === 'refresh') {
        fetchData();
      }
    },
    [fetchData],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isLocked) return;

    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData, isLocked]);

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <>
      <AppWorkspace
        isDemo={dbStatus?.isDemo}
        data={data}
        cashFlowData={cashFlowData}
        moneyData={moneyData}
        loading={loading}
        error={error}
        activeModule={activeModule}
        activeInvTab={activeInvTab}
        hideBalance={hideBalance}
        hideInvestments={hideInvestments}
        onSelectModule={setActiveModule}
        onSelectInvTab={setActiveInvTab}
        onToggleHideBalance={() => setHideBalance((prev) => !prev)}
        onToggleHideInvestments={() => setHideInvestments((prev) => !prev)}
        onOpenSearch={() => setIsCommandOpen(true)}
        onOpenAddTrade={() => setIsAddTradeOpen(true)}
        onRefresh={fetchData}
      />

      <AddTradeModal isOpen={isAddTradeOpen} onClose={() => setIsAddTradeOpen(false)} onSuccess={fetchData} />

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectModule={setActiveModule}
        onSelectInvestmentTab={setActiveInvTab}
        onRunAction={handleAction}
        searchItems={searchItems}
      />
    </>
  );
}
 