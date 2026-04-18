'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, ShoppingBag, Car, Zap, Utensils, Smartphone, Banknote, Calendar, X, Pencil, Trash2, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { MoneyAccount, MoneyManagerData, MoneyTransaction } from '../types';
import { AddMoneyModal } from './MoneyManager/AddMoneyModal';
import { MoneyActivityList, MoneyFilters } from './MoneyManager/MoneyActivityList';
import { MoneyBreakdownPanel } from './MoneyManager/MoneyBreakdownPanel';
import { MoneyHeader } from './MoneyManager/MoneyHeader';
import { MoneyStatsRow } from './MoneyManager/MoneyStatsRow';
import { SettleCreditCardModal } from './MoneyManager/SettleCreditCardModal';
import { deleteMoneyTransaction } from '../app/actions';

interface MoneyManagerProps {
  data: MoneyManagerData | null;
  loading: boolean;
  onRefresh: () => void;
  hideValues?: boolean;
  registerAddHandler?: (handler: () => void) => void;
}

const PIE_COLORS = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9'];

const getCategoryStyles = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes('food') || c.includes('dining')) return { icon: <Utensils className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-orange-500', text: 'text-orange-100' };
  if (c.includes('transport') || c.includes('fuel')) return { icon: <Car className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-blue-500', text: 'text-blue-100' };
  if (c.includes('shop') || c.includes('fashion')) return { icon: <ShoppingBag className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-pink-500', text: 'text-pink-100' };
  if (c.includes('bill') || c.includes('utility')) return { icon: <Zap className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-yellow-500', text: 'text-yellow-100' };
  if (c.includes('salary') || c.includes('income')) return { icon: <Banknote className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-emerald-500', text: 'text-emerald-100' };
  if (c.includes('tech') || c.includes('gadget')) return { icon: <Smartphone className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-indigo-500', text: 'text-indigo-100' };

  return { icon: <Wallet className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-slate-600', text: 'text-slate-100' };
};

const getTransactionBadge = (tx: MoneyTransaction) => {
  if (!tx.isCardCharge) return null;
  return tx.settlementStatus === 'Settled'
    ? { label: 'Settled', className: 'bg-emerald-500/10 text-emerald-300' }
    : { label: 'Charged', className: 'bg-amber-500/10 text-amber-300' };
};

const isRecognizedExpense = (tx: MoneyTransaction) => tx.type === 'Expense' && (!tx.isCardCharge || tx.settlementStatus === 'Settled');
const isUnsettledCardCharge = (tx: MoneyTransaction) => tx.type === 'Expense' && tx.isCardCharge && tx.settlementStatus !== 'Settled';

export const MoneyManager: React.FC<MoneyManagerProps> = ({ data, loading, onRefresh, hideValues, registerAddHandler }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isOutstandingModalOpen, setIsOutstandingModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<MoneyTransaction | null>(null);
  const [settlingCard, setSettlingCard] = useState<MoneyAccount | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MoneyFilters>({
    type: 'All',
    account: 'All',
    startDate: '',
    endDate: ''
  });

  const creditCardAccounts = useMemo(
    () => (data?.creditCardAccounts || data?.accounts.filter((account) => (account.category || '').toLowerCase() === 'credit card') || []),
    [data]
  );

  const creditCardOutstandingMap = useMemo(() => {
    const totals: Record<string, number> = {};
    if (!data) return totals;

    data.transactions.forEach((tx) => {
      if (isUnsettledCardCharge(tx) && tx.fromAccount) {
        totals[tx.fromAccount] = (totals[tx.fromAccount] || 0) + tx.amount;
      }
    });

    return totals;
  }, [data]);

  const outstandingCardDetails = useMemo(() => {
    if (!data) return [];

    return creditCardAccounts
      .map((account) => {
        const transactions = data.transactions.filter(
          (tx) => isUnsettledCardCharge(tx) && tx.fromAccount === account.name
        );

        return {
          account,
          total: transactions.reduce((sum, tx) => sum + tx.amount, 0),
          transactions,
        };
      })
      .filter((item) => item.total > 0);
  }, [creditCardAccounts, data]);

  const { filteredTransactions, baseTransactionsForBreakdown, monthlyStats, pieData, fullBreakdown, isCustomDateMode } = useMemo(() => {
    if (!data) {
      return {
        filteredTransactions: [],
        baseTransactionsForBreakdown: [],
        monthlyStats: { income: 0, expense: 0, outstanding: 0, balance: 0 },
        pieData: [],
        fullBreakdown: [],
        isCustomDateMode: false
      };
    }

    let base: MoneyTransaction[] = [];
    const useCustomDate = Boolean(filters.startDate && filters.endDate);

    if (useCustomDate) {
      base = data.transactions.filter((tx) => tx.date >= filters.startDate && tx.date <= filters.endDate);
    } else {
      const targetMonth = selectedDate.getMonth();
      const targetYear = selectedDate.getFullYear();
      base = data.transactions.filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
      });
    }

    if (filters.account !== 'All') {
      base = base.filter((tx) => tx.fromAccount === filters.account || tx.toAccount === filters.account);
    }

    let activityFiltered = [...base];
    if (filters.type !== 'All') {
      activityFiltered = activityFiltered.filter((tx) => tx.type === filters.type);
    }

    let income = 0;
    let expense = 0;
    const catTotals: Record<string, number> = {};

    base.forEach((tx) => {
      if (tx.type === 'Income') {
        income += tx.amount;
        catTotals[tx.category] = (catTotals[tx.category] || 0) - tx.amount;
      } else if (isRecognizedExpense(tx)) {
        expense += tx.amount;
        catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
      }
    });

    const outstanding = data.transactions.reduce((sum, tx) => {
      const matchesAccount = filters.account === 'All' || tx.fromAccount === filters.account;
      return matchesAccount && isUnsettledCardCharge(tx) ? sum + tx.amount : sum;
    }, 0);

    const breakdown = Object.entries(catTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      filteredTransactions: activityFiltered,
      baseTransactionsForBreakdown: base,
      monthlyStats: { income, expense, outstanding, balance: income - expense },
      pieData: breakdown.filter((item) => item.value > 0),
      fullBreakdown: breakdown,
      isCustomDateMode: useCustomDate
    };
  }, [data, selectedDate, filters]);

  const { categoryTransactions, categorySummary } = useMemo(() => {
    if (!selectedCategory) return { categoryTransactions: [], categorySummary: { income: 0, expense: 0, charged: 0, net: 0 } };

    const transactions = baseTransactionsForBreakdown.filter((tx) => tx.category === selectedCategory);

    let income = 0;
    let expense = 0;
    let charged = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'Income') income += tx.amount;
      else if (isUnsettledCardCharge(tx)) charged += tx.amount;
      else if (isRecognizedExpense(tx)) expense += tx.amount;
    });

    return {
      categoryTransactions: transactions,
      categorySummary: { income, expense, charged, net: expense - income }
    };
  }, [baseTransactionsForBreakdown, selectedCategory]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-6 animate-pulse md:grid-cols-3">
        <div className="h-64 rounded-3xl bg-slate-900/50 md:col-span-2" />
        <div className="h-64 rounded-3xl bg-slate-900/50" />
      </div>
    );
  }

  const displayValue = (val: number, prefix: string = 'RM ') => {
    if (hideValues) return `${prefix} ****`;
    return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const prevMonth = () => setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const monthLabel = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleDelete = async (tx: MoneyTransaction) => {
    if (!tx.rowIndex) return;
    if (confirm(`Delete ${tx.category} (RM ${tx.amount})?`)) {
      const res = await deleteMoneyTransaction(tx.rowIndex);
      if (res.success) onRefresh();
    }
  };

  const handleEdit = (tx: MoneyTransaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setFilters({
      type: 'All',
      account: 'All',
      startDate: '',
      endDate: ''
    });
  };

  const hasActiveFilters = filters.type !== 'All' || filters.account !== 'All' || Boolean(filters.startDate && filters.endDate);

  useEffect(() => {
    if (!registerAddHandler) return;
    registerAddHandler(() => {
      setEditingTransaction(null);
      setIsModalOpen(true);
    });
  }, [registerAddHandler]);

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
      <div className="space-y-4 md:space-y-8 xl:col-span-2">
        <MoneyHeader
          monthLabel={monthLabel}
          isCustomDateMode={isCustomDateMode}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onAddNew={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
        />

        <MoneyStatsRow
          income={monthlyStats.income}
          expense={monthlyStats.expense}
          outstanding={monthlyStats.outstanding}
          balance={monthlyStats.balance}
          isCustomDateMode={isCustomDateMode}
          hideValues={hideValues}
          onOpenOutstandingDetails={() => setIsOutstandingModalOpen(true)}
        />

        <MoneyActivityList
          filteredTransactions={filteredTransactions}
          filters={filters}
          accounts={data.accounts}
          showFilters={showFilters}
          hasActiveFilters={hasActiveFilters}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSetFilters={setFilters}
          onClearFilters={clearFilters}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewAll={() => setIsHistoryModalOpen(true)}
          displayValue={displayValue}
          getCategoryStyles={getCategoryStyles}
        />
      </div>

      <div className="space-y-6">
        <MoneyBreakdownPanel
          pieData={pieData}
          fullBreakdown={fullBreakdown}
          hideValues={hideValues}
          colors={PIE_COLORS}
          onSelectCategory={setSelectedCategory}
          displayValue={displayValue}
        />

        {creditCardAccounts.length > 0 ? (
          <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-4 shadow-xl backdrop-blur-md md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Credit Cards</h3>
                <p className="text-xs text-slate-400">Outstanding shows every unpaid credit-card charge until you settle the bill.</p>
              </div>
            </div>

            <div className="space-y-3">
              {creditCardAccounts.map((account) => {
                const outstanding = creditCardOutstandingMap[account.name] || 0;
                return (
                  <div key={account.name} className="rounded-2xl border border-white/5 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-white">{account.name}</div>
                        <div className="mt-1 text-xs text-slate-500">Outstanding {displayValue(outstanding)}</div>
                      </div>
                      <button
                        onClick={() => setSettlingCard(account)}
                        disabled={outstanding <= 0}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                      >
                        Settle Bill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {isOutstandingModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-800 bg-slate-900/80 p-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                  <CreditCard className="h-4 w-4" />
                  Outstanding
                </div>
                <h2 className="text-2xl font-bold text-white">Unpaid card balances</h2>
                <p className="mt-1 text-sm text-slate-400">All unsettled credit-card charges grouped by card.</p>
              </div>
              <button onClick={() => setIsOutstandingModalOpen(false)} className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid gap-4 border-b border-slate-800 bg-slate-950/30 px-6 py-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Cards with balance</div>
                <div className="mt-1 text-2xl font-bold text-white">{hideValues ? '****' : outstandingCardDetails.length}</div>
              </div>
              <div className="md:border-l md:border-white/5 md:pl-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Total outstanding</div>
                <div className="mt-1 text-2xl font-bold text-cyan-300">{displayValue(monthlyStats.outstanding)}</div>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
              {outstandingCardDetails.length > 0 ? (
                <div className="space-y-4">
                  {outstandingCardDetails.map(({ account, total, transactions }) => (
                    <div key={account.name} className="overflow-hidden rounded-3xl border border-white/5 bg-slate-950/50">
                      <div className="flex flex-col gap-3 border-b border-white/5 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
                        <div>
                          <div className="text-lg font-bold text-white">{account.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{transactions.length} unsettled charge{transactions.length === 1 ? '' : 's'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Amount due</div>
                            <div className="text-lg font-bold text-cyan-300">{displayValue(total)}</div>
                          </div>
                          <button
                            onClick={() => {
                              setIsOutstandingModalOpen(false);
                              setSettlingCard(account);
                            }}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
                          >
                            Settle Bill
                          </button>
                        </div>
                      </div>

                      <div className="divide-y divide-white/5">
                        {transactions.map((tx) => (
                          <div key={tx.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-white">{tx.note || tx.category}</span>
                                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">Unpaid</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">{tx.date} - {tx.category}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-amber-300">- {displayValue(tx.amount)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <CreditCard className="mb-3 h-10 w-10 text-slate-700" />
                  <div className="text-base font-semibold text-slate-300">No unpaid card balances</div>
                  <p className="mt-2 max-w-md text-sm text-slate-500">All credit-card charges are settled right now, so there is nothing outstanding.</p>
                </div>
              )}
            </div>

            <div className="flex justify-center border-t border-slate-800 bg-slate-950 p-6">
              <button onClick={() => setIsOutstandingModalOpen(false)} className="w-full rounded-2xl bg-slate-800 py-3 font-bold text-white transition-all hover:bg-slate-700 active:scale-95">
                Close Details
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedCategory ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-800 bg-slate-900/50 p-6">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <div className={`rounded-xl p-2 ${getCategoryStyles(selectedCategory).color}`}>{getCategoryStyles(selectedCategory).icon}</div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">{selectedCategory}</h2>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {categoryTransactions.length} Items
                  </span>
                </div>
                <p className="ml-11 text-sm text-slate-500">{isCustomDateMode ? 'Selected Range' : monthLabel}</p>
              </div>
              <button onClick={() => setSelectedCategory(null)} className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 border-b border-slate-800 bg-slate-950/30 px-6 py-4">
              <div className="text-center">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Income</div>
                <div className="text-sm font-bold text-emerald-400">{displayValue(categorySummary.income)}</div>
              </div>
              <div className="border-l border-white/5 text-center">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Expense</div>
                <div className="text-sm font-bold text-rose-400">{displayValue(categorySummary.expense)}</div>
              </div>
              <div className="border-l border-white/5 text-center">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Charged</div>
                <div className="text-sm font-bold text-amber-400">{displayValue(categorySummary.charged)}</div>
              </div>
              <div className="border-l border-white/5 text-center">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Net Flow</div>
                <div className={`text-sm font-bold ${categorySummary.net <= 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
                  {categorySummary.net <= 0 ? '-' : ''}
                  {displayValue(Math.abs(categorySummary.net))}
                </div>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto p-4">
              {categoryTransactions.length > 0 ? (
                categoryTransactions.map((tx) => {
                  const badge = getTransactionBadge(tx);
                  return (
                    <div key={tx.id} className="group flex items-center justify-between rounded-2xl border border-transparent p-3.5 transition-all hover:border-white/5 hover:bg-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg bg-slate-800/50 p-2 ${tx.type === 'Income' ? 'text-emerald-400' : isUnsettledCardCharge(tx) ? 'text-amber-400' : 'text-rose-400'}`}>
                          {tx.type === 'Income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{tx.note || tx.category}</span>
                            {badge ? <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.className}`}>{badge.label}</span> : null}
                          </div>
                          <span className="text-xs text-slate-500">{tx.date} - {tx.fromAccount || tx.toAccount}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-bold ${tx.type === 'Income' ? 'text-emerald-400' : isUnsettledCardCharge(tx) ? 'text-amber-300' : 'text-slate-100'}`}>
                            {tx.type === 'Income' ? '+' : '-'} {displayValue(tx.amount, 'RM ')}
                          </span>
                          <span className="text-[10px] font-medium uppercase text-slate-600">{badge?.label || tx.type}</span>
                        </div>
                        <div className="flex translate-x-1 gap-1 opacity-0 transition-opacity group-hover:translate-x-0 group-hover:opacity-100">
                          <button onClick={() => { setSelectedCategory(null); handleEdit(tx); }} className="rounded-lg bg-slate-800/50 p-2 text-slate-500 hover:bg-slate-800 hover:text-indigo-400">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(tx)} className="rounded-lg bg-slate-800/50 p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center py-12 text-center text-slate-500">
                  <Calendar className="mb-2 h-10 w-10 text-slate-800" />
                  No transactions found for this category.
                </div>
              )}
            </div>

            <div className="flex justify-center border-t border-slate-800 bg-slate-950 p-6">
              <button onClick={() => setSelectedCategory(null)} className="w-full rounded-2xl bg-slate-800 py-3 font-bold text-white transition-all hover:bg-slate-700 active:scale-95">
                Close Details
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isHistoryModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-6">
              <div>
                <h2 className="text-xl font-bold text-white">Full Transaction List</h2>
                <p className="text-sm text-slate-500">{isCustomDateMode ? 'Custom Range' : monthLabel}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {filteredTransactions.map((tx) => {
                const badge = getTransactionBadge(tx);
                return (
                  <div key={tx.id} className="group flex items-center justify-between rounded-xl border border-transparent p-3 hover:border-white/5 hover:bg-white/5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{tx.category}</span>
                        {badge ? <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.className}`}>{badge.label}</span> : null}
                      </div>
                      <span className="text-xs text-slate-500">{tx.date} - {tx.note}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className={`font-bold ${tx.type === 'Income' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-blue-400' : isUnsettledCardCharge(tx) ? 'text-amber-300' : 'text-slate-200'}`}>
                        {tx.type === 'Income' ? '+' : tx.type === 'Transfer' ? '' : '-'} {displayValue(tx.amount, 'RM ')}
                      </span>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => { setIsHistoryModalOpen(false); handleEdit(tx); }} className="p-2 text-slate-500 hover:text-indigo-400">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(tx)} className="p-2 text-slate-500 hover:text-rose-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <AddMoneyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onRefresh}
        accounts={data.accounts}
        initialData={editingTransaction}
        incomeCategories={data.incomeCategories || []}
        expenseCategories={data.expenseCategories || []}
      />

      <SettleCreditCardModal
        isOpen={Boolean(settlingCard)}
        cardAccount={settlingCard}
        accounts={data.accounts}
        onClose={() => setSettlingCard(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
