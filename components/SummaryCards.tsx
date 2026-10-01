import React from 'react';
import { PortfolioSummary } from '../types';

interface SummaryCardsProps {
  data: PortfolioSummary | null;
  loading: boolean;
  hideValues?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data, loading, hideValues }) => {
  if (loading) return <div className="workspace-metrics three-metrics animate-pulse h-28" aria-label="Loading portfolio" />;
  if (!data) return <p className="workspace-empty" role="status">Portfolio data is unavailable.</p>;
  const positive = data.totalPL >= 0;
  const currency = (value: number) => hideValues ? '$ ****' : `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="workspace-metrics three-metrics">
      <div className="workspace-metric">
        <p className="workspace-metric-label">Portfolio value <span>USD</span></p>
        <div className="workspace-metric-value">{currency(data.netWorth)}</div>
        <p className="workspace-metric-note">{data.holdings.length} active holdings</p>
      </div>
      <div className="workspace-metric">
        <p className="workspace-metric-label">Lifecycle return</p>
        <div className={`workspace-metric-value ${positive ? 'overview-positive' : 'overview-negative'}`}>
          {positive && !hideValues ? '+' : ''}{currency(data.totalPL)}
        </div>
        <p className={`workspace-metric-note ${positive ? 'overview-positive' : 'overview-negative'}`}>
          {hideValues ? '****' : `${positive ? '+' : ''}${data.totalPLPercent.toFixed(2)}% all time`}
        </p>
      </div>
      <div className="workspace-metric">
        <p className="workspace-metric-label">Available cash <span>USD</span></p>
        <div className="workspace-metric-value">{currency(data.cashBalance)}</div>
        <p className="workspace-metric-note">Uninvested cash</p>
      </div>
    </div>
  );
};
