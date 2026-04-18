'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Repeat, X } from 'lucide-react';
import { addAutoDebitRule, updateAutoDebitRule } from '../../app/actions';
import { MoneyAccount, RecurringDebitRule } from '../../types';

interface AutoDebitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: MoneyAccount[];
  expenseCategories: string[];
  initialRule?: RecurringDebitRule | null;
}

export const AutoDebitModal: React.FC<AutoDebitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  expenseCategories,
  initialRule
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<RecurringDebitRule>>({
    name: '',
    amount: 0,
    category: '',
    fromAccount: '',
    dayOfMonth: new Date().getDate(),
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    isActive: true,
  });

  const validAccounts = useMemo(
    () =>
      accounts.filter((account) => {
        const category = (account.category || '').toLowerCase();
        return ['bank', 'wallet', 'cash', 'debit card', 'credit card'].includes(category);
      }),
    [accounts]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (initialRule) {
      setFormData(initialRule);
      return;
    }

    setFormData({
      name: '',
      amount: 0,
      category: expenseCategories[0] || '',
      fromAccount: validAccounts[0]?.name || '',
      dayOfMonth: new Date().getDate(),
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      notes: '',
      isActive: true,
    });
  }, [expenseCategories, initialRule, isOpen, validAccounts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name || !formData.amount || !formData.category || !formData.fromAccount || !formData.startDate || !formData.dayOfMonth) {
      return;
    }

    const payload: RecurringDebitRule = {
      id: initialRule?.id || '',
      rowIndex: initialRule?.rowIndex,
      name: formData.name.trim(),
      amount: Number(formData.amount),
      category: formData.category,
      fromAccount: formData.fromAccount,
      toAccount: '',
      scheduleType: 'Monthly',
      dayOfMonth: Number(formData.dayOfMonth),
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      isActive: formData.isActive ?? true,
      lastProcessedOccurrence: initialRule?.lastProcessedOccurrence,
      notes: formData.notes?.trim() || '',
      createdAt: initialRule?.createdAt,
      updatedAt: initialRule?.updatedAt,
    };

    setIsSubmitting(true);
    try {
      const result = initialRule?.rowIndex
        ? await updateAutoDebitRule(initialRule.rowIndex, payload)
        : await addAutoDebitRule(payload);

      if (!result.success) {
        alert(result.error || 'Failed to save auto-debit rule.');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to save auto-debit rule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel-elevated w-full max-w-2xl rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              <Repeat className="h-4 w-4" />
              Monthly Auto-Debit
            </div>
            <h2 className="text-xl font-bold text-white">{initialRule ? 'Edit Auto-Debit Rule' : 'Add Auto-Debit Rule'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Name</label>
              <input
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                value={formData.name || ''}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Amount (RM)</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                value={formData.amount || ''}
                onChange={(event) => setFormData({ ...formData, amount: parseFloat(event.target.value) })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Category</label>
              <select
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                value={formData.category || ''}
                onChange={(event) => setFormData({ ...formData, category: event.target.value })}
              >
                <option value="">Select category</option>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Pay With</label>
              <select
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                value={formData.fromAccount || ''}
                onChange={(event) => setFormData({ ...formData, fromAccount: event.target.value })}
              >
                <option value="">Select account</option>
                {validAccounts.map((account) => (
                  <option key={account.name} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Start Date</label>
              <input
                type="date"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                value={formData.startDate || ''}
                onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Day of Month</label>
              <input
                type="number"
                min={1}
                max={31}
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                value={formData.dayOfMonth || ''}
                onChange={(event) => setFormData({ ...formData, dayOfMonth: parseInt(event.target.value, 10) || 1 })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">End Date (Optional)</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                value={formData.endDate || ''}
                onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(formData.isActive)}
                  onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })}
                />
                Active
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Notes (Optional)</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              value={formData.notes || ''}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
            />
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            This will create one transaction each month on the selected calendar day. Credit card rules will go to outstanding first; other accounts count as expenses immediately.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : initialRule ? 'Save Rule' : 'Create Rule'}
          </button>
        </form>
      </div>
    </div>
  );
};
