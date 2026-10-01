'use client';

import React, { useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CreditCardSettlementScope } from '../../types';

interface MoneyStatsRowProps {
  income: number;
  expense: number;
  outstanding: number;
  statement: number;
  balance: number;
  isCustomDateMode: boolean;
  hideValues?: boolean;
  onOpenOutstandingDetails?: () => void;
  creditCardView: CreditCardSettlementScope;
  onChangeCreditCardView: (scope: CreditCardSettlementScope) => void;
}

export const MoneyStatsRow: React.FC<MoneyStatsRowProps> = ({
  income, expense, outstanding, statement, balance, isCustomDateMode, hideValues,
  onOpenOutstandingDetails, creditCardView, onChangeCreditCardView,
}) => {
  const touchStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const currency = (value: number) => hideValues ? 'RM ****'
    : `RM ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="workspace-metrics">
      {[
        { label: 'Income', value: income, color: 'overview-positive' },
        { label: 'Expenses', value: expense, color: 'overview-negative' },
        { label: 'Net', value: balance, color: balance >= 0 ? 'overview-positive' : 'overview-negative' },
      ].map((metric) => (
        <div className="workspace-metric" key={metric.label}>
          <p className="workspace-metric-label">{metric.label}</p>
          <div className={`workspace-metric-value ${metric.color}`}>{currency(metric.value)}</div>
          <p className="workspace-metric-note">{isCustomDateMode ? 'Selected dates' : 'Selected month'}</p>
        </div>
      ))}
      <div className="workspace-metric"
        onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null; swiped.current = false; }}
        onTouchEnd={(event) => {
          const delta = (event.changedTouches[0]?.clientX ?? 0) - (touchStart.current ?? 0);
          if (touchStart.current !== null && Math.abs(delta) >= 40) {
            swiped.current = true;
            onChangeCreditCardView(delta < 0 ? 'statement' : 'outstanding');
          }
          touchStart.current = null;
        }}>
        <button type="button" className="money-card-value focus-ring"
          aria-label={creditCardView === 'statement' ? 'View statement' : 'View cards'}
          onClick={() => { if (swiped.current) { swiped.current = false; return; } onOpenOutstandingDetails?.(); }}>
          <span className="workspace-metric-label">{creditCardView === 'statement' ? 'Statement' : 'Outstanding'} <ArrowUpRight size={14} /></span>
          <span className="workspace-metric-value overview-negative">{currency(creditCardView === 'statement' ? statement : outstanding)}</span>
        </button>
        <div className="money-card-scope" role="group" aria-label="Card balance scope">
          {(['outstanding', 'statement'] as const).map((scope) => <button
            key={scope} type="button" aria-label={`Show ${scope}`} aria-pressed={creditCardView === scope}
            onClick={() => onChangeCreditCardView(scope)}
          >{scope === 'statement' ? 'Statement' : 'Outstanding'}</button>)}
        </div>
      </div>
    </div>
  );
};
