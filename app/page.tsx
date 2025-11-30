'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, LayoutDashboard, AlertCircle, RefreshCw, PieChart as PieChartIcon, ArrowRightLeft, Wallet, LineChart, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { SummaryCards } from '../components/SummaryCards';
import { HoldingsTable } from '../components/HoldingsTable';
import { AllocationChart } from '../components/AllocationChart';
import { FundingStats } from '../components/FundingStats';
import { MoneyManager } from '../components/MoneyManager';
import { AddTradeModal } from '../components/AddTradeModal';
import { getPortfolioData, getCashFlowData, getMoneyManagerData } from './actions';
import { PortfolioSummary, CashFlowSummary, MoneyManagerData } from '../types';

type AppModule = 'manager' | 'investment';
type InvestmentTab = 'dashboard' | 'funding' | 'allocation';

const LockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const envPin = process.env.NEXT_PUBLIC_APP_PASSWORD;
    // Default to 'admin' if no env var is set, to ensure it works out of the box for the user before they deploy
    const targetPin = envPin || 'admin';
    
    if (pin === targetPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="flex flex-col items-center mb-8">
            <div className="bg-slate-800 p-4 rounded-full mb-4 border border-slate-700 shadow-inner">
                <ShieldCheck className="w-10 h-10 text-indigo-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Nova<span className="text-indigo-500">Track</span></h1>
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

      {showHelp && (
          <div className="mt-8 max-w-md bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-sm text-slate-400 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-white font-semibold mb-2">How to Deploy Securely</h3>
              <ul className="space-y-2 list-disc pl-4">
                  <li>Deploy this project to <strong>Vercel</strong> or <strong>Netlify</strong>.</li>
                  <li>In the project settings, add your Environment Variables:</li>
                  <li><code>GOOGLE_SERVICE_ACCOUNT_KEY</code>: Paste the full JSON content of your service account key file.</li>
                  <li><code>NEXT_PUBLIC_APP_PASSWORD</code>: Set your desired PIN (Default: 'admin').</li>
                  <li><code>API_KEY</code>: (Optional) Your Gemini API Key for AI features.</li>
              </ul>
          </div>
      )}
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
  
  // Navigation State
  const [activeModule, setActiveModule] = useState<AppModule>('manager');
  const [activeInvTab, setActiveInvTab] = useState<InvestmentTab>('dashboard');
  
  // Privacy State
  const [hideValues, setHideValues] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel Fetch
      const [portfolioResult, cashFlowResult, moneyResult] = await Promise.all([
        getPortfolioData(),
        getCashFlowData(),
        getMoneyManagerData()
      ]);
      
      setData(portfolioResult);
      setCashFlowData(cashFlowResult);
      setMoneyData(moneyResult);
    } catch (err: any) {
      console.error("Failed to load data", err);
      let errorMessage = "Failed to load portfolio data.";
      if (err.message?.includes("GOOGLE_SERVICE_ACCOUNT_KEY") || err.message?.includes("Configuration Missing")) {
          errorMessage = "Missing Configuration: GOOGLE_SERVICE_ACCOUNT_KEY is not defined.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                 <LineChart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">Asset<span className="text-indigo-500">Manager</span></span>
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
               {/* Hide Balance Toggle */}
               <button
                onClick={() => setHideValues(!hideValues)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title={hideValues ? "Show Values" : "Hide Values"}
              >
                {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <button
                onClick={fetchData}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Only show Add Trade in Investment Module */}
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

        {/* Investment Sub-Tabs */}
        {activeModule === 'investment' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Investment Portfolio</h1>
              <p className="text-slate-500 text-sm">Stocks, Crypto, and ETFs</p>
            </div>
            
            <div className="bg-slate-900/50 p-1 rounded-lg flex border border-slate-800 overflow-x-auto">
               <button 
                  onClick={() => setActiveInvTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeInvTab === 'dashboard' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <LayoutDashboard className="w-4 h-4" />
                 Dashboard
               </button>
               <button 
                  onClick={() => setActiveInvTab('funding')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeInvTab === 'funding' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <ArrowRightLeft className="w-4 h-4" />
                 Cash Flow
               </button>
               <button 
                  onClick={() => setActiveInvTab('allocation')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeInvTab === 'allocation' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <PieChartIcon className="w-4 h-4" />
                 Allocation
               </button>
            </div>
          </div>
        )}

        {/* Money Manager Header (Simple) */}
        {activeModule === 'manager' && (
           <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Asset Management</h1>
              <p className="text-slate-500 text-sm">Wallets, Banks, and Expenses</p>
           </div>
        )}

        {error && (
           <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
             <div className="bg-rose-500/10 border-b border-rose-500/20 p-4 flex items-center gap-3">
               <AlertCircle className="w-5 h-5 text-rose-400" />
               <h3 className="font-semibold text-rose-400">Connection Failed</h3>
             </div>
             <div className="p-6">
                <p className="text-slate-300 mb-4">{error}</p>
             </div>
           </div>
        )}

        {/* --- Content Rendering --- */}
        
        {activeModule === 'manager' && (
           <MoneyManager 
             data={moneyData} 
             loading={loading} 
             onRefresh={fetchData} 
             hideValues={hideValues}
           />
        )}

        {activeModule === 'investment' && activeInvTab === 'funding' && (
            <FundingStats 
              cashFlow={cashFlowData} 
              portfolio={data} 
              hideValues={hideValues}
            />
        )}

        {activeModule === 'investment' && activeInvTab !== 'funding' && (
            <>
                {/* Investment Stats */}
                <SummaryCards data={data} loading={loading} hideValues={hideValues} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main List / Chart Area */}
                  <div className="lg:col-span-2 space-y-6">
                      {activeInvTab === 'dashboard' ? (
                          <HoldingsTable data={data} hideValues={hideValues} />
                      ) : (
                          <div className="h-[500px]">
                              <AllocationChart data={data} />
                          </div>
                      )}
                  </div>

                  {/* Sidebar Area */}
                  <div className="space-y-6">
                      <div className="h-[300px]">
                          <AllocationChart data={data} />
                      </div>
                      
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                          <h3 className="text-white font-medium mb-2">Data Sources</h3>
                          <p className="text-slate-400 text-sm">
                              • <strong>Transactions:</strong> 'Transaction' Tab<br/>
                              • <strong>Portfolio:</strong> 'Portfolio' Tab (Source of Truth)<br/>
                              • <strong>Cash Flow:</strong> 'Cash Flow' Tab
                          </p>
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