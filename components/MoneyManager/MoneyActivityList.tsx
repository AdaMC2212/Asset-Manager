'use client';

import React from 'react';
import { Calendar, Filter, Pencil, Trash2, XCircle } from 'lucide-react';
import { MoneyAccount, MoneyTransaction } from '../../types';
import { useReadOnly } from '../WorkspaceMode';
import { isSettlementLocked } from '../../lib/money';

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
  getTransactionDisplay: (tx: MoneyTransaction) => { colorClass: string; prefix: string; label: string };
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
  getTransactionDisplay,
}) => {
  const readOnly = useReadOnly();
  return (
    <section className="workspace-section">
      <div className="workspace-section-heading">
        <div className="flex items-center gap-2 md:gap-3">
          <h3>Activity</h3>
          <span className="rounded-full bg-slate-800/50 px-2 py-0.5 text-[10px] font-medium text-slate-500 md:px-3 md:py-1 md:text-xs">
            {filteredTransactions.length}
          </span>
        </div>

        <button
          onClick={onToggleFilters}
          aria-label="Filter transactions"
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
        <div className="mb-4 space-y-3 border-b border-[var(--border-soft)] pb-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Filter Options</h4>
            {hasActiveFilters ? (
              <button onClick={onClearFilters} className="flex items-center gap-1 text-xs text-rose-400 hover:underline">
                <XCircle className="h-3 w-3" /> Clear All
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  aria-label="Start date"
                  className="min-w-0 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  value={filters.startDate}
                  onChange={(event) => onSetFilters({ ...filters, startDate: event.target.value })}
                />
                <span className="self-center text-slate-600">-</span>
                <input
                  type="date"
                  aria-label="End date"
                  className="min-w-0 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
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
                aria-label="Account filter"
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

      <div>
        {filteredTransactions.slice(0, 10).map((tx) => {
          const style = getCategoryStyles(tx.category);
          const txDisplay = getTransactionDisplay(tx);
          const badges = [
            tx.isAutoGenerated ? { label: 'Auto', className: 'bg-cyan-500/10 text-cyan-300' } : null,
            tx.type === 'Transfer' && tx.category === 'Credit Card Settlement'
              ? { label: 'Payment', className: 'bg-cyan-500/10 text-cyan-300' }
              : null,
            tx.isCardCharge && tx.settlementStatus === 'Settled'
              ? { label: 'Settled', className: 'bg-emerald-500/10 text-emerald-300' }
              : tx.isCardCharge
                ? { label: 'Charged', className: 'bg-amber-500/10 text-amber-300' }
                : null
          ].filter(Boolean) as Array<{ label: string; className: string }>;
          return (
            <div
              key={tx.id}
              className="workspace-activity-row group flex items-center justify-between gap-2 py-3 hover:bg-white/[0.02]"
            >
              <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
                <div className="workspace-mark-small">
                  {style.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                    <div className="truncate pr-1 text-sm font-bold text-white">{tx.category}</div>
                    {badges.map((badge) => <span key={badge.label} className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.className}`}>{badge.label}</span>)}
                  </div>
                  <div className="mt-0.5 max-w-[140px] truncate text-[10px] text-slate-400 md:max-w-[200px] md:text-xs">
                    {tx.date} - {tx.note || 'No note'}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1 text-right md:flex-row md:items-center md:gap-4">
                <div>
                  <div className={`max-w-[150px] break-words text-sm font-bold md:max-w-none ${txDisplay.colorClass}`}>
                    {txDisplay.prefix} {displayValue(tx.amount, 'RM ')}
                  </div>
                  <div className="max-w-[92px] truncate text-[10px] font-medium uppercase tracking-wide text-slate-500 md:max-w-none">
                    {txDisplay.label} • {tx.fromAccount} {tx.toAccount ? '->' : ''}
                  </div>
                </div>

                <div className="flex gap-1">
                  <button aria-label="Edit transaction" disabled={readOnly || isSettlementLocked(tx)} title={readOnly ? 'Demo is read-only' : isSettlementLocked(tx) ? 'Settlement record is protected' : 'Edit transaction'} onClick={() => onEdit(tx)} className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-indigo-400 disabled:opacity-40">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button aria-label="Delete transaction" disabled={readOnly || isSettlementLocked(tx)} title={readOnly ? 'Demo is read-only' : isSettlementLocked(tx) ? 'Settlement record is protected' : 'Delete transaction'} onClick={() => onDelete(tx)} className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-rose-400 disabled:opacity-40">
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

      {filteredTransactions.length > 0 && (
        <div className="mt-6 text-center">
          <button onClick={onViewAll} className="w-full rounded-xl py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-white/5 hover:text-indigo-300">
            View All {filteredTransactions.length} Records
          </button>
        </div>
      )}
    </section>
  );
};
