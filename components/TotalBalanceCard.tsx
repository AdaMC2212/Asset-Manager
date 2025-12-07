'use client';
import React, { useState } from 'react';
import { Wallet, Eye, EyeOff, X, CreditCard, Smartphone, Banknote } from 'lucide-react';
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

  const getAccountIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('bank')) return <Smartphone className="w-5 h-5 text-indigo-400" />;
    if (c.includes('wallet') || c.includes('pay')) return <Smartphone className="w-5 h-5 text-blue-400" />;
    if (c.includes('card')) return <CreditCard className="w-5 h-5 text-emerald-400" />;
    if (c.includes('cash')) return <Banknote className="w-5 h-5 text-amber-400" />;
    return <Wallet className="w-5 h-5 text-slate-400" />;
  };

  const displayValue = (val: number) => {
    if (hideValues) return 'RM ****';
    return `RM ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="bg-gradient-to-r from-indigo-900/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 mb-8 cursor-pointer relative group overflow-hidden transition-all hover:border-indigo-500/50 shadow-lg"
      >
        <div className="relative z-10 flex justify-between items-center">
          <div>
             <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-400" /> Total Wallet Balance
             </div>
             <div className="text-3xl font-bold text-white tracking-tight">
                 {hideValues ? 'RM ****' : <CountUp end={totalBalance} prefix="RM " />}
             </div>
             <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-[10px] font-medium">{activeAccounts.length} Accounts</span>
                <span className="text-slate-600">•</span>
                <span>Tap to view details</span>
             </div>
          </div>
          
          <button 
            onClick={(e) => {
                e.stopPropagation();
                onTogglePrivacy();
            }}
            className="p-2.5 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/50 hover:border-slate-600"
            title={hideValues ? "Show Balance" : "Hide Balance"}
          >
             {hideValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Background Decor */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-600/5 to-transparent pointer-events-none" />
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Active Accounts Modal */}
      {isModalOpen && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
             <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/50">
                <h3 className="font-bold text-lg text-white">Active Accounts</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {activeAccounts.map((acc) => (
                    <div key={acc.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                             <div className="bg-slate-800 p-2 rounded-lg text-slate-400 border border-slate-700/50">
                                {acc.logoUrl ? <img src={acc.logoUrl} className="w-5 h-5 object-contain" /> : getAccountIcon(acc.category)}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white">{acc.name}</div>
                                <div className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">{acc.category}</div>
                            </div>
                        </div>
                        <div className="text-sm font-bold text-slate-200">
                            {displayValue(acc.currentBalance)}
                        </div>
                    </div>
                ))}
                {activeAccounts.length === 0 && (
                    <div className="text-center text-slate-500 py-8">No active accounts found.</div>
                )}
             </div>
             <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex justify-between items-center">
                 <span className="text-sm text-slate-400">Total Net Balance</span>
                 <span className="text-white font-bold text-lg">{displayValue(totalBalance)}</span>
             </div>
          </div>
        </div>
      )}
    </>
  );
};
