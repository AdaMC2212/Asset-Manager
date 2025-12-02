import React, { useState } from 'react';
import { ArrowLeftRight, Landmark, Banknote, TrendingUp, Plus } from 'lucide-react';
import { CashFlowSummary, PortfolioSummary } from '../types';
import { AddFundingModal } from './FundingStats/AddFundingModal';

interface FundingStatsProps {
  cashFlow: CashFlowSummary | null;
  portfolio: PortfolioSummary | null;
  hideValues?: boolean;
}

export const FundingStats: React.FC<FundingStatsProps> = ({ cashFlow, portfolio, hideValues }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // We need to trigger a refresh of data when adding completes. 
  // In a cleaner app, this would be passed down from page.tsx, 
  // but for now we can rely on the SWR or the interval in App.tsx 
  // picking it up eventually, OR we force a window reload/router refresh.
  // Ideally, FundingStats should accept an `onRefresh` prop.
  // Assuming the parent will re-render if we don't block.
  // Actually, let's just use window.location.reload() for simplicity or assume the user waits for the 60s poll.
  // Better: Add an onRefresh prop if possible, but I cannot change the interface call in page.tsx easily 
  // without changing page.tsx too. I will check page.tsx... yes I can change page.tsx.
  // I will use `window.location.reload()` as a fallback for now inside the onSuccess for simplicity, 
  // or just let the background poll handle it? 
  // A standard approach is:
  const handleSuccess = () => {
    // Ideally call onRefresh();
    // For now, reload the page to fetch fresh data is the most robust way without prop drilling refactor.
    window.location.reload();
  };

  if (!cashFlow) {
    return (
       <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
         Loading funding data...
       </div>
    );
  }

  // Calculate Available Cash and Total Account Value
  const availableCash = portfolio?.cashBalance || 0;
  const currentNetWorth = portfolio?.netWorth || 0; 
  const totalAccountValue = currentNetWorth; 
  
  const lifecyclePL = totalAccountValue - cashFlow.totalConvertedUSD;
  const lifecyclePLPercent = cashFlow.totalConvertedUSD > 0 
    ? (lifecyclePL / cashFlow.totalConvertedUSD) * 100 
    : 0;

  const isPositive = lifecyclePL >= 0;

  const displayValue = (val: number, prefix: string) => {
    if (hideValues) return `${prefix} ****`;
    return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Cash Flow Analysis</h2>
        <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
        >
            <Plus className="w-3 h-3" />
            Add Transaction
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-xs font-semibold uppercase">Total Deposited (MYR)</h3>
            <Landmark className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {displayValue(cashFlow.totalDepositedMYR, 'RM ')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
           <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-xs font-semibold uppercase">Total Converted (USD)</h3>
            <Banknote className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {displayValue(cashFlow.totalConvertedUSD, '$')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
             Avg Rate: {cashFlow.avgRate.toFixed(4)} MYR/USD
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
           <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-xs font-semibold uppercase">Real Cash Balance</h3>
            <Banknote className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-white">
             {displayValue(availableCash, '$')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
             Uninvested Capital
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
           <div className={`absolute top-0 right-0 p-10 opacity-10 blur-xl rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
           <div className="flex items-center justify-between mb-2 relative z-10">
            <h3 className="text-slate-400 text-xs font-semibold uppercase">Lifecycle P/L</h3>
            <TrendingUp className={`w-4 h-4 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
          <div className={`text-2xl font-bold relative z-10 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
             {isPositive ? '+' : ''}{displayValue(lifecyclePL, '$')}
          </div>
          <div className={`text-xs font-medium mt-1 relative z-10 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
             {hideValues ? '****' : (isPositive ? '+' : '') + lifecyclePLPercent.toFixed(2) + '% Total Return'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposits List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
             <div className="p-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">Deposit History (MYR)</h3>
             </div>
             <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Amount</th>
                            <th className="px-4 py-3 font-medium">Reason</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {cashFlow.deposits.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3 text-slate-300">{d.date}</td>
                                <td className="px-4 py-3 text-white font-medium">{displayValue(d.amountMYR, 'RM ')}</td>
                                <td className="px-4 py-3 text-slate-500 text-xs">{d.reason || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>

         {/* Conversions List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
             <div className="p-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">USD Conversions</h3>
             </div>
             <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium text-right">MYR In</th>
                            <th className="px-4 py-3 font-medium text-center">Rate</th>
                            <th className="px-4 py-3 font-medium text-right">USD Out</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {cashFlow.conversions.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3 text-slate-300">{c.date}</td>
                                <td className="px-4 py-3 text-slate-400 text-right">{displayValue(c.amountMYR, '')}</td>
                                <td className="px-4 py-3 text-slate-500 text-center text-xs">{c.rate.toFixed(4)}</td>
                                <td className="px-4 py-3 text-emerald-400 font-medium text-right">{displayValue(c.amountUSD, '$')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
      </div>

      <AddFundingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};