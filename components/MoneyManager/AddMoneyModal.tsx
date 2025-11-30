'use client';

import React, { useState } from 'react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { MoneyTransaction, MoneyAccount, MoneyTransactionType } from '../../types';
import { addMoneyTransaction } from '../../app/actions';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: MoneyAccount[];
  existingCategories?: string[];
}

const INCOME_CATEGORIES = [
    'Salary', 'Bonus', 'Allowance', 'Dividend', 'Food', 'Transport', 'Entertainment', 'Side Hustle'
];

const EXPENSE_CATEGORIES = [
    'Food', 'Transport', 'Bills', 'Fashion', 'Entertainment', 'Healthcare', 'Electronics', 'Side Hustle', 'Debt', 'Family'
];

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ isOpen, onClose, onSuccess, accounts, existingCategories = [] }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<MoneyTransaction>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Expense',
    category: '', // Start empty to force choice or type
    amount: 0,
    fromAccount: accounts[0]?.name || '',
    toAccount: '',
    note: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;
    
    // Default category if empty
    const finalCategory = formData.category || 'Uncategorized';

    setIsSubmitting(true);
    try {
      const result = await addMoneyTransaction({
          ...formData,
          category: finalCategory
      } as MoneyTransaction);
      
      if (result.success) {
        onSuccess();
        onClose();
        setFormData({
            date: new Date().toISOString().split('T')[0],
            type: 'Expense',
            category: '',
            amount: 0,
            fromAccount: accounts[0]?.name || '',
            toAccount: '',
            note: ''
        });
      } else {
        alert('Failed: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategories = formData.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">New Transaction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex bg-slate-800 p-1 rounded-lg mb-4">
            {['Expense', 'Income', 'Transfer'].map((t) => (
               <button
                 key={t}
                 type="button"
                 onClick={() => setFormData({...formData, type: t as MoneyTransactionType, category: ''})}
                 className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.type === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
               >
                 {t}
               </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Amount (RM)</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold"
                value={formData.amount || ''}
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div className="space-y-4">
             {formData.type === 'Transfer' ? (
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-400 mb-1">From</label>
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                            value={formData.fromAccount}
                            onChange={e => setFormData({...formData, fromAccount: e.target.value})}
                        >
                            <option value="">Select Account</option>
                            {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                        </select>
                    </div>
                    <div className="pt-6 text-slate-500"><ArrowRight className="w-5 h-5"/></div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-400 mb-1">To</label>
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                            value={formData.toAccount}
                            onChange={e => setFormData({...formData, toAccount: e.target.value})}
                        >
                             <option value="">Select Account</option>
                            {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                        </select>
                    </div>
                </div>
             ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            {formData.type === 'Expense' ? 'Pay With' : 'Deposit To'}
                        </label>
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                            value={formData.type === 'Expense' ? formData.fromAccount : formData.toAccount}
                            onChange={e => {
                                if (formData.type === 'Expense') setFormData({...formData, fromAccount: e.target.value});
                                else setFormData({...formData, toAccount: e.target.value});
                            }}
                        >
                            {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                        <input
                            type="text"
                            list="categories"
                            placeholder="Select or Type..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-600"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                        />
                        <datalist id="categories">
                            {currentCategories.map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>
                </div>
             )}

             <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Note (Optional)</label>
                <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                />
             </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-semibold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 text-white
                ${formData.type === 'Expense' ? 'bg-rose-600 hover:bg-rose-700' : 
                  formData.type === 'Income' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                  'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
};