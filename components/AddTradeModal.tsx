'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Transaction, TradeAction } from '../types';
import { addTrade } from '../app/actions';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SECTOR_LOOKUP: Record<string, string> = {
  // Tech
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Semiconductors', INTC: 'Semiconductors', AMD: 'Semiconductors',
  SMH: 'Semiconductors', META: 'Technology', GOOGL: 'Technology', GOOG: 'Technology', AMZN: 'Consumer Cyclical', 
  PLTR: 'Technology', AVGO: 'Semiconductors', NFLX: 'Communication Services', CRM: 'Technology', ADBE: 'Technology',
  ORCL: 'Technology', CSCO: 'Technology', TSM: 'Semiconductors', QCOM: 'Semiconductors', MU: 'Semiconductors',
  
  // Auto
  TSLA: 'Automotive', F: 'Automotive', GM: 'Automotive', RIVN: 'Automotive', LCID: 'Automotive',

  // Financials
  JPM: 'Financials', BAC: 'Financials', V: 'Financials', MA: 'Financials', WFC: 'Financials',
  GS: 'Financials', MS: 'Financials', BLK: 'Financials', C: 'Financials',

  // Healthcare
  UNH: 'Healthcare', JNJ: 'Healthcare', PFE: 'Healthcare', LLY: 'Healthcare', MRK: 'Healthcare',
  ABBV: 'Healthcare', TMO: 'Healthcare',

  // Energy
  XOM: 'Energy', CVX: 'Energy', SHEL: 'Energy', COP: 'Energy',

  // Consumer
  WMT: 'Consumer Defensive', KO: 'Consumer Defensive', PEP: 'Consumer Defensive', PG: 'Consumer Defensive',
  COST: 'Consumer Defensive', MCD: 'Consumer Cyclical', SBUX: 'Consumer Cyclical', NKE: 'Consumer Cyclical',

  // ETFs
  VOO: 'Index ETF', SPY: 'Index ETF', QQQ: 'Index ETF', QQQM: 'Index ETF', IWM: 'Index ETF', 
  VTI: 'Index ETF', VEA: 'Index ETF', VWO: 'Index ETF', BND: 'Bond ETF', GLD: 'Commodity ETF',
  XLE: 'Energy ETF', XLF: 'Financial ETF', XLK: 'Tech ETF', XLV: 'Healthcare ETF',

  // Crypto
  IBIT: 'Crypto', BTC: 'Crypto', ETH: 'Crypto', COIN: 'Crypto', MSTR: 'Crypto Proxy'
};

export const AddTradeModal: React.FC<AddTradeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    action: TradeAction.BUY,
    assetClass: 'Equity',
    sector: 'Technology',
    ticker: '' // Initialize to empty string to ensure controlled input
  });

  // Auto-match sector when ticker changes
  useEffect(() => {
    if (formData.ticker) {
      const upperTicker = formData.ticker.toUpperCase();
      const matchedSector = SECTOR_LOOKUP[upperTicker];
      if (matchedSector) {
        setFormData(prev => ({ ...prev, sector: matchedSector }));
        
        // Auto set asset class for some known types
        if (['BTC', 'ETH', 'IBIT', 'COIN'].includes(upperTicker) || matchedSector === 'Crypto') {
             setFormData(prev => ({ ...prev, assetClass: 'Crypto' }));
        } else if (['VOO', 'SPY', 'QQQ', 'QQQM', 'IWM', 'SMH'].includes(upperTicker) || matchedSector.includes('ETF')) {
             setFormData(prev => ({ ...prev, assetClass: 'ETF' }));
        }
      }
    }
  }, [formData.ticker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticker || !formData.quantity || !formData.price) return;

    setIsSubmitting(true);
    try {
      // Prepare the simplified object expected by the Server Action
      const tradeData = {
        date: formData.date,
        ticker: formData.ticker.toUpperCase(),
        action: formData.action,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        fees: Number(formData.fees || 0),
        assetClass: formData.assetClass,
        sector: formData.sector
      };

      const result = await addTrade(tradeData);
      
      if (result.success) {
        onSuccess();
        onClose();
        // Reset form slightly but keep dates
        setFormData({
            date: new Date().toISOString().split('T')[0],
            action: TradeAction.BUY,
            assetClass: 'Equity',
            sector: 'Technology',
            ticker: '',
            fees: 0
        });
      } else {
        alert('Failed to add trade: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Add New Trade</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Action</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.action}
                onChange={e => setFormData({...formData, action: e.target.value as TradeAction})}
              >
                <option value={TradeAction.BUY}>Buy</option>
                <option value={TradeAction.SELL}>Sell</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Ticker</label>
              <input
                type="text"
                required
                placeholder="AAPL"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                value={formData.ticker}
                onChange={e => setFormData({...formData, ticker: e.target.value})}
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Sector</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.sector}
                onChange={e => setFormData({...formData, sector: e.target.value})}
              >
                <option value="Technology">Technology</option>
                <option value="Semiconductors">Semiconductors</option>
                <option value="Financials">Financials</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Consumer">Consumer</option>
                <option value="Consumer Cyclical">Consumer Cyclical</option>
                <option value="Consumer Defensive">Consumer Defensive</option>
                <option value="Energy">Energy</option>
                <option value="Automotive">Automotive</option>
                <option value="Index ETF">Index ETF</option>
                <option value="Crypto">Crypto</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Quantity</label>
              <input
                type="number"
                step="0.0001"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.quantity ?? ''}
                onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.price ?? ''}
                onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Fees ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.fees ?? ''}
                onChange={e => setFormData({...formData, fees: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving to Sheets...
                </>
              ) : (
                'Confirm Trade'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};