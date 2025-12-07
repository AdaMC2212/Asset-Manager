'use client';
import React, { useState } from 'react';
import { Wallet, Eye, EyeOff, X, CreditCard, Smartphone, Banknote, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MoneyAccount } from '../types';
import { CountUp } from './ui/CountUp';

interface TotalBalanceCardProps {
  totalBalance: number;
  accounts: MoneyAccount[];
  hideValues: boolean;
  onTogglePrivacy: () => void;
}

export const TotalBalanceCard: React.FC<TotalBalanceCardProps> = ({ 
  totalBalance, 
  accounts, 
  hideValues, 
  onTogglePrivacy 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const activeAccounts = accounts.filter(a => a.currentBalance !== 0);

  // Helper to calculate total assets vs liabilities (Mock logic or derived if data allows)
  // For visual flair, we assume totalBalance is net.
  
  const getAccountIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('bank')) return <Smartphone className="w-5 h-5 text-indigo-200" />;
    if (c.includes('wallet') || c.includes('pay')) return <Smartphone className="w-5 h-5 text-blue-200" />;
    if (c.includes('card')) return <CreditCard className="w-5 h-5 text-emerald-200" />;
    if (c.includes('cash')) return <Banknote className="w-5 h-5 text-amber-200" />;
    return <Wallet className="w-5 h-5 text-slate-200" />;
  };

  const displayValue = (val: number) => {
    if (hideValues) return 'RM ****';
    return `RM ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="group relative w-full overflow-hidden rounded-3xl p-1 transition-all hover:scale-[1.01] cursor-pointer mb-8 shadow-2xl shadow-indigo-500/10"
      >
        {/* Gradient Border Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 group-hover:opacity-100 transition-opacity blur-[2px]" />
        
        {/* Main Card Content */}
        <div className="relative h-full w-full rounded-[1.3rem] bg-slate-950/90 p-6 md:p-8 backdrop-blur-3xl">
            {/* Inner ambient glow */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-sm">
                            <Wallet className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-400 tracking-wide uppercase">Total Balance</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                         <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                            {hideValues ? 'RM *******' : <CountUp end={totalBalance} prefix="RM " />}
                         </h1>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                         <div className="flex -space-x-2">
                            {activeAccounts.slice(0, 4).map((acc, i) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-300 font-bold overflow-hidden" title={acc.name}>
                                    {acc.name.charAt(0)}
                                </div>
                            ))}
                            {activeAccounts.length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-300 font-bold">
                                    +{activeAccounts.length - 4}
                                </div>
                            )}
                         </div>
                         <span className="text-slate-500 font-medium">{activeAccounts.length} Active Accounts</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePrivacy();
                        }}
                        className="group/btn flex items-center justify-center w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 backdrop-blur-md transition-all active:scale-95"
                    >
                         {hideValues ? <EyeOff className="w-5 h-5 text-slate-400 group-hover/btn:text-white" /> : <Eye className="w-5 h-5 text-slate-400 group-hover/btn:text-white" />}
                    </button>
                    <div className="hidden md:block h-12 w-[1px] bg-white/10 mx-2"></div>
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</span>
                        <div className="flex items-center gap-2">
                             <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-sm font-medium text-emerald-400">Synced</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Active Accounts Modal */}
      {isModalOpen && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-slate-900/90 border border-slate-800/50 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/10"
            onClick={e => e.stopPropagation()}
          >
             <div className="flex justify-between items-center p-6 border-b border-white/5">
                <h3 className="font-bold text-xl text-white">Your Wallets</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {activeAccounts.map((acc) => (
                    <div key={acc.name} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-4">
                             <div className={`p-3 rounded-xl shadow-inner ${
                                 acc.currentBalance < 0 ? 'bg-rose-500/10' : 'bg-indigo-500/10'
                             }`}>
                                {acc.logoUrl ? <img src={acc.logoUrl} className="w-6 h-6 object-contain" /> : getAccountIcon(acc.category)}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{acc.name}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide">{acc.category}</div>
                            </div>
                        </div>
                        <div className={`text-base font-bold ${acc.currentBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {displayValue(acc.currentBalance)}
                        </div>
                    </div>
                ))}
                {activeAccounts.length === 0 && (
                    <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                        <Wallet className="w-12 h-12 text-slate-700 mb-3" />
                        No active accounts found.
                    </div>
                )}
             </div>
             <div className="p-6 bg-slate-950/50 border-t border-white/5 flex justify-between items-center">
                 <span className="text-sm font-medium text-slate-400">Net Total</span>
                 <span className="text-white font-bold text-xl tracking-tight">{displayValue(totalBalance)}</span>
             </div>
          </div>
        </div>
      )}
    </>
  );
};
