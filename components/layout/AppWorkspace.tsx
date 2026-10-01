'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Beaker } from 'lucide-react';
import { AllocationChart } from '../AllocationChart';
import { FundingStats } from '../FundingStats';
import { HoldingsTable } from '../HoldingsTable';
import { MoneyManager } from '../MoneyManager';
import { Overview } from '../Overview';
import { AddMoneyModal } from '../MoneyManager/AddMoneyModal';
import { AddFundingModal } from '../FundingStats/AddFundingModal';
import { useReadOnly } from '../WorkspaceMode';
import { SummaryCards } from '../SummaryCards';
import { TotalBalanceCard } from '../TotalBalanceCard';
import { CardSkeleton, TableSkeleton } from '../ui/Skeleton';
import { CashFlowSummary, MoneyManagerData, PortfolioSummary } from '../../types';
import { AppModule, AppShellViewState, InvestmentTab, MoneyViewRequest } from '../../types/ui';
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
  addTransactionRequested?: boolean;
  onAddTransactionHandled?: () => void;
  lastSyncedAt?: Date | null;
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
  addTransactionRequested = false,
  onAddTransactionHandled,
  lastSyncedAt,
}) => {
  const readOnly = useReadOnly();
  const [overviewAddOpen, setOverviewAddOpen] = useState(false);
  const [fundingAddOpen, setFundingAddOpen] = useState(false);
  const [moneyViewRequest, setMoneyViewRequest] = useState<MoneyViewRequest | null>(null);
  const handleMoneyViewHandled = useCallback(() => setMoneyViewRequest(null), []);
  const addTransactionHandlerRef = useRef<(() => void) | null>(null);
  const openMoney = (request?: MoneyViewRequest) => {
    setMoneyViewRequest(request ?? null);
    onSelectModule('manager');
  };
  const openOverviewAdd = () => {
    if (!readOnly && moneyData) setOverviewAddOpen(true);
  };
  useEffect(() => {
    if (activeModule !== 'overview') setOverviewAddOpen(false);
    if (activeModule !== 'manager') setMoneyViewRequest(null);
    if (activeModule !== 'investment' || activeInvTab !== 'funding') setFundingAddOpen(false);
  }, [activeModule, activeInvTab]);

  const registerAddHandler = useCallback((handler: (() => void) | null) => {
    addTransactionHandlerRef.current = handler;
    // A search command can arrive before MoneyManager has mounted or loaded.
    if (handler && addTransactionRequested && !isDemo) {
      handler();
      onAddTransactionHandled?.();
    }
  }, [addTransactionRequested, isDemo, onAddTransactionHandled]);

  const viewState = useMemo<AppShellViewState>(() => {
    if (activeModule === 'overview') {
      return { title: 'Overview', subtitle: '', breadcrumbs: ['Overview'] };
    }
    if (activeModule === 'manager') {
      return {
        title: 'Money',
        subtitle: '',
        breadcrumbs: ['Money'],
      };
    }

    if (activeInvTab === 'funding') {
      return {
        title: 'Funding',
        subtitle: '',
        breadcrumbs: ['Funding'],
      };
    }

    return {
      title: 'Invest',
      subtitle: '',
      breadcrumbs: ['Invest'],
    };
  }, [activeInvTab, activeModule]);

  const activeHideValue = activeModule === 'overview' ? hideBalance && hideInvestments : activeModule === 'manager' ? hideBalance : hideInvestments;
  const isFunding = activeModule === 'investment' && activeInvTab === 'funding';
  const primaryActionLabel = isFunding ? 'Add cash flow' : activeModule === 'investment' ? 'Add Trade' : 'Add transaction';
  const togglePrivacy = () => {
    if (activeModule === 'overview') {
      // A partially hidden overview becomes fully hidden with one action.
      const nextHidden = !activeHideValue;
      if (hideBalance !== nextHidden) onToggleHideBalance();
      if (hideInvestments !== nextHidden) onToggleHideInvestments();
    } else if (activeModule === 'manager') onToggleHideBalance();
    else onToggleHideInvestments();
  };
  const periodLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const syncLabel = error ? 'Sync incomplete' : loading ? 'Syncing...' : isDemo ? 'Demo / Read-only' :
    lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Not synced';

  const headerSlot = isDemo ? (
    <div className="workspace-demo-banner">
      <div><Beaker size={16} /><span>Demo dataset / Read-only</span></div>
      <Link href="/" className="focus-ring overview-accent">Go to Real App</Link>
    </div>
  ) : undefined;

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
      primaryActionDisabled={activeModule !== 'investment' ? !moneyData : isFunding ? !cashFlowData : !data}
      periodLabel={periodLabel}
      syncLabel={syncLabel}
      syncFailed={Boolean(error)}
      headerSlot={activeModule === 'overview' ? undefined : headerSlot}
      onSelectModule={onSelectModule}
      onSelectInvTab={onSelectInvTab}
      onOpenSearch={onOpenSearch}
      onRefresh={onRefresh}
      onTogglePrivacy={togglePrivacy}
      onPrimaryAction={
        activeModule === 'overview' ? openOverviewAdd : activeModule === 'manager'
          ? () => addTransactionHandlerRef.current?.()
          : isFunding ? () => { if (!readOnly) setFundingAddOpen(true); } : onOpenAddTrade
      }
    >
      {activeModule === 'manager' && moneyData ? <TotalBalanceCard
        totalBalance={moneyData?.totalBalance || 0}
        accounts={moneyData?.accounts || []}
        hideValues={hideBalance}
        onTogglePrivacy={onToggleHideBalance}
        syncFailed={Boolean(error)}
      /> : null}

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
          {activeModule === 'overview' ? (
            <Overview
              money={moneyData}
              portfolio={data}
              cashFlow={cashFlowData}
              hideBalance={hideBalance}
              hideInvestments={hideInvestments}
              onOpenMoney={openMoney}
              onOpenInvestments={() => { onSelectInvTab('dashboard'); onSelectModule('investment'); }}
              onOpenFunding={() => { onSelectInvTab('funding'); onSelectModule('investment'); }}
              onAddTransaction={openOverviewAdd}
            />
          ) : null}

          {activeModule === 'manager' && moneyData ? (
            <MoneyManager
              data={moneyData}
              loading={loading}
              onRefresh={onRefresh}
              hideValues={hideBalance}
              registerAddHandler={registerAddHandler}
              viewRequest={moneyViewRequest}
              onViewRequestHandled={handleMoneyViewHandled}
            />
          ) : null}
          {activeModule === 'manager' && !moneyData ? <p className="workspace-empty" role="status">Money data is unavailable.</p> : null}

          {activeModule === 'investment' && activeInvTab === 'funding' ? (
            <FundingStats
              cashFlow={cashFlowData}
              portfolio={data}
              hideValues={hideInvestments}
            />
          ) : null}

          {activeModule === 'investment' && activeInvTab === 'dashboard' ? (
            <>
              <SummaryCards data={data} loading={loading} hideValues={hideInvestments} />
              <div className="workspace-columns">
                <div className="workspace-section">
                  <HoldingsTable data={data} hideValues={hideInvestments} />
                </div>
                <div className="workspace-stack">
                  <AllocationChart data={data} hideValues={hideInvestments} />
                  <div className="workspace-concentration">
                    <h3>Concentration</h3>
                    <p>
                      {!data ? 'Portfolio data is unavailable.' : holdings.length === 0
                        ? 'No active holdings.'
                        : `You currently hold ${holdings.length} assets across ${Object.keys(sectors).length} sectors.`}
                    </p>
                    {topHolding ? (
                      <p className="mt-3">
                        {`${topHolding.ticker} is your largest single position at ${hideInvestments ? '****' : `${topHolding.allocation.toFixed(1)}%`} allocation.`}
                      </p>
                    ) : null}
                    {leadSector ? (
                      <p className="mt-3">
                        {`${leadSector[0]} is your dominant sector with approximately ${hideInvestments ? '****' : `${leadSectorWeight.toFixed(1)}%`} portfolio exposure.`}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
      {isFunding ? <AddFundingModal isOpen={fundingAddOpen} onClose={() => setFundingAddOpen(false)}
        onSuccess={() => { setFundingAddOpen(false); onRefresh(); }} /> : null}
      {activeModule === 'overview' && moneyData ? (
        <AddMoneyModal
          isOpen={overviewAddOpen}
          onClose={() => setOverviewAddOpen(false)}
          onSuccess={onRefresh}
          accounts={moneyData.accounts}
          incomeCategories={moneyData.incomeCategories || []}
          expenseCategories={moneyData.expenseCategories || []}
        />
      ) : null}
    </AppShell>
  );
};
