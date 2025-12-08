
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, LayoutDashboard, AlertCircle, RefreshCw, PieChart as PieChartIcon, ArrowRightLeft, Wallet, LineChart, Eye, EyeOff, Lock, ShieldCheck, Database, Loader2 } from 'lucide-react';
import { SummaryCards } from '../components/SummaryCards';
import { HoldingsTable } from '../components/HoldingsTable';
import { AllocationChart } from '../components/AllocationChart';
import { FundingStats } from '../components/FundingStats';
import { MoneyManager } from '../components/MoneyManager';
import { AddTradeModal } from '../components/AddTradeModal';
import { TotalBalanceCard } from '../components/TotalBalanceCard';
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
        
        <div className="mt-6 text-center">
            <button 
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-slate-500 hover:text-indigo-400 transition-colors underline decoration-slate-700 underline-offset-4"
            >
                Deployment & Setup Help
            </button>
        </div>
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
  
  // Database Status for Money Manager
  const [dbStatus, setDbStatus] = useState<{ configured: boolean, initialized: boolean } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Navigation State
  const [activeModule, setActiveModule] = useState<AppModule>('manager');
  const [activeInvTab, setActiveInvTab] = useState<InvestmentTab>('dashboard');
  
  // Privacy State - Split
  const [hideBalance, setHideBalance] = useState(false);
  const [hideInvestments, setHideInvestments] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check Configuration Status first
      const status = await checkDatabaseStatus();
      setDbStatus(status);

      // 2. Decide Source
      // If configured, try to fetch real data.
      // If NOT configured, return empty data and show error/setup message.
      if (status.configured) {
         // --- REAL DATA FETCH ---
         const [portfolioResult, cashFlowResult, moneyResult] = await Promise.all([
            getPortfolioData().catch(() => null),
            getCashFlowData().catch(() => null),
            getMoneyManagerData().catch(() => null)
         ]);

         // Allow empty data if real fetch returns valid empty structure
         setData(portfolioResult || { netWorth: 0, totalCost: 0, totalPL: 0, totalPLPercent: 0, cashBalance: 0, holdings: [] });
         setCashFlowData(cashFlowResult || { totalDepositedMYR: 0, totalConvertedMYR: 0, totalConvertedUSD: 0, avgRate: 0, deposits: [], conversions: [] });
         setMoneyData(moneyResult || { accounts: [], transactions: [], totalBalance: 0, monthlyStats: { income: 0, expense: 0, incomeGrowth: 0, expenseGrowth: 0 }, categorySpending: [], graphData: [], upcomingBills: [], categories: [], incomeCategories: [], expenseCategories: [] });

      } else {
         // --- NOT CONFIGURED ---
         setData({ netWorth: 0, totalCost: 0, totalPL: 0, totalPLPercent: 0, cashBalance: 0, holdings: [] });
         setCashFlowData({ totalDepositedMYR: 0, totalConvertedMYR: 0, totalConvertedUSD: 0, avgRate: 0, deposits: [], conversions: [] });
         setMoneyData({ accounts: [], transactions: [], totalBalance: 0, monthlyStats: { income: 0, expense: 0, incomeGrowth: 0, expenseGrowth: 0 }, categorySpending: [], graphData: [], upcomingBills: [], categories: [], incomeCategories: [], expenseCategories: [] });
         setError("Database connection missing. Please configure GOOGLE_SERVICE_ACCOUNT_KEY in your environment.");
      }

    } catch (err: any) {
      console.error("Critical failure loading data", err);
      setError("Failed to initialize application.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInitialize = async () => {
      setIsInitializing(true);
      const res = await initializeDatabase();
      if (res.success) {
          await fetchData();
      } else {
          alert("Initialization failed: " + res.error);
      }
      setIsInitializing(false);
  };

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
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                 <LineChart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">
                <DecryptedText text="AssetManager" speed={60} revealDirection="center" />
              </span>
            </div>

            {/* Module Switcher (Center - Desktop) */}
            <div className="hidden md:flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
               <button 
                  onClick={() => setActiveModule('manager')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeModule === 'manager' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <Wallet className="w-4 h-4" />
                 Money Manager
               </button>
               <button 
                  onClick={() => setActiveModule('investment')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeModule === 'investment' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <LineChart className="w-4 h-4" />
                 Investments
               </button>
            </div>

            {/* Actions (Right) */}
            <div className="flex items-center gap-2">
               {error && (
                   <span className="hidden lg:inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-500 text-xs px-2 py-1 rounded-full border border-rose-500/20 mr-2">
                      <AlertCircle className="w-3 h-3" />
                      Config Error
                   </span>
               )}

               {/* Eye Icon - Only shows for Investment tab because Manager has its own in the Total Balance card */}
               {activeModule === 'investment' && (
                  <button
                    onClick={() => setHideInvestments(!hideInvestments)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title={hideInvestments ? "Show Investment Values" : "Hide Investment Values"}
                  >
                    {hideInvestments ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               )}

              <button
                onClick={fetchData}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {activeModule === 'investment' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 ml-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Trade</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Module Switcher (Mobile Only) */}
        <div className="md:hidden flex bg-slate-900/80 p-1 rounded-lg border border-slate-800 mb-6">
            <button 
              onClick={() => setActiveModule('manager')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeModule === 'manager' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Wallet className="w-4 h-4" />
              Money Manager
            </button>
            <button 
              onClick={() => setActiveModule('investment')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeModule === 'investment' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <LineChart className="w-4 h-4" />
              Investments
            </button>
        </div>

        {/* Global Total Balance Box (Visible on both pages) */}
        <TotalBalanceCard 
            totalBalance={moneyData?.totalBalance || 0} 
            accounts={moneyData?.accounts || []} 
            hideValues={hideBalance}
            onTogglePrivacy={() => setHideBalance(!hideBalance)}
        />

        {/* --- INITIALIZATION CHECK --- */}
        {/* If we are connected (keys exist) but missing the specific Money Manager sheets, show Setup UI */}
        {activeModule === 'manager' && dbStatus?.configured && !dbStatus.initialized && (
            <div className="mb-8 p-6 bg-slate-900 border border-indigo-500/30 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                     <Database className="w-24 h-24 text-indigo-500" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-indigo-400" />
                        Complete Your Setup
                    </h2>
                    <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                        You have successfully connected to Google Sheets, but we noticed you are missing the required 
                        Money Manager tabs (<b>MM_Accounts</b>, <b>MM_Transactions</b>, etc.). 
                        <br/><br/>
                        Click below to automatically create these tabs with the correct headers in your spreadsheet.
                    </p>
                    <button 
                        onClick={handleInitialize}
                        disabled={isInitializing}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all"
                    >
                        {isInitializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        {isInitializing ? "Setting up..." : "Initialize Money Manager Sheets"}
                    </button>
                </div>
            </div>
        )}

        {/* --- Content Rendering --- */}
        
        {activeModule === 'manager' && (
           <MoneyManager 
             data={moneyData} 
             loading={loading} 
             onRefresh={fetchData} 
             hideValues={false}
           />
        )}

        {activeModule === 'investment' && activeInvTab === 'funding' && (
            <FundingStats 
              cashFlow={cashFlowData} 
              portfolio={data} 
              hideValues={hideInvestments}
            />
        )}

        {activeModule === 'investment' && activeInvTab !== 'funding' && (
            <>
                <SummaryCards data={data} loading={loading} hideValues={hideInvestments} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                      <HoldingsTable data={data} hideValues={hideInvestments} />
                  </div>
                  <div className="space-y-6">
                      <div>
                          <AllocationChart data={data} />
                      </div>
                  </div>
                </div>
            </>
        )}

      </main>

      <AddTradeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
