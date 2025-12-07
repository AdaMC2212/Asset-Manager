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
    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Current Holdings</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-slate-500 text-xs uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Asset</th>
              <th className="px-6 py-4 text-right">Price</th>
              <th className="px-6 py-4 text-right">Qty</th>
              <th className="px-6 py-4 text-right">Value</th>
              <th className="px-6 py-4 text-right">Avg Cost</th>
              <th className="px-6 py-4 text-right">Return</th>
              <th className="px-6 py-4 text-right">Alloc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data?.holdings.map((holding: Holding) => {
              const isPositive = holding.unrealizedPL >= 0;
              return (
                <tr key={holding.ticker} className="group hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs text-white mr-3 border border-white/5">
                          {holding.ticker.substring(0, 4)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">{holding.ticker}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">{holding.sector}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300 font-medium">
                    ${holding.currentPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400 text-sm">
                    {hideValues ? '****' : holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-white">
                    {displayValue(holding.currentValue)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 text-sm">
                    {displayValue(holding.avgCost)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{displayValue(holding.unrealizedPL)}
                    </div>
                    <div className={`text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {hideValues ? '****' : (isPositive ? '+' : '') + holding.unrealizedPLPercent.toFixed(2) + '%'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-slate-300 text-sm font-medium">{hideValues ? '**' : holding.allocation.toFixed(1)}%</span>
                        <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-500" style={{ width: `${holding.allocation}%` }}></div>
                        </div>
                    </div>
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
