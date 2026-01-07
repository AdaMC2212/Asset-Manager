import React from 'react';
import { PortfolioSummary, Holding } from '../types';
// Added Plus to the lucide-react imports
import { TrendingUp, TrendingDown, Layers, Plus } from 'lucide-react';

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
    <div className="glass-card rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Active Holdings</h2>
        </div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full">
            {data?.holdings.length || 0} Assets
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left compact-table border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black">
              <th className="px-6 py-4">Asset / Sector</th>
              <th className="px-6 py-4 text-right">Last Price</th>
              <th className="px-6 py-4 text-right">Quantity</th>
              <th className="px-6 py-4 text-right">Value</th>
              <th className="px-6 py-4 text-right">P/L Performance</th>
              <th className="px-6 py-4 text-right">Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data?.holdings.map((holding: Holding) => {
              const isPositive = holding.unrealizedPL >= 0;
              return (
                <tr key={holding.ticker} className="group hover:bg-white/[0.04] transition-all duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center font-black text-xs text-white mr-3 border border-white/10 group-hover:scale-105 group-hover:bg-indigo-600 transition-all duration-300">
                          {holding.ticker.substring(0, 4)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">{holding.ticker}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{holding.sector}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-white font-semibold text-sm">${holding.currentPrice.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-slate-400 text-xs font-medium">
                        {hideValues ? '****' : holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-white text-sm">
                        {displayValue(holding.currentValue)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`flex flex-col items-end`}>
                        <div className={`flex items-center gap-1 font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isPositive ? '+' : ''}{displayValue(holding.unrealizedPL)}
                        </div>
                        <div className={`text-[10px] font-black tracking-widest ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {hideValues ? '****' : (isPositive ? '+' : '') + holding.unrealizedPLPercent.toFixed(2) + '%'}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                        <span className="text-slate-300 text-[10px] font-black tracking-widest">{hideValues ? '**' : holding.allocation.toFixed(1)}%</span>
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${holding.allocation}%` }}></div>
                        </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!data || data.holdings.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-white/5 shadow-inner">
                        <Plus className="w-6 h-6 text-slate-700" />
                    </div>
                    <div className="text-slate-500 font-bold text-sm">No holdings detected.</div>
                    <p className="text-xs text-slate-600 max-w-xs leading-relaxed">Your portfolio sheet is empty. Start by adding your first trade to begin tracking your assets.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};