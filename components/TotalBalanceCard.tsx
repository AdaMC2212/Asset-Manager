'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Eye, EyeOff, X } from 'lucide-react';
import { MoneyAccount } from '../types';
import { ModalPortal } from './ui/ModalPortal';
import { AccountList } from './MoneyManager/AccountList';

interface TotalBalanceCardProps {
  totalBalance: number;
  accounts: MoneyAccount[];
  hideValues: boolean;
  onTogglePrivacy: () => void;
  syncFailed?: boolean;
}

export const TotalBalanceCard: React.FC<TotalBalanceCardProps> = ({ totalBalance, accounts, hideValues, onTogglePrivacy, syncFailed = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  useEffect(() => {
    if (!isModalOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsModalOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isModalOpen]);

  return (
    <>
      <section className="money-balance">
        <button type="button" className="text-left focus-ring" onClick={() => setIsModalOpen(true)}>
          <span className="workspace-metric-label">Total Balance <ArrowUpRight size={14} /></span>
          <span className="workspace-metric-value">{hideValues ? 'RM ****' : `RM ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
        </button>
        <div className="money-balance-actions">
          <span>{accounts.length} accounts / MYR</span>
          {syncFailed ? <span role="status" className="overview-negative">Sync incomplete</span> : null}
          <button type="button" onClick={onTogglePrivacy} title={hideValues ? 'Show money balances' : 'Hide money balances'}
            aria-label={hideValues ? 'Show money balances' : 'Hide money balances'} className="workspace-icon-button focus-ring">
            {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </section>
      {isModalOpen ? <ModalPortal>
        <div role="dialog" aria-modal="true" aria-label="Wallet Snapshot" className="dialog-overlay z-[110] bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="panel-elevated w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-4">
              <h2>Wallet Snapshot</h2>
              <button type="button" aria-label="Close wallet snapshot" onClick={() => setIsModalOpen(false)} className="workspace-icon-button"><X size={20} /></button>
            </div>
            <div className="px-6 pb-6"><AccountList accounts={accounts} hideValues={hideValues} /></div>
          </div>
        </div>
      </ModalPortal> : null}
    </>
  );
};
