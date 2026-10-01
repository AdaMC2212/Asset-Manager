'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PortfolioSummary } from '../types';

interface HoldingsTableProps {
  data: PortfolioSummary | null;
  hideValues?: boolean;
}

const currency = (value: number, hidden?: boolean) => hidden ? '$ ****'
  : `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ data, hideValues }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
  <section className="workspace-section">
    <div className="workspace-section-heading">
      <h2>Active Holdings</h2><span>{data ? `${data.holdings.length} assets / USD` : 'Unavailable'}</span>
    </div>
    <div className="workspace-table-scroll">
      <table className="workspace-table holdings-table">
        <thead><tr>
          <th className="holding-asset">Asset</th>
          <th className="numeric holding-price">Price</th>
          <th className="numeric holding-quantity">Qty</th>
          <th className="numeric">Value</th>
          <th className="numeric">P/L</th>
          <th className="numeric holding-weight">Weight</th>
        </tr></thead>
        <tbody>
          {data?.holdings.map((holding) => (
            <React.Fragment key={holding.ticker}>
            <tr>
              <td><div className="asset-cell">
                <span className="workspace-mark-small">{holding.ticker.slice(0, 2)}</span>
                <div>
                  <button type="button" className="holding-toggle" aria-label={`${holding.ticker} holding details`}
                    aria-expanded={expanded === holding.ticker}
                    onClick={() => setExpanded(expanded === holding.ticker ? null : holding.ticker)}>
                    <strong>{holding.ticker}</strong><ChevronDown size={14} aria-hidden="true" />
                  </button>
                  <small>{holding.sector}</small>
                </div>
              </div></td>
              <td className="numeric holding-price">{currency(holding.currentPrice)}</td>
              <td className="numeric holding-quantity">{hideValues ? '****' : holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
              <td className="numeric"><strong>{currency(holding.currentValue, hideValues)}</strong></td>
              <td className={`numeric ${holding.unrealizedPL >= 0 ? 'overview-positive' : 'overview-negative'}`}>
                {holding.unrealizedPL >= 0 && !hideValues ? '+' : ''}{currency(holding.unrealizedPL, hideValues)}
                <small>{hideValues ? '****' : `${holding.unrealizedPL >= 0 ? '+' : ''}${holding.unrealizedPLPercent.toFixed(2)}%`}</small>
              </td>
              <td className="numeric holding-weight">{hideValues ? '****' : `${holding.allocation.toFixed(1)}%`}</td>
            </tr>
            {expanded === holding.ticker ? <tr><td colSpan={6}>
              <dl className="holding-details">
                <div><dt>Current price</dt><dd>{currency(holding.currentPrice)}</dd></div>
                <div><dt>Quantity</dt><dd>{hideValues ? '****' : holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</dd></div>
                <div><dt>Average cost</dt><dd>{currency(holding.avgCost, hideValues)}</dd></div>
                <div><dt>Cost basis</dt><dd>{currency(holding.totalCost, hideValues)}</dd></div>
                <div><dt>Allocation</dt><dd>{hideValues ? '****' : `${holding.allocation.toFixed(1)}%`}</dd></div>
              </dl>
            </td></tr> : null}
            </React.Fragment>
          ))}
          {!data || data.holdings.length === 0 ? <tr><td colSpan={6} className="workspace-empty">
            {data ? 'No active holdings.' : 'Holdings are unavailable.'}
          </td></tr> : null}
        </tbody>
      </table>
    </div>
  </section>
  );
};
