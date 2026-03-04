import React, { useMemo, useState } from 'react';
import { Banknote, Landmark, Plus, TrendingUp } from 'lucide-react';
import { CashFlowSummary, PortfolioSummary } from '../types';
import { AddFundingModal } from './FundingStats/AddFundingModal';

interface FundingStatsProps {
  cashFlow: CashFlowSummary | null;
  portfolio: PortfolioSummary | null;
  hideValues?: boolean;
  onRefresh?: () => void;
}

const displayValue = (value: number, prefix: string, hide?: boolean) =>
  hide ? `${prefix} ****` : `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const FundingStats: React.FC<FundingStatsProps> = ({ cashFlow, portfolio, hideValues, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const metrics = useMemo(() => {
    const availableCash = portfolio?.cashBalance || 0;
    const totalAccountValue = portfolio?.netWorth || 0;
    const convertedUSD = cashFlow?.totalConvertedUSD || 0;
    const lifecyclePL = totalAccountValue - convertedUSD;
    const lifecyclePLPercent = convertedUSD > 0 ? (lifecyclePL / convertedUSD) * 100 : 0;

    return {
      availableCash,
      totalAccountValue,
      lifecyclePL,
      lifecyclePLPercent,
      isPositive: lifecyclePL >= 0,
    };
  }, [cashFlow, portfolio]);

  if (!cashFlow) {
    return <div className="panel rounded-3xl p-8 text-center text-sm text-[var(--text-muted)]">Loading funding metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-[var(--text-primary)]">Cash Flow Analysis</h2>
          <p className="text-sm text-[var(--text-secondary)]">Funding consistency, conversion quality, and return efficiency.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="focus-ring inline-flex items-center rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--accent-secondary)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="kpi-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Deposited MYR</p>
            <Landmark className="h-4 w-4 text-emerald-300" />
          </div>
          <p className="font-display text-2xl text-[var(--text-primary)]">{displayValue(cashFlow.totalDepositedMYR, 'RM ', hideValues)}</p>
        </div>

        <div className="kpi-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Converted USD</p>
            <Banknote className="h-4 w-4 text-cyan-300" />
          </div>
          <p className="font-display text-2xl text-[var(--text-primary)]">{displayValue(cashFlow.totalConvertedUSD, '$', hideValues)}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Avg FX: {cashFlow.avgRate.toFixed(4)} MYR/USD</p>
        </div>

        <div className="kpi-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Real Cash Balance</p>
            <Banknote className="h-4 w-4 text-indigo-300" />
          </div>
          <p className="font-display text-2xl text-[var(--text-primary)]">{displayValue(metrics.availableCash, '$', hideValues)}</p>
        </div>

        <div className="kpi-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Lifecycle P/L</p>
            <TrendingUp className={`h-4 w-4 ${metrics.isPositive ? 'text-emerald-300' : 'text-rose-300'}`} />
          </div>
          <p className={`font-display text-2xl ${metrics.isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
            {metrics.isPositive ? '+' : ''}
            {displayValue(metrics.lifecyclePL, '$', hideValues)}
          </p>
          <p className={`mt-1 text-xs ${metrics.isPositive ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
            {hideValues ? '****' : `${metrics.isPositive ? '+' : ''}${metrics.lifecyclePLPercent.toFixed(2)}% total return`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="panel overflow-hidden rounded-3xl">
          <div className="border-b border-[var(--border-soft)] px-5 py-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Deposit History (MYR)</h3>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-black/25 text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {cashFlow.deposits.map((deposit, index) => (
                  <tr key={`${deposit.date}-${index}`} className="border-t border-[var(--border-soft)] text-[var(--text-secondary)]">
                    <td className="px-5 py-3">{deposit.date}</td>
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{displayValue(deposit.amountMYR, 'RM ', hideValues)}</td>
                    <td className="px-5 py-3 text-xs">{deposit.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel overflow-hidden rounded-3xl">
          <div className="border-b border-[var(--border-soft)] px-5 py-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">USD Conversions</h3>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-black/25 text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">MYR In</th>
                  <th className="px-5 py-3 text-center font-medium">Rate</th>
                  <th className="px-5 py-3 text-right font-medium">USD Out</th>
                </tr>
              </thead>
              <tbody>
                {cashFlow.conversions.map((conversion, index) => (
                  <tr key={`${conversion.date}-${index}`} className="border-t border-[var(--border-soft)] text-[var(--text-secondary)]">
                    <td className="px-5 py-3">{conversion.date}</td>
                    <td className="px-5 py-3 text-right">{displayValue(conversion.amountMYR, '', hideValues)}</td>
                    <td className="px-5 py-3 text-center text-xs">{conversion.rate.toFixed(4)}</td>
                    <td className="px-5 py-3 text-right font-medium text-emerald-300">{displayValue(conversion.amountUSD, '$', hideValues)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AddFundingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          onRefresh?.();
        }}
      />
    </div>
  );
};
