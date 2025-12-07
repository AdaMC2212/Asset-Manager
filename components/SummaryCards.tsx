import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { PortfolioSummary } from '../types';
import { SpotlightCard } from './ui/SpotlightCard';
import { CountUp } from './ui/CountUp';

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
          <div key={i} className="bg-slate-900/50 rounded-2xl p-6 h-32 animate-pulse"></div>
        ))}
      </div>
    );
  }

  const isPositive = data.totalPL >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Net Worth */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet className="w-16 h-16 text-indigo-400" />
        </div>
        <div className="relative z-10">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Net Worth</h3>
          <div className="text-3xl font-bold text-white tracking-tight">
            {hideValues ? '$ ****' : <CountUp end={data.netWorth} prefix="$" />}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-transparent opacity-50"></div>
      </div>

      {/* Total P/L */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
             <TrendingUp className={`w-16 h-16 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`} />
        </div>
        <div className="relative z-10">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Total Profit/Loss</h3>
          <div className="flex items-baseline gap-3">
             <span className={`text-3xl font-bold tracking-tight ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hideValues ? (isPositive ? '+ $ ****' : '- $ ****') : (
                <>
                    {isPositive ? '+' : ''}
                    <CountUp end={data.totalPL} prefix="$" />
                </>
                )}
            </span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {hideValues ? '****' : (isPositive ? '+' : '') + data.totalPLPercent.toFixed(2) + '%'}
            </span>
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${isPositive ? 'from-emerald-500' : 'from-rose-500'} to-transparent opacity-50`}></div>
      </div>

      {/* Cash Balance */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
         <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-16 h-16 text-blue-400" />
        </div>
        <div className="relative z-10">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Cash Available</h3>
           <div className="text-3xl font-bold text-white tracking-tight">
             {hideValues ? '$ ****' : <CountUp end={data.cashBalance} prefix="$" />}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent opacity-50"></div>
      </div>
    </div>
  );
};
