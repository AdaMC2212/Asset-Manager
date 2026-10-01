'use client';

import React from 'react';
import { PortfolioSummary } from '../types';

interface AllocationChartProps {
  data: PortfolioSummary | null;
  hideValues?: boolean;
}

const COLORS: Record<string, string> = {
  Stocks: '#7ca6ff', ETF: '#6ed4a6', Crypto: '#e6b66d', Cash: '#b2a4de', Other: '#a5adb8',
};

export const AllocationChart: React.FC<AllocationChartProps> = ({ data, hideValues = false }) => {
  const chartData = React.useMemo(() => {
    if (!data) return [];
    const assetMap: Record<string, number> = { Cash: data.cashBalance || 0 };
    for (const holding of data.holdings) {
      const key = ['Equity', 'Stocks'].includes(holding.assetClass) ? 'Stocks'
        : ['ETF', 'Index ETF'].includes(holding.assetClass) ? 'ETF'
        : holding.assetClass === 'Crypto' ? 'Crypto' : 'Other';
      assetMap[key] = (assetMap[key] || 0) + holding.currentValue;
    }
    return Object.entries(assetMap).filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [data]);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="workspace-section">
      <div className="workspace-section-heading"><h2>Allocation Mix</h2><span>Asset class</span></div>
      {!hideValues && chartData.length > 0 ? (
        <div className="workspace-allocation-bar" aria-hidden="true">
          {chartData.map((item) => <span key={item.name} style={{ width: `${item.value / total * 100}%`, background: COLORS[item.name] }} />)}
        </div>
      ) : null}
      <div className="workspace-allocation-list">
        {chartData.map((item) => (
          <div className="workspace-allocation-row" key={item.name}>
            <span><i style={{ background: COLORS[item.name] }} />{item.name}</span>
            <div>
              {hideValues ? '****' : `$${item.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              <small>{hideValues ? '****' : `${(item.value / total * 100).toFixed(1)}%`}</small>
            </div>
          </div>
        ))}
      </div>
      {!chartData.length ? <p className="workspace-empty">{data ? 'No allocation data.' : 'Allocation is unavailable.'}</p> : null}
    </section>
  );
};
