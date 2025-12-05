'use client';

import React, { useState } from 'react';
import { Plus, Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Banknote, ShoppingBag, Car, Shirt, Coffee, Utensils, Music, Zap, Wifi, CalendarClock, Landmark, Smartphone, PiggyBank, Pencil, Trash2 } from 'lucide-react';
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

// Helper to get Category Icon for Transactions
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

// Helper to get Account Icon based on Category
const getAccountIcon = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('bank')) return <Landmark className="w-6 h-6 text-indigo-400" />;
  if (c.includes('wallet') || c.includes('pay') || c.includes('touch')) return <Smartphone className="w-6 h-6 text-blue-400" />;
  if (c.includes('card')) return <CreditCard className="w-6 h-6 text-emerald-400" />;
  if (c.includes('cash')) return <Banknote className="w-6 h-6 text-amber-400" />;
  if (c.includes('saving') || c.includes('deposit') || c.includes('epf') || c.includes('invest')) return <PiggyBank className="w-6 h-6 text-rose-400" />;
  return <Wallet className="w-6 h-6 text-slate-400" />;
};

const PIE_COLORS = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9'];

export const MoneyManager: React.FC<MoneyManagerProps> = ({ data, loading, onRefresh, hideValues }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<MoneyTransaction | null>(null);

  if (loading || !data) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div className="bg-slate-900 rounded-xl h-64"></div>
            <div className="bg-slate-900 rounded-xl h-64"></div>
            <div className="bg-slate-900 rounded-xl h-64"></div>
        </div>
    );
  }

  // Get current date for display
  const today = new Date();
  const currentMonthName = today.toLocaleString('default', { month: 'long' });

  // Determine Growth Trend
  const balanceGrowth = data.monthlyStats.income - data.monthlyStats.expense;
  const isPositiveTrend = balanceGrowth >= 0;

  // Filter out accounts with 0 balance
  const activeAccounts = data.accounts.filter(acc => acc.currentBalance !== 0);

  // Masking Helper
  const displayValue = (val: number, prefix: string = 'RM ') => {
    if (hideValues) return `${prefix} ****`;
    return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Prepare Pie Chart Data
  const pieData = data.categorySpending.map(cat => ({
      name: cat.category,
      value: cat.spent
  })).filter(d => d.value > 0);

  const handleDelete = async (tx: MoneyTransaction) => {
    if (!tx.rowIndex) return;
    if (confirm(`Are you sure you want to delete this transaction?\n${tx.date} - ${tx.category} (RM ${tx.amount})`)) {
        const res = await deleteMoneyTransaction(tx.rowIndex);
        if (res.success) {
            onRefresh();
        } else {
            alert("Failed to delete.");
        }
    }
  };

  const handleEdit = (tx: MoneyTransaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
      setEditingTransaction(null);
      setIsModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN (Main Content) */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* My Balance Section - Wrapped in SpotlightCard */}
        <SpotlightCard className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-sm" spotlightColor="rgba(99, 102, 241, 0.15)">
            <div className="flex-1 w-full">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-slate-400 font-medium text-sm">Total Wallet Balance</span>
                    <button 
                        onClick={handleAddNew}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20 z-10 relative"
                    >
                        <Plus className="w-3 h-3" />
                        New Transaction
                    </button>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                     {hideValues ? 'RM ****' : <CountUp end={data.totalBalance} prefix="RM " decimals={2} />}
                </h1>
                <div className="flex items-center gap-4 mb-6">
                    <div className={`${isPositiveTrend ? 'text-emerald-500' : 'text-rose-500'} text-sm font-medium flex items-center gap-1`}>
                        {isPositiveTrend ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span className="text-slate-200">Net {isPositiveTrend ? 'Savings' : 'Spend'}</span>
                    </div>
                    <span className="text-slate-500 text-sm">this month</span>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800 group hover:border-emerald-500/30 transition-colors flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-emerald-500/10 p-1.5 rounded-md">
                                <Banknote className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="text-slate-300 text-sm font-medium truncate">{currentMonthName} Income</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="text-xl lg:text-2xl font-bold text-white leading-none">
                                 {hideValues ? 'RM ****' : <CountUp end={data.monthlyStats.income} prefix="RM " />}
                            </div>
                            {data.monthlyStats.incomeGrowth !== 0 && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${data.monthlyStats.incomeGrowth >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {data.monthlyStats.incomeGrowth > 0 ? '+' : ''}{Math.round(data.monthlyStats.incomeGrowth)}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800 group hover:border-rose-500/30 transition-colors flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-rose-500/10 p-1.5 rounded-md">
                                <ArrowDownRight className="w-4 h-4 text-rose-500" />
                            </div>
                            <span className="text-slate-300 text-sm font-medium truncate">{currentMonthName} Expense</span>
                        </div>
                        <div className="flex items-end justify-between">
                             <div className="text-xl lg:text-2xl font-bold text-white leading-none">
                                 {hideValues ? 'RM ****' : <CountUp end={data.monthlyStats.expense} prefix="RM " />}
                            </div>
                            {data.monthlyStats.expenseGrowth !== 0 && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${data.monthlyStats.expenseGrowth <= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {data.monthlyStats.expenseGrowth > 0 ? '+' : ''}{Math.round(data.monthlyStats.expenseGrowth)}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </SpotlightCard>

        {/* Overview Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-white">Cash Flow Overview</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Income
                    </div>
                     <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span> Expenses
                    </div>
                </div>
            </div>
            <div className="h-[250px] w-full">
                {data.graphData.length > 0 && !hideValues ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.graphData}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ fontSize: 12 }}
                                formatter={(value: number) => `RM ${value.toLocaleString()}`}
                            />
                            <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                            <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                        {hideValues ? 'Chart hidden in privacy mode' : 'Not enough data for chart'}
                    </div>
                )}
            </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-800">
                        {data.transactions.slice(0, 10).map((tx) => (
                            <tr key={tx.id} className="group hover:bg-slate-800/30 transition-colors">
                                <td className="py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-slate-700 group-hover:text-white transition-colors border border-slate-700">
                                            {getTransactionCategoryIcon(tx.category)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{tx.note || tx.category}</div>
                                            <div className="text-xs text-slate-500">{tx.date} • {tx.category}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 text-xs text-slate-400 text-right hidden sm:table-cell">
                                    {tx.fromAccount} {tx.toAccount ? `→ ${tx.toAccount}` : ''}
                                </td>
                                <td className={`text-right font-medium ${tx.type === 'Income' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-blue-400' : 'text-rose-400'}`}>
                                    {tx.type === 'Income' ? '+' : tx.type === 'Transfer' ? '' : '-'} {displayValue(tx.amount)}
                                </td>
                                <td className="px-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleEdit(tx)}
                                            className="p-2 text-slate-500 hover:text-indigo-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(tx)}
                                            className="p-2 text-slate-500 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {data.transactions.length === 0 && (
                             <tr><td className="py-8 text-center text-slate-500">No transactions recorded.</td></tr>
                         )}
                    </tbody>
                </table>
                {data.transactions.length > 10 && (
                    <div className="mt-4 text-center">
                        <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View All Transactions</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* RIGHT COLUMN (Sidebar) */}
      <div className="space-y-6">
        
        {/* My Cards / Accounts Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-white">My Accounts</h3>
                <span className="text-xs text-slate-500">{activeAccounts.length} Active</span>
            </div>
            
            {/* Scrollable Container for many accounts */}
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                {activeAccounts.map((acc, idx) => {
                    return (
                        <div 
                            key={acc.name}
                            className="snap-center flex-shrink-0 w-72 relative rounded-xl p-5 overflow-hidden transition-all cursor-pointer shadow-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white border border-slate-700"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                     {acc.logoUrl ? (
                                        <img src={acc.logoUrl} alt={acc.name} className="w-10 h-10 rounded-full bg-white object-contain p-1" />
                                     ) : (
                                        <div className="bg-slate-800 p-2 rounded-full border border-slate-600">
                                            {getAccountIcon(acc.category)}
                                        </div>
                                     )}
                                     <div>
                                        <div className="font-bold text-sm truncate max-w-[120px] text-slate-200">{acc.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">{acc.category}</div>
                                     </div>
                                </div>
                            </div>
                             <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-xs uppercase mb-1 text-slate-500">Available Balance</div>
                                    <div className="text-xl font-bold">{displayValue(acc.currentBalance)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {activeAccounts.length === 0 && (
                     <div className="text-slate-500 text-sm py-4">No active accounts found.</div>
                )}
            </div>
        </div>

        {/* Expense Breakdown Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white">Expense Breakdown</h3>
            </div>
            <div className="flex-grow">
                {pieData.length > 0 && !hideValues ? (
                    <ResponsiveContainer width="100%" height={250}>
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
                            <Legend 
                                layout="horizontal" 
                                verticalAlign="bottom" 
                                align="center"
                                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                     <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        {hideValues ? 'Hidden in privacy mode' : 'No expense data this month'}
                     </div>
                )}
            </div>
        </div>

        {/* Spending List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-white">Top Categories</h3>
            </div>
            <div className="space-y-6">
                {data.categorySpending.slice(0, 5).map((cat, idx) => (
                    <div key={cat.category}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                                {cat.category}
                            </span>
                            <span className="text-slate-400">{displayValue(cat.spent)}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div 
                                className="h-1.5 rounded-full transition-all duration-500"
                                style={{ 
                                    width: `${Math.min(cat.percentage, 100)}%`,
                                    backgroundColor: PIE_COLORS[idx % PIE_COLORS.length]
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>

      <AddMoneyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={onRefresh}
        accounts={data.accounts}
        existingCategories={data.categories}
        initialData={editingTransaction}
      />
    </div>
  );
};