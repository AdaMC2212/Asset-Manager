'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Wallet, ShoppingBag, Car, Shirt, Zap, Wifi, Music, Utensils, Smartphone, Banknote, Calendar, ChevronLeft, ChevronRight, X, ArrowUpRight, ArrowDownRight, Pencil, Trash2, Filter, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { MoneyManagerData, MoneyTransaction } from '../types';
import { AddMoneyModal } from './MoneyManager/AddMoneyModal';
import { deleteMoneyTransaction } from '../app/actions';
import { CountUp } from './ui/CountUp';

interface MoneyManagerProps {
  data: MoneyManagerData | null;
  loading: boolean;
  onRefresh: () => void;
  hideValues?: boolean;
}

const PIE_COLORS = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9'];

// Helper for Icons with colors
const getCategoryStyles = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes('food') || c.includes('dining')) return { icon: <Utensils className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-orange-500', text: 'text-orange-100' };
  if (c.includes('transport') || c.includes('fuel')) return { icon: <Car className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-blue-500', text: 'text-blue-100' };
  if (c.includes('shop') || c.includes('fashion')) return { icon: <ShoppingBag className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-pink-500', text: 'text-pink-100' };
  if (c.includes('bill') || c.includes('utility')) return { icon: <Zap className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-yellow-500', text: 'text-yellow-100' };
  if (c.includes('salary') || c.includes('income')) return { icon: <Banknote className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-emerald-500', text: 'text-emerald-100' };
  if (c.includes('tech') || c.includes('gadget')) return { icon: <Smartphone className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-indigo-500', text: 'text-indigo-100' };
  
  return { icon: <Wallet className="w-5 h-5 md:w-5 md:h-5" />, color: 'bg-slate-600', text: 'text-slate-100' };
};

export const MoneyManager: React.FC<MoneyManagerProps> = ({ data, loading, onRefresh, hideValues }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // State for Category Detail View
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [editingTransaction, setEditingTransaction] = useState<MoneyTransaction | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
      type: 'All', // All, Income, Expense, Transfer
      account: 'All',
      startDate: '',
      endDate: ''
  });

  const { filteredTransactions, monthlyStats, pieData, fullBreakdown, isCustomDateMode } = useMemo(() => {
    if (!data) return { filteredTransactions: [], monthlyStats: { income: 0, expense: 0, balance: 0 }, pieData: [], fullBreakdown: [], isCustomDateMode: false };

    // Determine Base List (Date Filter)
    let filtered = [];
    const useCustomDate = !!(filters.startDate && filters.endDate);
    
    if (useCustomDate) {
        // Custom Range Filter
        filtered = data.transactions.filter(tx => {
            return tx.date >= filters.startDate && tx.date <= filters.endDate;
        });
    } else {
        // Default Monthly Filter
        const targetMonth = selectedDate.getMonth();
        const targetYear = selectedDate.getFullYear();
        filtered = data.transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
        });
    }

    // Apply Type Filter
    if (filters.type !== 'All') {
        filtered = filtered.filter(tx => tx.type === filters.type);
    }

    // Apply Account Filter
    if (filters.account !== 'All') {
        filtered = filtered.filter(tx => tx.fromAccount === filters.account || tx.toAccount === filters.account);
    }

    // Calculate Stats based on FILTERED view
    let income = 0;
    let expense = 0;
    const catTotals: Record<string, number> = {};

    filtered.forEach(tx => {
        if (tx.type === 'Income') {
            income += tx.amount;
            // Subtract income from category to get net spending
            catTotals[tx.category] = (catTotals[tx.category] || 0) - tx.amount;
        } else if (tx.type === 'Expense') {
            expense += tx.amount;
            // Add expense to category
            catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
        }
    });

    const breakdown = Object.entries(catTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Pie chart only shows positive net spending (actual costs)
    const pie = breakdown.filter(item => item.value > 0);

    return {
        filteredTransactions: filtered,
        monthlyStats: { income, expense, balance: income - expense },
        pieData: pie,
        fullBreakdown: breakdown,
        isCustomDateMode: useCustomDate
    };
  }, [data, selectedDate, filters]);

  // Derived filtered list for the specific category modal
  const categoryTransactions = useMemo(() => {
      if (!selectedCategory) return [];
      return filteredTransactions.filter(tx => tx.category === selectedCategory);
  }, [filteredTransactions, selectedCategory]);

  if (loading || !data) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div className="bg-slate-900/50 rounded-3xl h-64 md:col-span-2"></div>
            <div className="bg-slate-900/50 rounded-3xl h-64"></div>
        </div>
    );
  }

  const displayValue = (val: number, prefix: string = 'RM ') => {
    if (hideValues) return `${prefix} ****`;
    return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const prevMonth = () => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const monthLabel = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleDelete = async (tx: MoneyTransaction) => {
    if (!tx.rowIndex) return;
    if (confirm(`Delete ${tx.category} (RM ${tx.amount})?`)) {
        const res = await deleteMoneyTransaction(tx.rowIndex);
        if (res.success) onRefresh();
    }
  };

  const handleEdit = (tx: MoneyTransaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
      setFilters({
          type: 'All',
          account: 'All',
          startDate: '',
          endDate: ''
      });
  };

  const hasActiveFilters = filters.type !== 'All' || filters.account !== 'All' || (filters.startDate && filters.endDate);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN (Main Focus) */}
      <div className="xl:col-span-2 space-y-4 md:space-y-8">
        
        {/* Monthly Focus Header */}
        <div className="flex flex-row justify-between items-center gap-2 md:gap-6 p-1">
             {/* Month Navigator */}
             <div className={`flex items-center gap-1 md:gap-2 bg-slate-900/50 p-1 md:p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-sm transition-opacity ${isCustomDateMode ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <button onClick={prevMonth} className="p-2 md:p-3 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <div className="flex flex-col items-center min-w-[100px] md:min-w-[140px] px-1 md:px-2">
                    <span className="text-white font-bold text-base md:text-xl tracking-tight">{monthLabel.split(' ')[0]}</span>
                    <span className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider">{monthLabel.split(' ')[1]}</span>
                </div>
                <button onClick={nextMonth} className="p-2 md:p-3 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </button>
             </div>

             <button 
                onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 hover:scale-105 active:scale-95 text-white px-4 md:px-6 py-2 md:py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/20"
            >
                <Plus className="w-5 h-5" />
                <span className="hidden md:inline">Add New</span>
                <span className="md:hidden">Add</span>
            </button>
        </div>

        {/* BENTO GRID STATS */}
        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
             {/* Income */}
             <div className="bg-slate-900/50 backdrop-blur-md p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 shadow-lg relative overflow-hidden group">
                <div className="hidden md:block absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                    <ArrowDownRight className="w-24 h-24 text-emerald-500" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                    <span className="inline-flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-4">
                        <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> 
                        {isCustomDateMode ? 'Inc' : 'Income'}
                    </span>
                    <div className="text-sm md:text-3xl font-bold text-white truncate">
                        {hideValues ? '****' : <CountUp end={monthlyStats.income} prefix="RM " />}
                    </div>
                </div>
             </div>

             {/* Expense */}
             <div className="bg-slate-900/50 backdrop-blur-md p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 shadow-lg relative overflow-hidden group">
                <div className="hidden md:block absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                    <ArrowUpRight className="w-24 h-24 text-rose-500" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                    <span className="inline-flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-4">
                        <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-rose-500"></div> 
                        {isCustomDateMode ? 'Exp' : 'Expenses'}
                    </span>
                    <div className="text-sm md:text-3xl font-bold text-white truncate">
                        {hideValues ? '****' : <CountUp end={monthlyStats.expense} prefix="RM " />}
                    </div>
                </div>
             </div>

             {/* Net */}
             <div className="bg-slate-900/50 backdrop-blur-md p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 shadow-lg relative overflow-hidden">
                <div className="relative z-10 text-center md:text-left">
                     <span className="inline-flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-4">
                        <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-indigo-500"></div> Net
                    </span>
                    <div className={`text-sm md:text-3xl font-bold truncate ${monthlyStats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {hideValues ? '****' : (
                            <>
                                {monthlyStats.balance > 0 ? '+' : ''}
                                <CountUp end={monthlyStats.balance} prefix="RM " />
                            </>
                        )}
                    </div>
                </div>
             </div>
        </div>

        {/* Transactions List */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-4 md:p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4 md:mb-6 px-1">
                <div className="flex items-center gap-2 md:gap-3">
                    <h3 className="font-bold text-lg md:text-xl text-white flex items-center gap-2">
                        Activity
                    </h3>
                    <span className="text-[10px] md:text-xs font-medium text-slate-500 bg-slate-800/50 px-2 md:px-3 py-0.5 md:py-1 rounded-full">{filteredTransactions.length}</span>
                </div>
                
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-xl transition-all flex items-center gap-2 text-xs md:text-sm font-medium ${showFilters || hasActiveFilters ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                    <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden md:inline">Filters</span>
                    {hasActiveFilters && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white animate-pulse"></div>}
                </button>
            </div>
            
            {/* Filter Section */}
            {(showFilters || hasActiveFilters) && (
                <div className="mb-6 p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4 animate-in slide-in-from-top-2 fade-in">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter Options</h4>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="text-xs text-rose-400 flex items-center gap-1 hover:underline">
                                <XCircle className="w-3 h-3" /> Clear All
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Date Range */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Date Range</label>
                            <div className="flex gap-2">
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                                />
                                <span className="text-slate-600 self-center">-</span>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Transaction Type</label>
                            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                                {['All', 'Expense', 'Income', 'Transfer'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFilters({...filters, type: t})}
                                        className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${filters.type === t ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                         {/* Account */}
                         <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Account</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                value={filters.account}
                                onChange={(e) => setFilters({...filters, account: e.target.value})}
                            >
                                <option value="All">All Accounts</option>
                                {data.accounts.map(acc => (
                                    <option key={acc.name} value={acc.name}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="space-y-2 md:space-y-3">
                {filteredTransactions.slice(0, 10).map((tx) => {
                    const style = getCategoryStyles(tx.category);
                    return (
                        <div key={tx.id} className="group flex items-center justify-between p-2 md:p-3 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center ${style.color} ${style.text} shadow-lg shadow-black/20`}>
                                    {style.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-white text-sm truncate pr-2">{tx.category}</div>
                                    <div className="text-[10px] md:text-xs text-slate-400 mt-0.5 truncate max-w-[120px] md:max-w-[200px]">{tx.date} • {tx.note || 'No note'}</div>
                                </div>
                            </div>

                            <div className="text-right flex items-center gap-4">
                                <div>
                                    <div className={`font-bold text-sm ${tx.type === 'Income' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-blue-400' : 'text-white'}`}>
                                        {tx.type === 'Income' ? '+' : tx.type === 'Transfer' ? '' : '-'} {displayValue(tx.amount, 'RM ')}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                        {tx.fromAccount} {tx.toAccount ? '→' : ''}
                                    </div>
                                </div>
                                
                                {/* Hover Actions */}
                                <div className="hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                    <button onClick={() => handleEdit(tx)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(tx)} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredTransactions.length === 0 && (
                     <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                        <Calendar className="w-12 h-12 text-slate-800 mb-2" />
                        No transactions found for this period.
                     </div>
                )}
            </div>

            {filteredTransactions.length > 10 && (
                <div className="mt-6 text-center">
                    <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center justify-center gap-1 w-full py-2 hover:bg-white/5 rounded-xl"
                    >
                        View All {filteredTransactions.length} Records <ArrowDownRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* RIGHT COLUMN (Sidebar) */}
      <div className="space-y-6">
        {/* Pie Chart Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col min-h-[400px]">
             <h3 className="font-bold text-xl text-white mb-6">Net Spending Breakdown</h3>
            <div className="flex-grow relative">
                {pieData.length > 0 && !hideValues ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={4}
                                onClick={(data) => setSelectedCategory(data.name)}
                                className="cursor-pointer focus:outline-none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => `RM ${value.toLocaleString()}`}
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '12px' }}
                                itemStyle={{ color: '#e2e8f0' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                     <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                        {hideValues ? 'Hidden' : 'No Data'}
                     </div>
                )}
                {/* Center Label for Pie */}
                {!hideValues && pieData.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">NET<br/>SPEND</span>
                    </div>
                )}
            </div>
            
            <div className="mt-6 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {fullBreakdown.map((entry, index) => (
                     <button 
                        key={entry.name} 
                        onClick={() => setSelectedCategory(entry.name)}
                        className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors group text-left"
                    >
                        <div className="flex items-center gap-3">
                             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] || '#64748b' }}></div>
                             <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">{entry.name}</span>
                        </div>
                        <span className={`font-bold text-sm ${entry.value < 0 ? 'text-emerald-400' : 'text-white'}`}>
                            {entry.value < 0 ? '+' : ''}{displayValue(Math.abs(entry.value))}
                        </span>
                     </button>
                ))}
            </div>
        </div>
      </div>

      {/* Category Details Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900">
                     <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">{selectedCategory} Details</h2>
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-bold">{categoryTransactions.length}</span>
                        </div>
                        <p className="text-sm text-slate-500">{isCustomDateMode ? 'Custom Range' : monthLabel}</p>
                     </div>
                     <button onClick={() => setSelectedCategory(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="overflow-y-auto p-4 flex-1 space-y-2">
                    {categoryTransactions.length > 0 ? (
                        categoryTransactions.map((tx) => (
                             <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 group transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-white font-medium">{tx.note || tx.category}</span>
                                    <span className="text-xs text-slate-500">{tx.date} • {tx.fromAccount} {tx.toAccount ? `→ ${tx.toAccount}` : ''}</span>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                    <span className={`font-bold ${tx.type === 'Income' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-blue-400' : 'text-slate-200'}`}>
                                        {tx.type === 'Income' ? '+' : tx.type === 'Transfer' ? '' : '-'} {displayValue(tx.amount, 'RM ')}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setSelectedCategory(null); handleEdit(tx); }} className="p-2 text-slate-500 hover:text-indigo-400 bg-slate-800/50 rounded-lg hover:bg-slate-800"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(tx)} className="p-2 text-slate-500 hover:text-rose-400 bg-slate-800/50 rounded-lg hover:bg-slate-800"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                            <Calendar className="w-10 h-10 text-slate-800 mb-2" />
                            No transactions found for this category.
                        </div>
                    )}
                </div>
                <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center text-sm">
                    <span className="text-slate-400">Total Net for {selectedCategory}</span>
                    <span className="text-white font-bold">
                        {displayValue(Math.abs(fullBreakdown.find(c => c.name === selectedCategory)?.value || 0))}
                    </span>
                </div>
            </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900">
                     <div>
                        <h2 className="text-xl font-bold text-white">Full Transaction List</h2>
                        <p className="text-sm text-slate-500">{isCustomDateMode ? 'Custom Range' : monthLabel}</p>
                     </div>
                     <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                <div className="overflow-y-auto p-4 flex-1 space-y-2">
                    {filteredTransactions.map((tx) => (
                         <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 group">
                            <div className="flex flex-col">
                                <span className="text-white font-medium">{tx.category}</span>
                                <span className="text-xs text-slate-500">{tx.date} • {tx.note}</span>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                <span className={`font-bold ${tx.type === 'Income' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-blue-400' : 'text-slate-200'}`}>
                                    {tx.type === 'Income' ? '+' : tx.type === 'Transfer' ? '' : '-'} {displayValue(tx.amount, 'RM ')}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setIsHistoryModalOpen(false); handleEdit(tx); }} className="p-2 text-slate-500 hover:text-indigo-400"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(tx)} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Edit Modal Wrapper */}
      <AddMoneyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={onRefresh}
        accounts={data.accounts}
        initialData={editingTransaction}
        incomeCategories={data.incomeCategories || []}
        expenseCategories={data.expenseCategories || []}
      />
    </div>
  );
};
