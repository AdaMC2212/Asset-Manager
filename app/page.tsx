'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
// Added Search to the lucide-react imports
import { Plus, LayoutDashboard, AlertCircle, RefreshCw, PieChart as PieChartIcon, ArrowRightLeft, Wallet, LineChart, Eye, EyeOff, Lock, ShieldCheck, Database, Loader2, Landmark, Command as CommandIcon, Search } from 'lucide-react';
import { SummaryCards } from '../components/SummaryCards';
import { HoldingsTable } from '../components/HoldingsTable';
import { AllocationChart } from '../components/AllocationChart';
import { FundingStats } from '../components/FundingStats';
import { MoneyManager } from '../components/MoneyManager';
import { AddTradeModal } from '../components/AddTradeModal';
import { TotalBalanceCard } from '../components/TotalBalanceCard';
import { CommandPalette } from '../components/CommandPalette';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { getPortfolioData, getCashFlowData, getMoneyManagerData, checkDatabaseStatus, initializeDatabase } from './actions';
import { PortfolioSummary, CashFlowSummary, MoneyManagerData } from '../types';
import { DecryptedText } from '../components/ui/DecryptedText';

type AppModule = 'manager' | 'investment';
type InvestmentTab = 'dashboard' | 'funding';

const LockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const envPin = process.env.NEXT_PUBLIC_APP_PASSWORD;
    const targetPin = envPin || 'admin';
    
    if (pin === targetPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
      
      <div className="w-full max-w-sm bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="flex flex-col items-center mb-8">
            <div className="bg-slate-800 p-4 rounded-full mb-4 border border-slate-700 shadow-inner">
                <ShieldCheck className="w-10 h-10 text-indigo-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-1">
              <DecryptedText text="AssetManager" speed={50} className="text-white" />
            </h1>
            <p className="text-slate-500 text-sm mt-1">Secure Portfolio Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Access PIN</label>
                <div className="relative">
                    <input 
                        type="password" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setError(false); }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl tracking-[0.5em] placeholder:tracking-normal transition-all"
                        placeholder="••••"
                        autoFocus
                    />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                </div>
            </div>

            {error && (
                <div className="flex items-center justify-center gap-2 text-rose-500 text-sm animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    <span>Incorrect PIN</span>
                </div>
            )}

            <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
            >
                Unlock Dashboard
            </button>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  const [isLocked, setIsLocked] = useState(true);
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowSummary | null>(null);
  const [moneyData, setMoneyData] = useState<MoneyManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  
  const [dbStatus, setDbStatus] = useState<{ configured: boolean, initialized: boolean } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const [activeModule, setActiveModule] = useState<AppModule>('manager');
  const [activeInvTab, setActiveInvTab] = useState<InvestmentTab>('dashboard');
  
  const [hideBalance, setHideBalance] = useState(false);
  const [hideInvestments, setHideInvestments] = useState(false);

  // Command Palette Items
  const searchItems = useMemo(() => {
    const items = [
        { name: 'Dashboard', type: 'Module', module: 'investment' },
        { name: 'Wallets', type: 'Module', module: 'manager' },
        { name: 'Cash Flow', type: 'Module', module: 'investment' }
    ];
    if (data?.holdings) {
        data.holdings.forEach(h => {
            items.push({ name: h.ticker, type: 'Asset', module: 'investment' });
        });
    }
    return items;
  }, [data]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await checkDatabaseStatus();
      setDbStatus(status);

      if (status.configured) {
         const [portfolioResult, cashFlowResult, moneyResult] = await Promise.all([
            getPortfolioData().catch(() => null),
            getCashFlowData().catch(() => null),
            getMoneyManagerData().catch(() => null)
         ]);

         setData(portfolioResult || { netWorth: 0, totalCost: 0, totalPL: 0, totalPLPercent: 0, cashBalance: 0, holdings: [] });
         setCashFlowData(cashFlowResult || { totalDepositedMYR: 0, totalConvertedMYR: 0, totalConvertedUSD: 0, avgRate: 0, deposits: [], conversions: [] });
         setMoneyData(moneyResult || { accounts: [], transactions: [], totalBalance: 0, monthlyStats: { income: 0, expense: 0, incomeGrowth: 0, expenseGrowth: 0 }, categorySpending: [], graphData: [], upcomingBills: [], categories: [], incomeCategories: [], expenseCategories: [] });
      } else {
         setError("Database connection missing. Please configure GOOGLE_SERVICE_ACCOUNT_KEY.");
      }
    } catch (err: any) {
      console.error("Critical failure loading data", err);
      setError("Failed to initialize application.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsCommandOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isLocked) {
      fetchData();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchData, isLocked]);

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                 <LineChart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight hidden sm:block">
                <DecryptedText text="AssetManager" speed={60} revealDirection="center" />
              </span>
            </div>

            <div className="hidden md:flex bg-slate-900/60 p-1 rounded-xl border border-white/5 backdrop-blur-md">
               <button 
                  onClick={() => setActiveModule('manager')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeModule === 'manager' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <Wallet className="w-4 h-4" />
                 Money Manager
               </button>
               <button 
                  onClick={() => setActiveModule('investment')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeModule === 'investment' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <LineChart className="w-4 h-4" />
                 Investments
               </button>
            </div>

            <div className="flex items-center gap-2">
               <button
                 onClick={() => setIsCommandOpen(true)}
                 className="hidden lg:flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-white/5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors mr-2 text-sm"
               >
                 <Search className="w-4 h-4" />
                 <span>Search...</span>
                 <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold">
                    <CommandIcon className="w-3 h-3" /> K
                 </div>
               </button>

               {activeModule === 'investment' && (
                  <button
                    onClick={() => setHideInvestments(!hideInvestments)}
                    className="p-2.5 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5"
                    title={hideInvestments ? "Show Values" : "Hide Values"}
                  >
                    {hideInvestments ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               )}

              <button
                onClick={fetchData}
                className="p-2.5 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {activeModule === 'investment' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-indigo-500/20 ml-2"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Trade</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:hidden flex bg-slate-900/60 p-1 rounded-xl border border-white/5 mb-6">
            <button 
              onClick={() => setActiveModule('manager')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeModule === 'manager' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Wallet className="w-4 h-4" />
              Manager
            </button>
            <button 
              onClick={() => setActiveModule('investment')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeModule === 'investment' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <LineChart className="w-4 h-4" />
              Investments
            </button>
        </div>

        <TotalBalanceCard 
            totalBalance={moneyData?.totalBalance || 0} 
            accounts={moneyData?.accounts || []} 
            hideValues={hideBalance}
            onTogglePrivacy={() => setHideBalance(!hideBalance)}
        />

        {activeModule === 'investment' && (
             <div className="flex space-x-1 bg-slate-900/40 p-1 rounded-xl w-fit mb-8 border border-white/5 backdrop-blur-md">
                <button
                    onClick={() => setActiveInvTab('dashboard')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        activeInvTab === 'dashboard' 
                        ? 'bg-slate-800 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Portfolio
                </button>
                <button
                    onClick={() => setActiveInvTab('funding')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        activeInvTab === 'funding' 
                        ? 'bg-slate-800 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Landmark className="w-4 h-4" />
                    Cash Flow
                </button>
            </div>
        )}

        {error && (
            <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <p className="font-semibold">{error}</p>
            </div>
        )}

        {loading ? (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
                </div>
                <TableSkeleton />
            </div>
        ) : (
            <>
                {activeModule === 'manager' && (
                    <MoneyManager 
                        data={moneyData} 
                        loading={loading} 
                        onRefresh={fetchData} 
                        hideValues={hideBalance}
                    />
                )}

                {activeModule === 'investment' && activeInvTab === 'funding' && (
                    <FundingStats 
                    cashFlow={cashFlowData} 
                    portfolio={data} 
                    hideValues={hideInvestments}
                    />
                )}

                {activeModule === 'investment' && activeInvTab === 'dashboard' && (
                    <>
                        <SummaryCards data={data} loading={loading} hideValues={hideInvestments} />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <HoldingsTable data={data} hideValues={hideInvestments} />
                            </div>
                            <div className="space-y-8">
                                <AllocationChart data={data} />
                                <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-5 -mr-10 -mt-10 bg-indigo-500 rounded-full blur-2xl"></div>
                                    <h3 className="text-white font-bold mb-3 relative z-10">Market Insights</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed relative z-10">
                                        Your portfolio is currently tracking {data?.holdings.length} assets across {new Set(data?.holdings.map(h => h.sector)).size} sectors. 
                                        Keep an eye on {data?.holdings[0]?.ticker} as it makes up {data?.holdings[0]?.allocation.toFixed(1)}% of your equity value.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </>
        )}
      </main>

      <AddTradeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />

      <CommandPalette 
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectModule={setActiveModule}
        onAddTrade={() => setIsModalOpen(true)}
        searchItems={searchItems}
      />
    </div>
  );
}