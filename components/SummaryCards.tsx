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
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-32 animate-pulse"></div>
        ))}
      </div>
    );
  }

  const isPositive = data.totalPL >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Net Worth */}
      <SpotlightCard className="p-6 shadow-sm" spotlightColor="rgba(99, 102, 241, 0.2)">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-400 text-sm font-medium">Net Worth</h3>
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Wallet className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-white">
            {hideValues ? '$ ****' : <CountUp end={data.netWorth} prefix="$" />}
          </span>
        </div>
      </SpotlightCard>

      {/* Total P/L */}
      <SpotlightCard className="p-6 shadow-sm" spotlightColor={isPositive ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)"}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-400 text-sm font-medium">Total Profit/Loss</h3>
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            <TrendingUp className={`w-5 h-5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
        </div>
        <div>
          <span className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
             {hideValues ? (isPositive ? '+ $ ****' : '- $ ****') : (
               <>
                 {isPositive ? '+' : ''}
                 <CountUp end={data.totalPL} prefix="$" />
               </>
             )}
          </span>
          <span className={`ml-2 text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {hideValues ? '****' : (isPositive ? '+' : '') + data.totalPLPercent.toFixed(2) + '%'}
          </span>
        </div>
      </SpotlightCard>

      {/* Cash Balance */}
      <SpotlightCard className="p-6 shadow-sm" spotlightColor="rgba(59, 130, 246, 0.2)">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-400 text-sm font-medium">Available Cash</h3>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-white">
             {hideValues ? '$ ****' : <CountUp end={data.cashBalance} prefix="$" />}
          </span>
        </div>
      </SpotlightCard>
    </div>
  );
};