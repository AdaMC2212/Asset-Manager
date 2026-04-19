'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { CreditCardSettlementScope, MoneyAccount } from '../../types';
import { settleCreditCardBill } from '../../app/actions';

interface SettleCreditCardModalProps {
  isOpen: boolean;
  cardAccount: MoneyAccount | null;
  accounts: MoneyAccount[];
  initialScope: CreditCardSettlementScope;
  statementAmount: number;
  outstandingAmount: number;
  cycleLabel?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const SettleCreditCardModal: React.FC<SettleCreditCardModalProps> = ({
  isOpen,
  cardAccount,
  accounts,
  initialScope,
  statementAmount,
  outstandingAmount,
  cycleLabel,
  onClose,
  onSuccess
}) => {
  const [payingAccount, setPayingAccount] = useState('');
  const [settledAt, setSettledAt] = useState(new Date().toISOString().split('T')[0]);
  const [settlementScope, setSettlementScope] = useState<CreditCardSettlementScope>(initialScope);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payingAccounts = useMemo(
    () => accounts.filter((account) => ['bank', 'wallet', 'cash', 'debit card'].includes((account.category || '').toLowerCase())),
    [accounts]
  );

  useEffect(() => {
    if (!isOpen) return;
    setSettledAt(new Date().toISOString().split('T')[0]);
    setPayingAccount((prev) => prev || payingAccounts[0]?.name || '');
    setSettlementScope(initialScope);
  }, [initialScope, isOpen, payingAccounts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cardAccount) return null;
  const selectedAmount = settlementScope === 'statement' ? statementAmount : outstandingAmount;
  const isDisabled = isSubmitting || selectedAmount <= 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payingAccount || !settledAt || selectedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const result = await settleCreditCardBill(cardAccount.name, payingAccount, settledAt, settlementScope);
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
            <p className="mt-1 text-sm text-slate-400">Choose whether to pay the current statement or the full outstanding balance for {cardAccount.name}.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">Settlement Type</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['statement', 'Statement balance', statementAmount],
                ['outstanding', 'Outstanding balance', outstandingAmount],
              ] as const).map(([scope, label, amount]) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setSettlementScope(scope)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    settlementScope === scope
                      ? 'border-cyan-400/50 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    RM {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </button>
              ))}
            </div>
            {settlementScope === 'statement' && cycleLabel ? <div className="mt-2 text-xs text-slate-500">Current statement cycle: {cycleLabel}</div> : null}
          </div>

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
            This will mark {settlementScope === 'statement' ? 'the current statement charges' : 'all unpaid charges'} on {cardAccount.name} as settled and create one transfer row from the selected paying account for RM {selectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
          </div>

          <button
            type="submit"
            disabled={isDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : selectedAmount <= 0 ? 'No Balance To Settle' : 'Confirm Settlement'}
          </button>
        </form>
      </div>
    </div>
  );
};
