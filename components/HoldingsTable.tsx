import React from 'react';
import { PortfolioSummary, Holding } from '../types';

interface HoldingsTableProps {
  data: PortfolioSummary | null;
  hideValues?: boolean;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ data, hideValues }) => {
  const displayValue = (val: number, prefix: string = '$') => {
    if (hideValues) return `${prefix} ****`;
    return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Current Holdings</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Ticker</th>
              <th className="px-6 py-4 font-medium text-right">Price</th>
              <th className="px-6 py-4 font-medium text-right">Quantity</th>
              <th className="px-6 py-4 font-medium text-right">Value</th>
              <th className="px-6 py-4 font-medium text-right">Avg Cost</th>
              <th className="px-6 py-4 font-medium text-right">Total P/L</th>
              <th className="px-6 py-4 font-medium text-right">Allocation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data?.holdings.map((holding: Holding) => {
              const isPositive = holding.unrealizedPL >= 0;
              return (
                <tr key={holding.ticker} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="font-bold text-white">{holding.ticker}</div>
                        <div className="text-xs text-slate-500">{holding.sector}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">
                    ${holding.currentPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">
                    {hideValues ? '****' : holding.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-white">
                    {displayValue(holding.currentValue)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400">
                    {displayValue(holding.avgCost)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{displayValue(holding.unrealizedPL)}
                    </div>
                    <div className={`text-xs ${isPositive ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                      {hideValues ? '****' : (isPositive ? '+' : '') + holding.unrealizedPLPercent.toFixed(2) + '%'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">
                    {hideValues ? '****' : holding.allocation.toFixed(1) + '%'}
                  </td>
                </tr>
              );
            })}
            {(!data || data.holdings.length === 0) && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  No holdings found. Add a trade to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};