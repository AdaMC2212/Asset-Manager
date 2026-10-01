import React from 'react';
import { MoneyAccount } from '../../types';

export function AccountList({ accounts, hideValues }: { accounts: MoneyAccount[]; hideValues?: boolean }) {
  return (
    <div>
      {accounts.map((account) => (
        <div className="workspace-account-row" key={account.name}>
          <span className="workspace-mark-small">
            {account.logoUrl ? <img src={account.logoUrl} alt="" /> : account.name.slice(0, 2).toUpperCase()}
          </span>
          <div><strong>{account.name}</strong><small>{account.category}</small></div>
          <strong className={account.currentBalance < 0 ? 'overview-negative' : ''}>
            {hideValues ? 'RM ****' : `RM ${account.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </strong>
        </div>
      ))}
      {!accounts.length ? <p className="workspace-empty">No accounts available.</p> : null}
    </div>
  );
}
