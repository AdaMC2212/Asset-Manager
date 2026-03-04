'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Transaction, TradeAction } from '../types';
import { addTrade } from '../app/actions';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SECTOR_LOOKUP: Record<string, string> = {
  AAPL: 'Technology',
  MSFT: 'Technology',
  NVDA: 'Semiconductors',
  INTC: 'Semiconductors',
  AMD: 'Semiconductors',
  SMH: 'Semiconductors',
  META: 'Technology',
  GOOGL: 'Technology',
  GOOG: 'Technology',
  AMZN: 'Consumer Cyclical',
  PLTR: 'Technology',
  AVGO: 'Semiconductors',
  NFLX: 'Communication Services',
  CRM: 'Technology',
  ADBE: 'Technology',
  ORCL: 'Technology',
  CSCO: 'Technology',
  TSM: 'Semiconductors',
  QCOM: 'Semiconductors',
  MU: 'Semiconductors',
  TSLA: 'Automotive',
  F: 'Automotive',
  GM: 'Automotive',
  RIVN: 'Automotive',
  LCID: 'Automotive',
  JPM: 'Financials',
  BAC: 'Financials',
  V: 'Financials',
  MA: 'Financials',
  WFC: 'Financials',
  GS: 'Financials',
  MS: 'Financials',
  BLK: 'Financials',
  C: 'Financials',
  UNH: 'Healthcare',
  JNJ: 'Healthcare',
  PFE: 'Healthcare',
  LLY: 'Healthcare',
  MRK: 'Healthcare',
  ABBV: 'Healthcare',
  TMO: 'Healthcare',
  XOM: 'Energy',
  CVX: 'Energy',
  SHEL: 'Energy',
  COP: 'Energy',
  WMT: 'Consumer Defensive',
  KO: 'Consumer Defensive',
  PEP: 'Consumer Defensive',
  PG: 'Consumer Defensive',
  COST: 'Consumer Defensive',
  MCD: 'Consumer Cyclical',
  SBUX: 'Consumer Cyclical',
  NKE: 'Consumer Cyclical',
  VOO: 'Index ETF',
  SPY: 'Index ETF',
  QQQ: 'Index ETF',
  QQQM: 'Index ETF',
  IWM: 'Index ETF',
  VTI: 'Index ETF',
  VEA: 'Index ETF',
  VWO: 'Index ETF',
  BND: 'Bond ETF',
  GLD: 'Commodity ETF',
  XLE: 'Energy ETF',
  XLF: 'Financial ETF',
  XLK: 'Tech ETF',
  XLV: 'Healthcare ETF',
  IBIT: 'Crypto',
  BTC: 'Crypto',
  ETH: 'Crypto',
  COIN: 'Crypto',
  MSTR: 'Crypto Proxy',
};

export const AddTradeModal: React.FC<AddTradeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    action: TradeAction.BUY,
    assetClass: 'Equity',
    sector: 'Technology',
    ticker: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!formData.ticker) return;
    const upperTicker = formData.ticker.toUpperCase();
    const matchedSector = SECTOR_LOOKUP[upperTicker];

    if (!matchedSector) return;

    setFormData((prev) => ({ ...prev, sector: matchedSector }));

    if (['BTC', 'ETH', 'IBIT', 'COIN'].includes(upperTicker) || matchedSector === 'Crypto') {
      setFormData((prev) => ({ ...prev, assetClass: 'Crypto' }));
    } else if (['VOO', 'SPY', 'QQQ', 'QQQM', 'IWM', 'SMH'].includes(upperTicker) || matchedSector.includes('ETF')) {
      setFormData((prev) => ({ ...prev, assetClass: 'ETF' }));
    }
  }, [formData.ticker]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.ticker || !formData.quantity || !formData.price) return;

    setIsSubmitting(true);
    try {
      const result = await addTrade({
        date: formData.date,
        ticker: formData.ticker.toUpperCase(),
        action: formData.action,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        fees: Number(formData.fees || 0),
        assetClass: formData.assetClass,
        sector: formData.sector,
      });

      if (!result.success) {
        alert(`Failed to add trade: ${result.error}`);
        return;
      }

      onSuccess();
      onClose();
      setFormData({
        date: new Date().toISOString().split('T')[0],
        action: TradeAction.BUY,
        assetClass: 'Equity',
        sector: 'Technology',
        ticker: '',
        fees: 0,
      });
    } catch (err) {
      alert('Unexpected error while creating trade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel-elevated motion-zoom-in w-full max-w-2xl rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-5">
          <div>
            <h2 className="font-display text-2xl text-[var(--text-primary)]">Add Trade</h2>
            <p className="text-sm text-[var(--text-secondary)]">Record a buy or sell event with allocation metadata.</p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-white/5 hover:text-[var(--text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Date</label>
              <input
                type="date"
                required
                className="focus-ring w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={formData.date}
                onChange={(event) => setFormData({ ...formData, date: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Action</label>
              <select
                className="focus-ring w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={formData.action}
                onChange={(event) => setFormData({ ...formData, action: event.target.value as TradeAction })}
              >
                <option value={TradeAction.BUY}>Buy</option>
                <option value={TradeAction.SELL}>Sell</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Ticker</label>
              <input
                type="text"
                required
                placeholder="AAPL"
                className="focus-ring w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-base)] px-3 py-2 text-sm uppercase text-[var(--text-primary)]"
                value={formData.ticker}
                onChange={(event) => setFormData({ ...formData, ticker: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Sector</label>
              <select
                className="focus-ring w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={formData.sector}
                onChange={(event) => setFormData({ ...formData, sector: event.target.value })}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Quantity</label>
              <input
                type="number"
                step="0.0001"
                required
                className="focus-ring w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={formData.quantity ?? ''}
                onChange={(event) => setFormData({ ...formData, quantity: parseFloat(event.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                required
                className="focus-ring w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={formData.price ?? ''}
                onChange={(event) => setFormData({ ...formData, price: parseFloat(event.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Fees (USD)</label>
              <input
                type="number"
                step="0.01"
                className="focus-ring w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={formData.fees ?? ''}
                onChange={(event) => setFormData({ ...formData, fees: parseFloat(event.target.value) })}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving trade...
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
