'use client';

import React, { useEffect, useState } from 'react';
import { Banknote, CreditCard, Eye, EyeOff, Smartphone, Wallet, X } from 'lucide-react';
import { MoneyAccount } from '../types';
import { CountUp } from './ui/CountUp';

interface TotalBalanceCardProps {
  totalBalance: number;
  accounts: MoneyAccount[];
  hideValues: boolean;
  onTogglePrivacy: () => void;
}

export const TotalBalanceCard: React.FC<TotalBalanceCardProps> = ({ totalBalance, accounts, hideValues, onTogglePrivacy }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const activeAccounts = accounts.filter((account) => account.currentBalance !== 0);

  const displayValue = (value: number) =>
    hideValues ? 'RM ****' : `RM ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isModalOpen]);

  const getAccountIcon = (category: string) => {
    const normalized = category.toLowerCase();
    if (normalized.includes('bank')) return <Smartphone className="h-5 w-5 text-indigo-200" />;
    if (normalized.includes('wallet') || normalized.includes('pay')) return <Smartphone className="h-5 w-5 text-blue-200" />;
    if (normalized.includes('card')) return <CreditCard className="h-5 w-5 text-emerald-200" />;
    if (normalized.includes('cash')) return <Banknote className="h-5 w-5 text-amber-200" />;
    return <Wallet className="h-5 w-5 text-slate-200" />;
  };

  return (
    <>
      <section
        onClick={() => setIsModalOpen(true)}
        className="panel-elevated relative mb-2 cursor-pointer overflow-hidden rounded-3xl p-6 transition hover:-translate-y-0.5 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[var(--accent-primary)]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-14 h-44 w-44 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-black/25 px-3 py-1">
              <Wallet className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Total Balance</span>
            </div>

            <h2 className="font-display text-3xl text-[var(--text-primary)] sm:text-4xl md:text-5xl">
              {hideValues ? 'RM *******' : <CountUp end={totalBalance} prefix="RM " />}
            </h2>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {activeAccounts.slice(0, 4).map((account) => (
                  <div
                    key={account.name}
                    className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bg-elevated)] bg-black/30 text-[10px] font-bold text-[var(--text-secondary)]"
                    title={account.name}
                  >
                    {account.name.charAt(0)}
                  </div>
                ))}
                {activeAccounts.length > 4 ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--bg-elevated)] bg-black/30 text-[10px] font-bold text-[var(--text-secondary)]">
                    +{activeAccounts.length - 4}
                  </div>
                ) : null}
              </div>
              <span className="text-sm text-[var(--text-secondary)]">{activeAccounts.length} active accounts</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTogglePrivacy();
              }}
              className="focus-ring rounded-xl border border-[var(--border-soft)] bg-black/20 p-3 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              {hideValues ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 md:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Synced
            </div>
          </div>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="panel-elevated w-full max-w-lg overflow-hidden rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-5">
              <h3 className="font-display text-2xl text-[var(--text-primary)]">Wallet Snapshot</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="focus-ring rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[58vh] space-y-3 overflow-y-auto p-5">
              {activeAccounts.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border-soft)] bg-black/20 p-8 text-center text-sm text-[var(--text-muted)]">
                  No active accounts found.
                </div>
              ) : (
                activeAccounts.map((account) => (
                  <div key={account.name} className="flex items-center justify-between rounded-2xl border border-[var(--border-soft)] bg-black/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white/5 p-2">{account.logoUrl ? <img src={account.logoUrl} className="h-6 w-6 object-contain" /> : getAccountIcon(account.category)}</div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{account.name}</p>
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">{account.category}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${account.currentBalance < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {displayValue(account.currentBalance)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-soft)] bg-black/20 px-6 py-4">
              <span className="text-sm text-[var(--text-secondary)]">Net Total</span>
              <span className="font-display text-xl text-[var(--text-primary)]">{displayValue(totalBalance)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
