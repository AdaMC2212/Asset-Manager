import React from 'react';
import { Layers, TrendingDown, TrendingUp } from 'lucide-react';
import { Holding, PortfolioSummary } from '../types';

interface HoldingsTableProps {
  data: PortfolioSummary | null;
  hideValues?: boolean;
}

const displayCurrency = (value: number, hideValues?: boolean): string =>
  hideValues
    ? '$ ****'
    : `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ data, hideValues }) => {
  return (
    <section className="panel overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[var(--border-soft)] bg-black/20 p-2 text-[var(--text-secondary)]">
            <Layers className="h-4 w-4" />
          </div>
          <h2 className="font-display text-xl text-[var(--text-primary)]">Active Holdings</h2>
        </div>
        <span className="chip text-[var(--text-secondary)]">{data?.holdings.length || 0} assets</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-black/15">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <th className="px-6 py-4">Asset</th>
              <th className="px-6 py-4 text-right">Price</th>
              <th className="px-6 py-4 text-right">Qty</th>
              <th className="px-6 py-4 text-right">Value</th>
              <th className="px-6 py-4 text-right">P/L</th>
              <th className="px-6 py-4 text-right">Weight</th>
            </tr>
          </thead>
          <tbody>
            {data?.holdings.map((holding: Holding) => {
              const isPositive = holding.unrealizedPL >= 0;
              return (
                <tr key={holding.ticker} className="group border-t border-[var(--border-soft)] transition hover:bg-white/[0.03]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-[var(--border-soft)] bg-black/20 px-2.5 py-2 text-xs font-bold text-[var(--text-primary)]">
                        {holding.ticker.slice(0, 4)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{holding.ticker}</p>
                        <p className="text-xs text-[var(--text-muted)]">{holding.sector}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-[var(--text-primary)]">${holding.currentPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-sm text-[var(--text-secondary)]">
                    {hideValues ? '****' : holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[var(--text-primary)]">{displayCurrency(holding.currentValue, hideValues)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className={`inline-flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {isPositive ? '+' : ''}
                      {displayCurrency(holding.unrealizedPL, hideValues)}
                    </div>
                    <p className={`mt-1 text-[11px] ${isPositive ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                      {hideValues ? '****' : `${isPositive ? '+' : ''}${holding.unrealizedPLPercent.toFixed(2)}%`}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">{hideValues ? '**' : `${holding.allocation.toFixed(1)}%`}</p>
                    <div className="ml-auto mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-black/30">
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-cyan-400" style={{ width: `${holding.allocation}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!data || data.holdings.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-sm text-[var(--text-muted)]">
                  No holdings found. Add a trade to start portfolio analytics.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
