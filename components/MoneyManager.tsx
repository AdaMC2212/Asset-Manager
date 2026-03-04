'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Wallet, ShoppingBag, Car, Zap, Utensils, Smartphone, Banknote, Calendar, X, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { MoneyManagerData, MoneyTransaction } from '../types';
import { AddMoneyModal } from './MoneyManager/AddMoneyModal';
import { MoneyActivityList, MoneyFilters } from './MoneyManager/MoneyActivityList';
import { MoneyBreakdownPanel } from './MoneyManager/MoneyBreakdownPanel';
import { MoneyHeader } from './MoneyManager/MoneyHeader';
import { MoneyStatsRow } from './MoneyManager/MoneyStatsRow';
import { deleteMoneyTransaction } from '../app/actions';

interface MoneyManagerProps {
  data: MoneyManagerData | null;
  loading: boolean;
  onRefresh: () => void;
  hideValues?: boolean;
  registerAddHandler?: (handler: () => void) => void;
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

export const MoneyManager: React.FC<MoneyManagerProps> = ({ data, loading, onRefresh, hideValues, registerAddHandler }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // State for Category Detail View
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [editingTransaction, setEditingTransaction] = useState<MoneyTransaction | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MoneyFilters>({
      type: 'All', // All, Income, Expense, Transfer
      account: 'All',
      startDate: '',
      endDate: ''
  });

  const { filteredTransactions, baseTransactionsForBreakdown, monthlyStats, pieData, fullBreakdown, isCustomDateMode } = useMemo(() => {
    if (!data) return { filteredTransactions: [], baseTransactionsForBreakdown: [], monthlyStats: { income: 0, expense: 0, balance: 0 }, pieData: [], fullBreakdown: [], isCustomDateMode: false };

    // 1. Determine Date Range Base
    let base = [];
    const useCustomDate = !!(filters.startDate && filters.endDate);
    
    if (useCustomDate) {
        base = data.transactions.filter(tx => tx.date >= filters.startDate && tx.date <= filters.endDate);
    } else {
        const targetMonth = selectedDate.getMonth();
        const targetYear = selectedDate.getFullYear();
        base = data.transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
        });
    }

    // 2. Filter by Account (Applied to both Activity List and Breakdown)
    if (filters.account !== 'All') {
        base = base.filter(tx => tx.fromAccount === filters.account || tx.toAccount === filters.account);
    }

    // 3. Activity List (Type Filter applied)
    let activityFiltered = [...base];
    if (filters.type !== 'All') {
        activityFiltered = activityFiltered.filter(tx => tx.type === filters.type);
    }

    // 4. Calculate Net Stats & Breakdown (Ignore Type Filter to show true Net flow for the month)
    let income = 0;
    let expense = 0;
    const catTotals: Record<string, number> = {};

    base.forEach(tx => {
        if (tx.type === 'Income') {
            income += tx.amount;
            catTotals[tx.category] = (catTotals[tx.category] || 0) - tx.amount;
        } else if (tx.type === 'Expense') {
            expense += tx.amount;
            catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
        }
    });

    const breakdown = Object.entries(catTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Pie chart shows positive net spending (actual cost centers)
    const pie = breakdown.filter(item => item.value > 0);

    return {
        filteredTransactions: activityFiltered,
        baseTransactionsForBreakdown: base,
        monthlyStats: { income, expense, balance: income - expense },
        pieData: pie,
        fullBreakdown: breakdown,
        isCustomDateMode: useCustomDate
    };
  }, [data, selectedDate, filters]);

  // Derived filtered list for the specific category modal
  // We use baseTransactionsForBreakdown so users see both income and expense for that category
  const { categoryTransactions, categorySummary } = useMemo(() => {
      if (!selectedCategory) return { categoryTransactions: [], categorySummary: { income: 0, expense: 0, net: 0 } };
      
      const transactions = baseTransactionsForBreakdown.filter(tx => tx.category === selectedCategory);
      
      let income = 0;
      let expense = 0;
      transactions.forEach(tx => {
          if (tx.type === 'Income') income += tx.amount;
          else if (tx.type === 'Expense') expense += tx.amount;
      });

      return { 
          categoryTransactions: transactions,
          categorySummary: { income, expense, net: expense - income }
      };
  }, [baseTransactionsForBreakdown, selectedCategory]);

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

  const hasActiveFilters = filters.type !== 'All' || filters.account !== 'All' || Boolean(filters.startDate && filters.endDate);

  useEffect(() => {
    if (!registerAddHandler) return;
    registerAddHandler(() => {
      setEditingTransaction(null);
      setIsModalOpen(true);
    });
  }, [registerAddHandler]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN (Main Focus) */}
      <div className="xl:col-span-2 space-y-4 md:space-y-8">
        
        <MoneyHeader
          monthLabel={monthLabel}
          isCustomDateMode={isCustomDateMode}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onAddNew={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
        />

        <MoneyStatsRow
          income={monthlyStats.income}
          expense={monthlyStats.expense}
          balance={monthlyStats.balance}
          isCustomDateMode={isCustomDateMode}
          hideValues={hideValues}
        />
        <MoneyActivityList
          filteredTransactions={filteredTransactions}
          filters={filters}
          accounts={data.accounts}
          showFilters={showFilters}
          hasActiveFilters={hasActiveFilters}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSetFilters={setFilters}
          onClearFilters={clearFilters}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewAll={() => setIsHistoryModalOpen(true)}
          displayValue={displayValue}
          getCategoryStyles={getCategoryStyles}
        />
      </div>

      {/* RIGHT COLUMN (Sidebar Breakdown) */}
      <div className="space-y-6">
        <MoneyBreakdownPanel
          pieData={pieData}
          fullBreakdown={fullBreakdown}
          hideValues={hideValues}
          colors={PIE_COLORS}
          onSelectCategory={setSelectedCategory}
          displayValue={displayValue}
        />
      </div>

      {/* Category Details Modal - Enhanced */}

      {selectedCategory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start p-6 border-b border-slate-800 bg-slate-900/50">
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`p-2 rounded-xl ${getCategoryStyles(selectedCategory).color}`}>
                                {getCategoryStyles(selectedCategory).icon}
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{selectedCategory}</h2>
                            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                {categoryTransactions.length} Items
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm ml-11">{isCustomDateMode ? 'Selected Range' : monthLabel}</p>
                     </div>
                     <button onClick={() => setSelectedCategory(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"><X className="w-6 h-6" /></button>
                </div>
                
                {/* Category Summary Header */}
                <div className="grid grid-cols-3 gap-2 px-6 py-4 bg-slate-950/30 border-b border-slate-800">
                    <div className="text-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Income</div>
                        <div className="text-sm font-bold text-emerald-400">{displayValue(categorySummary.income)}</div>
                    </div>
                    <div className="text-center border-x border-white/5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Expense</div>
                        <div className="text-sm font-bold text-rose-400">{displayValue(categorySummary.expense)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Net Flow</div>
                        <div className={`text-sm font-bold ${categorySummary.net <= 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
                            {categorySummary.net <= 0 ? '-' : ''}{displayValue(Math.abs(categorySummary.net))}
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto p-4 flex-1 space-y-1.5 custom-scrollbar">
                    {categoryTransactions.length > 0 ? (
                        categoryTransactions.map((tx) => (
                             <div key={tx.id} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 group transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg bg-slate-800/50 ${tx.type === 'Income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {tx.type === 'Income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-semibold text-sm">{tx.note || tx.category}</span>
                                        <span className="text-xs text-slate-500">{tx.date} • {tx.fromAccount || tx.toAccount}</span>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className={`font-bold text-sm ${tx.type === 'Income' ? 'text-emerald-400' : 'text-slate-100'}`}>
                                            {tx.type === 'Income' ? '+' : '-'} {displayValue(tx.amount, 'RM ')}
                                        </span>
                                        <span className="text-[10px] text-slate-600 font-medium uppercase">{tx.type}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
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
                
                <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-center">
                    <button 
                        onClick={() => setSelectedCategory(null)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl transition-all active:scale-95"
                    >
                        Close Details
                    </button>
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
