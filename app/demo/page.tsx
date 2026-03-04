'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AddTradeModal } from '../../components/AddTradeModal';
import { CommandPalette } from '../../components/CommandPalette';
import { AppWorkspace } from '../../components/layout/AppWorkspace';
import { getCashFlowData, getMoneyManagerData, getPortfolioData } from '../actions';
import { CashFlowSummary, MoneyManagerData, PortfolioSummary } from '../../types';
import { AppModule, CommandSearchItem, InvestmentTab, QuickActionType } from '../../types/ui';

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

export default function DemoPage() {
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowSummary | null>(null);
  const [moneyData, setMoneyData] = useState<MoneyManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

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
      const [portfolioResult, cashFlowResult, moneyResult] = await Promise.all([
        getPortfolioData(true).catch(() => null),
        getCashFlowData(true).catch(() => null),
        getMoneyManagerData(true).catch(() => null),
      ]);

      setData(portfolioResult || fallbackPortfolio);
      setCashFlowData(cashFlowResult || fallbackCashFlow);
      setMoneyData(moneyResult || fallbackMoneyData);
    } catch (err) {
      setError('Failed to load demo dataset.');
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
    fetchData();
  }, [fetchData]);

  return (
    <>
      <AppWorkspace
        isDemo
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
