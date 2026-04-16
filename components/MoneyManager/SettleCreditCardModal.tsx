'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { MoneyAccount } from '../../types';
import { settleCreditCardBill } from '../../app/actions';

interface SettleCreditCardModalProps {
  isOpen: boolean;
  cardAccount: MoneyAccount | null;
  accounts: MoneyAccount[];
  onClose: () => void;
  onSuccess: () => void;
}

export const SettleCreditCardModal: React.FC<SettleCreditCardModalProps> = ({
  isOpen,
  cardAccount,
  accounts,
  onClose,
  onSuccess
}) => {
  const [payingAccount, setPayingAccount] = useState('');
  const [settledAt, setSettledAt] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payingAccounts = useMemo(
    () => accounts.filter((account) => ['bank', 'wallet', 'cash', 'debit card'].includes((account.category || '').toLowerCase())),
    [accounts]
  );

  useEffect(() => {
    if (!isOpen) return;
    setSettledAt(new Date().toISOString().split('T')[0]);
    setPayingAccount((prev) => prev || payingAccounts[0]?.name || '');
  }, [isOpen, payingAccounts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cardAccount) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payingAccount || !settledAt) return;

    setIsSubmitting(true);
    try {
      const result = await settleCreditCardBill(cardAccount.name, payingAccount, settledAt);
      if (!result.success) {
        alert(result.error || 'Failed to settle credit card bill.');
        return;
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to settle credit card bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel-elevated w-full max-w-lg rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <div>
            <h2 className="text-xl font-bold text-white">Settle Credit Card Bill</h2>
            <p className="mt-1 text-sm text-slate-400">Have you settled the credit card bill for {cardAccount.name}?</p>
          </div>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Settled On</label>
            <input
              type="date"
              required
              value={settledAt}
              onChange={(event) => setSettledAt(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Paid From</label>
            <select
              required
              value={payingAccount}
              onChange={(event) => setPayingAccount(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="">Select paying account</option>
              {payingAccounts.map((account) => (
                <option key={account.name} value={account.name}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            This will mark all unpaid charges on {cardAccount.name} as settled and create one transfer row from the selected paying account.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Settlement'}
          </button>
        </form>
      </div>
    </div>
  );
};
