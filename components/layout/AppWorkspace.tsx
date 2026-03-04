'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AlertCircle, Beaker, Landmark, LayoutDashboard } from 'lucide-react';
import { AllocationChart } from '../AllocationChart';
import { FundingStats } from '../FundingStats';
import { HoldingsTable } from '../HoldingsTable';
import { MoneyManager } from '../MoneyManager';
import { SummaryCards } from '../SummaryCards';
import { TotalBalanceCard } from '../TotalBalanceCard';
import { CardSkeleton, TableSkeleton } from '../ui/Skeleton';
import { CashFlowSummary, MoneyManagerData, PortfolioSummary } from '../../types';
import { AppModule, AppShellViewState, InvestmentTab } from '../../types/ui';
import { AppShell } from './AppShell';

interface AppWorkspaceProps {
  isDemo?: boolean;
  data: PortfolioSummary | null;
  cashFlowData: CashFlowSummary | null;
  moneyData: MoneyManagerData | null;
  loading: boolean;
  error: string | null;
  activeModule: AppModule;
  activeInvTab: InvestmentTab;
  hideBalance: boolean;
  hideInvestments: boolean;
  onSelectModule: (module: AppModule) => void;
  onSelectInvTab: (tab: InvestmentTab) => void;
  onToggleHideBalance: () => void;
  onToggleHideInvestments: () => void;
  onOpenSearch: () => void;
  onOpenAddTrade: () => void;
  onRefresh: () => void;
}

export const AppWorkspace: React.FC<AppWorkspaceProps> = ({
  isDemo,
  data,
  cashFlowData,
  moneyData,
  loading,
  error,
  activeModule,
  activeInvTab,
  hideBalance,
  hideInvestments,
  onSelectModule,
  onSelectInvTab,
  onToggleHideBalance,
  onToggleHideInvestments,
  onOpenSearch,
  onOpenAddTrade,
  onRefresh,
}) => {
  const addTransactionHandlerRef = useRef<(() => void) | null>(null);

  const registerAddHandler = useCallback((handler: () => void) => {
    addTransactionHandlerRef.current = handler;
  }, []);

  const viewState = useMemo<AppShellViewState>(() => {
    if (activeModule === 'manager') {
      return {
        title: 'Money Manager',
        subtitle: 'Track balances, spending, and recurring outflows in one flow.',
        breadcrumbs: ['Workspace', 'Money Manager'],
      };
    }

    if (activeInvTab === 'funding') {
      return {
        title: 'Funding Intelligence',
        subtitle: 'Analyze capital inflows, conversions, and lifecycle return quality.',
        breadcrumbs: ['Workspace', 'Investments', 'Cash Flow'],
      };
    }

    return {
      title: 'Portfolio Command',
      subtitle: 'Monitor concentration risk, allocation quality, and return momentum.',
      breadcrumbs: ['Workspace', 'Investments', 'Portfolio'],
    };
  }, [activeInvTab, activeModule]);

  const activeHideValue = activeModule === 'manager' ? hideBalance : hideInvestments;
  const primaryActionLabel = activeModule === 'manager' ? 'Add Transaction' : 'Add Trade';

  const headerSlot = (
    <div className="space-y-4">
      {isDemo ? (
        <div className="panel-elevated flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/20 p-2 text-amber-300">
              <Beaker className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Demo Dataset Active</p>
              <p className="text-xs text-[var(--text-secondary)]">This workspace is read-only simulation data.</p>
            </div>
          </div>
          <Link
            href="/"
            className="focus-ring inline-flex items-center rounded-xl border border-[var(--border-soft)] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-white/[0.08]"
          >
            Go to Real App
          </Link>
        </div>
      ) : null}

      {activeModule === 'investment' ? (
        <div className="panel inline-flex w-full flex-wrap items-center gap-2 p-2 sm:w-auto">
          <button
            type="button"
            onClick={() => onSelectInvTab('dashboard')}
            className={`focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeInvTab === 'dashboard'
                ? 'bg-white/10 text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => onSelectInvTab('funding')}
            className={`focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeInvTab === 'funding'
                ? 'bg-white/10 text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            <Landmark className="h-4 w-4" />
            Cash Flow
          </button>
        </div>
      ) : null}
    </div>
  );

  const holdings = data?.holdings ?? [];
  const topHolding = holdings.length > 0 ? [...holdings].sort((a, b) => b.allocation - a.allocation)[0] : null;
  const sectors = holdings.reduce<Record<string, number>>((acc, holding) => {
    acc[holding.sector] = (acc[holding.sector] || 0) + holding.currentValue;
    return acc;
  }, {});
  const leadSector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0];
  const leadSectorWeight = leadSector && data?.netWorth ? (leadSector[1] / data.netWorth) * 100 : 0;

  return (
    <AppShell
      activeModule={activeModule}
      activeInvTab={activeInvTab}
      viewState={viewState}
      hideValues={activeHideValue}
      loading={loading}
      isDemo={isDemo}
      primaryActionLabel={primaryActionLabel}
      headerSlot={headerSlot}
      onSelectModule={onSelectModule}
      onSelectInvTab={onSelectInvTab}
      onOpenSearch={onOpenSearch}
      onRefresh={onRefresh}
      onTogglePrivacy={activeModule === 'manager' ? onToggleHideBalance : onToggleHideInvestments}
      onPrimaryAction={
        activeModule === 'manager'
          ? () => addTransactionHandlerRef.current?.()
          : onOpenAddTrade
      }
    >
      <TotalBalanceCard
        totalBalance={moneyData?.totalBalance || 0}
        accounts={moneyData?.accounts || []}
        hideValues={hideBalance}
        onTogglePrivacy={onToggleHideBalance}
      />

      {error ? (
        <div className="panel flex items-center gap-3 border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <TableSkeleton />
        </div>
      ) : (
        <>
          {activeModule === 'manager' ? (
            <MoneyManager
              data={moneyData}
              loading={loading}
              onRefresh={onRefresh}
              hideValues={hideBalance}
              registerAddHandler={registerAddHandler}
            />
          ) : null}

          {activeModule === 'investment' && activeInvTab === 'funding' ? (
            <FundingStats
              cashFlow={cashFlowData}
              portfolio={data}
              hideValues={hideInvestments}
              onRefresh={onRefresh}
            />
          ) : null}

          {activeModule === 'investment' && activeInvTab === 'dashboard' ? (
            <>
              <SummaryCards data={data} loading={loading} hideValues={hideInvestments} />
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                <div className="space-y-8 xl:col-span-2">
                  <HoldingsTable data={data} hideValues={hideInvestments} />
                </div>
                <div className="space-y-8">
                  <AllocationChart data={data} />
                  <div className="kpi-card relative overflow-hidden p-6">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--accent-primary)]/20 blur-3xl" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Insight Story</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {holdings.length === 0
                        ? 'No active holdings yet. Add your first trade to unlock concentration and sector analysis.'
                        : `You currently hold ${holdings.length} assets across ${Object.keys(sectors).length} sectors.`}
                    </p>
                    {topHolding ? (
                      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {`${topHolding.ticker} is your largest single position at ${topHolding.allocation.toFixed(1)}% allocation.`}
                      </p>
                    ) : null}
                    {leadSector ? (
                      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {`${leadSector[0]} is your dominant sector with approximately ${leadSectorWeight.toFixed(1)}% portfolio exposure.`}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </AppShell>
  );
};
