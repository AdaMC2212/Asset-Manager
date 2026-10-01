'use client';

import React from 'react';
import { Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { deleteAutoDebitRule, toggleAutoDebitRule } from '../../app/actions';
import { RecurringDebitRule } from '../../types';
import { localISODate } from '../../lib/dates';
import { useReadOnly } from '../WorkspaceMode';

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
  if (!rule.isActive) return '';
  const today = new Date();
  const startDate = new Date(`${[rule.startDate, rule.scheduleEffectiveFrom || ''].sort().pop()}T12:00:00`);
  const cursor = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);

  for (let i = 0; i < 24; i++) {
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const dueDate = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(rule.dayOfMonth, lastDay), 12, 0, 0);
    const due = localISODate(dueDate);
    if (rule.endDate && due > rule.endDate) return '';
    if (rule.lastProcessedOccurrence && due.slice(0, 7) <= rule.lastProcessedOccurrence.slice(0, 7)) {
      cursor.setMonth(cursor.getMonth() + 1);
      continue;
    }
    if (dueDate >= startDate && due >= localISODate(today)) {
      return due;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return '';
};

export const AutoDebitPanel: React.FC<AutoDebitPanelProps> = ({ rules, hideValues, onAdd, onEdit, onRefresh }) => {
  const readOnly = useReadOnly();
  const sortedRules = [...rules].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));

  const handleToggle = async (rule: RecurringDebitRule) => {
    if (readOnly || !rule.rowIndex) return;
    const result = await toggleAutoDebitRule(rule.rowIndex, !rule.isActive, readOnly);
    if (!result.success) {
      alert(result.error || 'Failed to update auto-debit rule.');
      return;
    }
    onRefresh();
  };

  const handleDelete = async (rule: RecurringDebitRule) => {
    if (readOnly || !rule.rowIndex) return;
    if (!confirm(`Delete auto-debit rule "${rule.name}"?`)) return;

    const result = await deleteAutoDebitRule(rule.rowIndex, readOnly);
    if (!result.success) {
      alert(result.error || 'Failed to delete auto-debit rule.');
      return;
    }
    onRefresh();
  };

  return (
    <section className="workspace-section">
      <div className="workspace-section-heading">
        <div className="flex items-center gap-3">
          <Repeat className="h-4 w-4 text-cyan-300" />
          <div>
            <h3>Auto-Debits</h3>
          </div>
        </div>

        <button disabled={readOnly} title={readOnly ? 'Demo is read-only' : 'Add rule'} onClick={onAdd} className="workspace-secondary-button">
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      <div>
        {sortedRules.length === 0 ? (
          <div className="workspace-empty">
            No auto-debit rules yet.
          </div>
        ) : (
          sortedRules.map((rule) => (
            <div key={rule.id} className="workspace-recurring-row">
              <div className="flex flex-col gap-3">
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

                <div className="workspace-recurring-actions">
                  <div className="mr-1 text-sm font-bold text-cyan-300">{displayValue(rule.amount, hideValues)}</div>
                  <button aria-label={`Edit ${rule.name}`} disabled={readOnly} title={readOnly ? 'Demo is read-only' : 'Edit rule'} onClick={() => onEdit(rule)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-indigo-400">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button aria-label={`${rule.isActive ? 'Pause' : 'Resume'} ${rule.name}`} disabled={readOnly} title={readOnly ? 'Demo is read-only' : rule.isActive ? 'Pause rule' : 'Resume rule'} onClick={() => handleToggle(rule)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-emerald-400">
                    {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button aria-label={`Delete ${rule.name}`} disabled={readOnly} title={readOnly ? 'Demo is read-only' : 'Delete rule'} onClick={() => handleDelete(rule)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
