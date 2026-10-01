'use client';

import React from 'react';

interface BreakdownEntry { name: string; value: number; }
interface MoneyBreakdownPanelProps {
  pieData: BreakdownEntry[];
  fullBreakdown: BreakdownEntry[];
  hideValues?: boolean;
  colors: string[];
  onSelectCategory: (category: string) => void;
  displayValue: (value: number, prefix?: string) => string;
}

export const MoneyBreakdownPanel: React.FC<MoneyBreakdownPanelProps> = ({
  fullBreakdown, hideValues, colors, onSelectCategory, displayValue,
}) => {
  const max = Math.max(1, ...fullBreakdown.map((entry) => Math.abs(entry.value)));
  return (
    <section className="workspace-section">
      <div className="workspace-section-heading"><h3>Net Spending Breakdown</h3><span>MYR</span></div>
      <div className="workspace-breakdown">
        {fullBreakdown.map((entry, index) => (
          <button key={entry.name} type="button" className="workspace-bar-row py-2" onClick={() => onSelectCategory(entry.name)}>
            <span className="workspace-bar-label">
              <span>{entry.name}</span>
              <strong className={entry.value < 0 ? 'overview-positive' : ''}>{entry.value < 0 ? '+' : ''}{displayValue(Math.abs(entry.value))}</strong>
            </span>
            {!hideValues ? <span className="workspace-bar-track" aria-hidden="true">
              <span className="workspace-bar-fill" style={{ width: `${Math.abs(entry.value) / max * 100}%`, background: colors[index % colors.length] }} />
            </span> : null}
          </button>
        ))}
        {!fullBreakdown.length ? <p className="workspace-empty">No spending for this period.</p> : null}
      </div>
    </section>
  );
};
