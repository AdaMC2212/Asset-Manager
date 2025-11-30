import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { PortfolioSummary } from '../types';

interface SummaryCardsProps {
  data: PortfolioSummary | null;
  loading: boolean;
  hideValues?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data, loading, hideValues }) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-32 animate-pulse"></div>
        ))}
      </div>
    );
  }

  const isPositive = data.totalPL >= 0;

  const displayValue = (val: number, prefix: string = '$') => {
    if (hideValues) return `${prefix} ****`;
    return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Net Worth */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-400 text-sm font-medium">Net Worth</h3>
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Wallet className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-white">
            {displayValue(data.netWorth)}
          </span>
        </div>
      </div>

      {/* Total P/L */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-400 text-sm font-medium">Total Profit/Loss</h3>
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            <TrendingUp className={`w-5 h-5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
        </div>
        <div>
          <span className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{displayValue(data.totalPL)}
          </span>
          <span className={`ml-2 text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {hideValues ? '****' : (isPositive ? '+' : '') + data.totalPLPercent.toFixed(2) + '%'}
          </span>
        </div>
      </div>

      {/* Cash Balance */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-400 text-sm font-medium">Available Cash</h3>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-white">
            {displayValue(data.cashBalance)}
          </span>
        </div>
      </div>
    </div>
  );
};