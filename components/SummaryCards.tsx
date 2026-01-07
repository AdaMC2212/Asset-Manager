import React from 'react';
import { TrendingUp, TrendingDown, Wallet, Landmark, ArrowUpRight, DollarSign } from 'lucide-react';
import { PortfolioSummary } from '../types';
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
          <div key={i} className="bg-slate-900/50 rounded-3xl p-6 h-32 animate-pulse border border-white/5"></div>
        ))}
      </div>
    );
  }

  const isPositive = data.totalPL >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Net Worth */}
      <div className="group relative glass-card rounded-[2rem] p-8 overflow-hidden hover:border-indigo-500/30 transition-all duration-500">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700 scale-150 group-hover:scale-[1.7]">
            <Wallet className="w-24 h-24 text-indigo-400" />
        </div>
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Total Net Worth</h3>
            <div className="text-4xl font-bold text-white tracking-tighter drop-shadow-md">
                {hideValues ? '$ ****' : <CountUp end={data.netWorth} prefix="$" />}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-8 h-1 bg-indigo-500/50 rounded-full"></div>
            <span className="text-[10px] font-bold text-slate-500 tracking-wider">PORTFOLIO ASSETS</span>
          </div>
        </div>
      </div>

      {/* Total P/L */}
      <div className="group relative glass-card rounded-[2rem] p-8 overflow-hidden hover:border-emerald-500/30 transition-all duration-500">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700 scale-150 group-hover:scale-[1.7]">
             <TrendingUp className={`w-24 h-24 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`} />
        </div>
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Lifecycle Returns</h3>
            <div className="flex flex-col gap-2">
                <div className={`text-4xl font-bold tracking-tighter drop-shadow-md ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {hideValues ? (isPositive ? '+ $ ****' : '- $ ****') : (
                    <>
                        {isPositive ? '+' : ''}
                        <CountUp end={data.totalPL} prefix="$" />
                    </>
                    )}
                </div>
                <div className="flex items-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border tracking-wider ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {hideValues ? '****' : (isPositive ? '+' : '') + data.totalPLPercent.toFixed(2) + '% ALL-TIME'}
                    </span>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Position */}
      <div className="group relative glass-card rounded-[2rem] p-8 overflow-hidden hover:border-blue-500/30 transition-all duration-500">
         <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700 scale-150 group-hover:scale-[1.7]">
            <DollarSign className="w-24 h-24 text-blue-400" />
        </div>
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Cash Liquidity</h3>
            <div className="text-4xl font-bold text-white tracking-tighter drop-shadow-md">
                {hideValues ? '$ ****' : <CountUp end={data.cashBalance} prefix="$" />}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-8 h-1 bg-blue-500/50 rounded-full"></div>
            <span className="text-[10px] font-bold text-slate-500 tracking-wider">UNINVESTED CAPITAL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
