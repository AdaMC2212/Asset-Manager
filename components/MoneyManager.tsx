
'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Banknote, ShoppingBag, Car, Shirt, Zap, Wifi, Music, Utensils, Smartphone, PiggyBank, Pencil, Trash2, ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { MoneyManagerData, MoneyTransaction } from '../types';
import { AddMoneyModal } from './MoneyManager/AddMoneyModal';
import { deleteMoneyTransaction } from '../app/actions';
import { SpotlightCard } from './ui/SpotlightCard';
import { CountUp } from './ui/CountUp';

interface MoneyManagerProps {
  data: MoneyManagerData | null;
  loading: boolean;
  onRefresh: () => void;
  hideValues?: boolean;
}

const PIE_COLORS = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9'];

// Helper for Icons
const getTransactionCategoryIcon = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes('food') || c.includes('dining') || c.includes('mamak')) return <Utensils className="w-4 h-4" />;
  if (c.includes('transport') || c.includes('vehicle') || c.includes('fuel')) return <Car className="w-4 h-4" />;
  if (c.includes('shop') || c.includes('clothing') || c.includes('fashion')) return <Shirt className="w-4 h-4" />;
  if (c.includes('utility') || c.includes('bill')) return <Zap className="w-4 h-4" />;
  if (c.includes('internet')) return <Wifi className="w-4 h-4" />;
  if (c.includes('music') || c.includes('spotify')) return <Music className="w-4 h-4" />;
  if (c.includes('salary') || c.includes('income')) return <Banknote className="w-4 h-4" />;
  return <ShoppingBag className="w-4 h-4" />;
};

export const MoneyManager: React.FC<MoneyManagerProps> = ({ data, loading, onRefresh, hideValues }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<MoneyTransaction | null>(null);
  
  // Month Navigation State
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filter Data based on selected Month
  const { currentMonthTransactions, monthlyStats, pieData } = useMemo(() => {
    if (!data) return { currentMonthTransactions: [], monthlyStats: { income: 0, expense: 0, balance: 0 }, pieData: [] };

    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();

    const filtered = data.transactions.filter(tx => {
        // tx.date is YYYY-MM-DD
        const txDate = new Date(tx.date);
        return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
    });

    let income = 0;
    let expense = 0;
    const catTotals: Record<string, number> = {};

    filtered.forEach(tx => {
        if (tx.type === 'Income') {
            income += tx.amount;
        } else if (tx.type === 'Expense') {
            expense += tx.amount;
            catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
        }
    });

    const pie = Object.entries(catTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return {
        currentMonthTransactions: filtered,
        monthlyStats: { income, expense, balance: income - expense },
        pieData: pie
    };
  }, [data, selectedDate]);

  if (loading || !data) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div className="bg-slate-900 rounded-xl h-64 md:col-span-2"></div>
            <div className="bg-slate-900 rounded-xl h-64"></div>
        </div>
    );
  }

  // Helper Display
  const displayValue = (val: number, prefix: string = 'RM ') => {
    if (hideValues) return `${prefix} ****`;
    return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Month Navigation Handlers
  const prevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // CRUD
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN (Main Focus: Monthly Overview) */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Monthly Focus Card */}
        <SpotlightCard className="p-6 sm:p-8 flex flex-col gap-6 shadow-sm relative overflow-hidden" spotlightColor="rgba(16, 185, 129, 0.15)">
             {/* Month Navigator */}
             <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-4 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center min-w-[120px]">
                        <span className="text-white font-bold text-lg leading-none">{monthLabel.split(' ')[0]}</span>
                        <span className="text-slate-500 text-xs">{monthLabel.split(' ')[1]}</span>
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <button 
                    onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Transaction</span>
                </button>
             </div>

             {/* Monthly Big Stats */}
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2 z-10">
                <div className="bg-slate-950/40 p-5 rounded-2xl border border-emerald-500/20">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Income
                    </span>
                    <div className="text-2xl font-bold text-white mt-2">
                        {hideValues ? 'RM ****' : <CountUp end={monthlyStats.income} prefix="RM " />}
                    </div>
                </div>

                <div className="bg-slate-950/40 p-5 rounded-2xl border border-rose-500/20">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-rose-500"></div> Expenses
                    </span>
                    <div className="text-2xl font-bold text-white mt-2">
                        {hideValues ? 'RM ****' : <CountUp end={monthlyStats.expense} prefix="RM " />}
                    </div>
                </div>

                <div className="bg-slate-950/40 p-5 rounded-2xl border border-indigo-500/20">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Net
                    </span>
                    <div className={`text-2xl font-bold mt-2 ${monthlyStats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {hideValues ? 'RM ****' : (
                            <>
                                {monthlyStats.balance > 0 ? '+' : ''}
                                <CountUp end={monthlyStats.balance} prefix="RM " />
                            </>
                        )}
                    </div>
                </div>
             </div>
        </SpotlightCard>

        {/* Transactions List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    Transactions
                </h3>
                <span className="text-xs text-slate-500">{currentMonthTransactions.length} records</span>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-800">
                        {currentMonthTransactions.slice(0, 8).map((tx) => (
                            <tr key={tx.id} className="group hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 pr-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                                            {getTransactionCategoryIcon(tx.category)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white text-sm">{tx.category}</div>
                                            <div className="text-xs text-slate-500">{tx.date} • <span className="text-slate-400">{tx.note || '-'}</span></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 text-xs text-slate-400 text-right hidden sm:table-cell">
                                    {tx.fromAccount} {tx.toAccount ? `→ ${tx.toAccount}` : ''}
                                </td>
                                <td className={`text-right font-bold text-sm ${tx.type === 'Income' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-blue-400' : 'text-rose-400'}`}>
                                    {tx.type === 'Income' ? '+' : tx.type === 'Transfer' ? '' : '-'} {displayValue(tx.amount, 'RM ')}
                                </td>
                                <td className="pl-4 text-right w-10">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(tx)} className="text-slate-500 hover:text-indigo-400"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDelete(tx)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {currentMonthTransactions.length === 0 && (
                             <tr><td colSpan={4} className="py-12 text-center text-slate-500">No transactions found for {monthLabel}.</td></tr>
                         )}
                    </tbody>
                </table>
            </div>
            {currentMonthTransactions.length > 8 && (
                <div className="mt-4 text-center border-t border-slate-800 pt-4">
                    <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center justify-center gap-1 w-full"
                    >
                        View All Transactions <ArrowDownRight className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* RIGHT COLUMN (Sidebar - Secondary Info) */}
      <div className="space-y-6">
        {/* Expense Breakdown for Selected Month */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white">Monthly Expenses</h3>
            </div>
            <div className="flex-grow">
                {pieData.length > 0 && !hideValues ? (
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => `RM ${value.toLocaleString()}`}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#e2e8f0' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                     <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        {hideValues ? 'Hidden in privacy mode' : 'No expenses this month'}
                     </div>
                )}
            </div>
            <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {pieData.map((entry, index) => (
                     <div key={entry.name} className="flex justify-between text-xs">
                        <span className="flex items-center gap-2 text-slate-300">
                             <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                             {entry.name}
                        </span>
                        <span className="text-slate-400">{displayValue(entry.value)}</span>
                     </div>
                ))}
            </div>
        </div>
      </div>

      {/* MODALS */}
      <AddMoneyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={onRefresh}
        accounts={data.accounts}
        initialData={editingTransaction}
        incomeCategories={data.incomeCategories || []}
        expenseCategories={data.expenseCategories || []}
      />

      {/* History View Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900 rounded-t-xl z-10">
                     <div>
                        <h2 className="text-xl font-bold text-white">Transaction History</h2>
                        <p className="text-sm text-slate-500">{monthLabel}</p>
                     </div>
                     <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                <div className="overflow-y-auto p-4 flex-1">
                    <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-800">
                            {currentMonthTransactions.map((tx) => (
                                <tr key={tx.id} className="group hover:bg-slate-800/30">
                                    <td className="py-3 px-2">
                                        <div className="font-medium text-white text-sm">{tx.category}</div>
                                        <div className="text-xs text-slate-500">{tx.date} • {tx.note || '-'}</div>
                                    </td>
                                    <td className="px-2 text-xs text-slate-400 text-right whitespace-nowrap">
                                        {tx.fromAccount} {tx.toAccount ? `→` : ''} <br/> {tx.toAccount}
                                    </td>
                                    <td className={`text-right font-bold text-sm whitespace-nowrap px-2 ${tx.type === 'Income' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-blue-400' : 'text-rose-400'}`}>
                                        {tx.type === 'Income' ? '+' : tx.type === 'Transfer' ? '' : '-'} {displayValue(tx.amount, 'RM ')}
                                    </td>
                                    <td className="w-10 text-right px-2">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => { setIsHistoryModalOpen(false); handleEdit(tx); }} className="text-slate-500 hover:text-indigo-400"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(tx)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
