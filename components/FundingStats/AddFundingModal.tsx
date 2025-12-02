'use client';

import React, { useState } from 'react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { addDeposit, addConversion } from '../../app/actions';

interface AddFundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'deposit' | 'conversion';

export const AddFundingModal: React.FC<AddFundingModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<Tab>('deposit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Deposit State
  const [depositData, setDepositData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    reason: ''
  });

  // Conversion State
  const [conversionData, setConversionData] = useState({
    date: new Date().toISOString().split('T')[0],
    myr: '',
    usd: '',
    rate: ''
  });

  // Auto-calc rate
  const handleConversionChange = (key: string, value: string) => {
    const newData = { ...conversionData, [key]: value };
    if (key === 'myr' || key === 'usd') {
        const myr = parseFloat(newData.myr);
        const usd = parseFloat(newData.usd);
        if (myr > 0 && usd > 0) {
            newData.rate = (myr / usd).toFixed(4);
        }
    }
    setConversionData(newData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        let result;
        if (activeTab === 'deposit') {
            result = await addDeposit({
                date: depositData.date,
                amount: parseFloat(depositData.amount),
                reason: depositData.reason
            });
        } else {
            result = await addConversion({
                date: conversionData.date,
                myr: parseFloat(conversionData.myr),
                usd: parseFloat(conversionData.usd),
                rate: parseFloat(conversionData.rate)
            });
        }

        if (result.success) {
            // Reset forms
            setDepositData({ date: new Date().toISOString().split('T')[0], amount: '', reason: '' });
            setConversionData({ date: new Date().toISOString().split('T')[0], myr: '', usd: '', rate: '' });
            onSuccess();
            onClose();
        } else {
            alert('Failed: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Add Cash Flow</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-slate-800">
            <button
                onClick={() => setActiveTab('deposit')}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'deposit' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                Deposit (MYR)
            </button>
            <button
                onClick={() => setActiveTab('conversion')}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'conversion' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                Conversion (MYR → USD)
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {activeTab === 'deposit' ? (
                <>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                        <input
                            type="date"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                            value={depositData.date}
                            onChange={e => setDepositData({...depositData, date: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Amount (MYR)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="e.g. 1000"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold"
                            value={depositData.amount}
                            onChange={e => setDepositData({...depositData, amount: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Reason</label>
                        <input
                            type="text"
                            placeholder="e.g. Salary Savings"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                            value={depositData.reason}
                            onChange={e => setDepositData({...depositData, reason: e.target.value})}
                        />
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                        <input
                            type="date"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                            value={conversionData.date}
                            onChange={e => handleConversionChange('date', e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">MYR In</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                                value={conversionData.myr}
                                onChange={e => handleConversionChange('myr', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">USD Out</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                                value={conversionData.usd}
                                onChange={e => handleConversionChange('usd', e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Exchange Rate (MYR/USD)</label>
                        <input
                            type="number"
                            step="0.00001"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm"
                            value={conversionData.rate}
                            onChange={e => setConversionData({...conversionData, rate: e.target.value})}
                        />
                        <p className="text-xs text-slate-500 mt-1">Auto-calculated if both amounts are filled.</p>
                    </div>
                </>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4"
            >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Transaction'}
            </button>
        </form>
      </div>
    </div>
  );
};