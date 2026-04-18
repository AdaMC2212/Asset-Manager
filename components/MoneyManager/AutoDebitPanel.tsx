'use client';

import React from 'react';
import { Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { deleteAutoDebitRule, toggleAutoDebitRule } from '../../app/actions';
import { RecurringDebitRule } from '../../types';

interface AutoDebitPanelProps {
  rules: RecurringDebitRule[];
  hideValues?: boolean;
  onAdd: () => void;
  onEdit: (rule: RecurringDebitRule) => void;
  onRefresh: () => void;
}

const displayValue = (value: number, hideValues?: boolean) =>
  hideValues ? 'RM ****' : `RM ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getNextDueDate = (rule: RecurringDebitRule) => {
  const today = new Date();
  const startDate = new Date(rule.startDate);
  const cursor = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);

  for (let i = 0; i < 24; i++) {
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const dueDate = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(rule.dayOfMonth, lastDay), 12, 0, 0);
    if (dueDate >= startDate && dueDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)) {
      return dueDate.toISOString().split('T')[0];
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return '';
};

export const AutoDebitPanel: React.FC<AutoDebitPanelProps> = ({ rules, hideValues, onAdd, onEdit, onRefresh }) => {
  const sortedRules = [...rules].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));

  const handleToggle = async (rule: RecurringDebitRule) => {
    if (!rule.rowIndex) return;
    const result = await toggleAutoDebitRule(rule.rowIndex, !rule.isActive);
    if (!result.success) {
      alert(result.error || 'Failed to update auto-debit rule.');
      return;
    }
    onRefresh();
  };

  const handleDelete = async (rule: RecurringDebitRule) => {
    if (!rule.rowIndex) return;
    if (!confirm(`Delete auto-debit rule "${rule.name}"?`)) return;

    const result = await deleteAutoDebitRule(rule.rowIndex);
    if (!result.success) {
      alert(result.error || 'Failed to delete auto-debit rule.');
      return;
    }
    onRefresh();
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-4 shadow-xl backdrop-blur-md md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
            <Repeat className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Auto-Debits</h3>
            <p className="text-xs text-slate-400">Monthly rules that auto-post when the due date arrives.</p>
          </div>
        </div>

        <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-500">
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      <div className="space-y-3">
        {sortedRules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-center text-sm text-slate-500">
            No auto-debit rules yet.
          </div>
        ) : (
          sortedRules.map((rule) => (
            <div key={rule.id} className="rounded-2xl border border-white/5 bg-slate-950/50 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-bold text-white">{rule.name}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${rule.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                      {rule.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {rule.fromAccount} - {rule.category} - Every month on day {rule.dayOfMonth}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <span>Next due {getNextDueDate(rule) || 'N/A'}</span>
                    <span>Last posted {rule.lastProcessedOccurrence || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="mr-1 text-sm font-bold text-cyan-300">{displayValue(rule.amount, hideValues)}</div>
                  <button onClick={() => onEdit(rule)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-indigo-400">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleToggle(rule)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-emerald-400">
                    {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(rule)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
