
'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { MoneyTransaction, MoneyAccount, MoneyTransactionType } from '../../types';
import { addMoneyTransaction, updateMoneyTransaction } from '../../app/actions';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: MoneyAccount[];
  initialData?: MoneyTransaction | null;
  incomeCategories: string[];
  expenseCategories: string[];
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ 
    isOpen, onClose, onSuccess, accounts, initialData, incomeCategories, expenseCategories
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<MoneyTransaction>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Expense',
    category: '', 
    amount: 0,
    fromAccount: '',
    toAccount: '',
    note: ''
  });
  
  const [customCategory, setCustomCategory] = useState('');

  // 1. Identify "Relevant" accounts
  const relevantAccounts = accounts.filter(a => {
      const cat = a.category.toLowerCase();
      return (cat.includes('bank') || cat.includes('wallet') || cat.includes('pay'));
  });

  // 2. Source Accounts (For Expenses/Transfer Out): Must have balance > 0
  const sourceAccounts = relevantAccounts.filter(a => a.currentBalance > 0);

  // 3. Destination Accounts (For Income/Transfer In)
  const destAccounts = relevantAccounts;

  const currentCategories = formData.type === 'Income' ? incomeCategories : expenseCategories;

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        amount: Number(initialData.amount)
      });
      
      // If the initial category is NOT in the list (and not empty), assume it's custom/Other
      if (initialData.category && !currentCategories.includes(initialData.category)) {
          // If it's a known category but not in the *current* list (e.g. switching types), don't force Other yet
          // But if it's truly unknown, set to Other and fill custom
          setFormData(prev => ({ ...prev, category: 'Other' }));
          setCustomCategory(initialData.category);
      } else {
          setCustomCategory('');
      }

    } else {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            type: 'Expense',
            category: '',
            amount: 0,
            fromAccount: sourceAccounts[0]?.name || '',
            toAccount: '',
            note: ''
        });
        setCustomCategory('');
    }
  }, [initialData, isOpen, accounts, currentCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;
    
    let finalCategory = formData.category;
    if (finalCategory === 'Other') {
        if (!customCategory.trim()) {
            alert("Please specify the category.");
            return;
        }
        finalCategory = customCategory.trim();
    }
    
    if (!finalCategory) finalCategory = 'Uncategorized';

    const payload = {
        ...formData,
        category: finalCategory
    } as MoneyTransaction;

    setIsSubmitting(true);
    try {
      let result;
      if (initialData && initialData.rowIndex) {
        result = await updateMoneyTransaction(initialData.rowIndex, payload);
      } else {
        result = await addMoneyTransaction(payload);
      }
      
      if (result.success) {
        onSuccess();
        onClose();
        setFormData({
            date: new Date().toISOString().split('T')[0],
            type: 'Expense',
            category: '',
            amount: 0,
            fromAccount: sourceAccounts[0]?.name || '',
            toAccount: '',
            note: ''
        });
        setCustomCategory('');
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

  const availableAccounts = formData.type === 'Income' ? destAccounts : sourceAccounts;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Transaction' : 'New Transaction'}
          </h2>
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
                 onClick={() => {
                     setFormData({...formData, type: t as MoneyTransactionType, category: ''});
                     setCustomCategory('');
                 }}
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
                            {sourceAccounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
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
                            {destAccounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
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
                            {availableAccounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                            
                            {initialData && (formData.fromAccount || formData.toAccount) && 
                             !availableAccounts.find(a => a.name === (formData.type === 'Expense' ? formData.fromAccount : formData.toAccount)) && (
                                <option value={formData.type === 'Expense' ? formData.fromAccount : formData.toAccount}>
                                    {formData.type === 'Expense' ? formData.fromAccount : formData.toAccount}
                                </option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white appearance-none"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                            <option value="">Select Category</option>
                            {currentCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="Other">Other...</option>
                        </select>
                    </div>
                </div>
             )}

             {/* Custom Category Input if "Other" is selected */}
             {formData.type !== 'Transfer' && formData.category === 'Other' && (
                 <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-sm font-medium text-indigo-400 mb-1">Specify Category</label>
                    <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Enter category name..."
                        className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                    />
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
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? 'Update Transaction' : 'Confirm Transaction')}
          </button>
        </form>
      </div>
    </div>
  );
};
