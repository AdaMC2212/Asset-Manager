'use client';

import React from 'react';
import { Calendar, Filter, Pencil, Trash2, XCircle } from 'lucide-react';
import { MoneyAccount, MoneyTransaction } from '../../types';

export interface MoneyFilters {
  type: string;
  account: string;
  startDate: string;
  endDate: string;
}

interface CategoryStyle {
  icon: React.ReactNode;
  color: string;
  text: string;
}

interface MoneyActivityListProps {
  filteredTransactions: MoneyTransaction[];
  filters: MoneyFilters;
  accounts: MoneyAccount[];
  showFilters: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
  onSetFilters: (filters: MoneyFilters) => void;
  onClearFilters: () => void;
  onEdit: (tx: MoneyTransaction) => void;
  onDelete: (tx: MoneyTransaction) => void;
  onViewAll: () => void;
  displayValue: (value: number, prefix?: string) => string;
  getCategoryStyles: (category: string) => CategoryStyle;
}

export const MoneyActivityList: React.FC<MoneyActivityListProps> = ({
  filteredTransactions,
  filters,
  accounts,
  showFilters,
  hasActiveFilters,
  onToggleFilters,
  onSetFilters,
  onClearFilters,
  onEdit,
  onDelete,
  onViewAll,
  displayValue,
  getCategoryStyles,
}) => {
  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-4 shadow-xl backdrop-blur-md md:p-6">
      <div className="mb-4 flex items-center justify-between px-1 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <h3 className="text-lg font-bold text-white md:text-xl">Activity</h3>
          <span className="rounded-full bg-slate-800/50 px-2 py-0.5 text-[10px] font-medium text-slate-500 md:px-3 md:py-1 md:text-xs">
            {filteredTransactions.length}
          </span>
        </div>

        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 rounded-xl p-2 text-xs font-medium transition-all md:text-sm ${
            showFilters || hasActiveFilters ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden md:inline">Filters</span>
          {hasActiveFilters ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white md:h-2 md:w-2" /> : null}
        </button>
      </div>

      {(showFilters || hasActiveFilters) && (
        <div className="animate-in slide-in-from-top-2 fade-in mb-6 space-y-4 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Filter Options</h4>
            {hasActiveFilters ? (
              <button onClick={onClearFilters} className="flex items-center gap-1 text-xs text-rose-400 hover:underline">
                <XCircle className="h-3 w-3" /> Clear All
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  value={filters.startDate}
                  onChange={(event) => onSetFilters({ ...filters, startDate: event.target.value })}
                />
                <span className="self-center text-slate-600">-</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  value={filters.endDate}
                  onChange={(event) => onSetFilters({ ...filters, endDate: event.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-slate-400">Transaction Type</label>
              <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
                {['All', 'Expense', 'Income', 'Transfer'].map((type) => (
                  <button
                    key={type}
                    onClick={() => onSetFilters({ ...filters, type })}
                    className={`flex-1 rounded-md py-1.5 text-[10px] font-bold transition-all ${
                      filters.type === type ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-slate-400">Account</label>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                value={filters.account}
                onChange={(event) => onSetFilters({ ...filters, account: event.target.value })}
              >
                <option value="All">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.name} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 md:space-y-3">
        {filteredTransactions.slice(0, 10).map((tx) => {
          const style = getCategoryStyles(tx.category);
          const cardBadge =
            tx.isCardCharge && tx.settlementStatus === 'Settled'
              ? { label: 'Settled', className: 'bg-emerald-500/10 text-emerald-300' }
              : tx.isCardCharge
                ? { label: 'Charged', className: 'bg-amber-500/10 text-amber-300' }
                : null;
          return (
            <div
              key={tx.id}
              className="group flex items-center justify-between rounded-2xl border border-transparent p-2 transition-all hover:border-white/5 hover:bg-white/5 md:p-3"
            >
              <div className="flex items-center gap-3 md:gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg shadow-black/20 md:h-12 md:w-12 md:rounded-2xl ${style.color} ${style.text}`}>
                  {style.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate pr-2 text-sm font-bold text-white">{tx.category}</div>
                    {cardBadge ? <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cardBadge.className}`}>{cardBadge.label}</span> : null}
                  </div>
                  <div className="mt-0.5 max-w-[120px] truncate text-[10px] text-slate-400 md:max-w-[200px] md:text-xs">
                    {tx.date} - {tx.note || 'No note'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className={`text-sm font-bold ${tx.type === 'Income' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-blue-400' : 'text-white'}`}>
                    {tx.type === 'Income' ? '+' : tx.type === 'Transfer' ? '' : '-'} {displayValue(tx.amount, 'RM ')}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {tx.fromAccount} {tx.toAccount ? '->' : ''}
                  </div>
                </div>

                <div className="hidden translate-x-2 gap-1 opacity-0 transition-opacity group-hover:translate-x-0 group-hover:opacity-100 md:flex">
                  <button onClick={() => onEdit(tx)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-indigo-400">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(tx)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center text-slate-500">
            <Calendar className="mb-2 h-12 w-12 text-slate-800" />
            No transactions found for this period.
          </div>
        )}
      </div>

      {filteredTransactions.length > 10 && (
        <div className="mt-6 text-center">
          <button onClick={onViewAll} className="w-full rounded-xl py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-white/5 hover:text-indigo-300">
            View All {filteredTransactions.length} Records
          </button>
        </div>
      )}
    </div>
  );
};
