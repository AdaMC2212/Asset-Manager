'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PortfolioSummary } from '../types';

interface AllocationChartProps {
  data: PortfolioSummary | null;
}

const COLORS = {
  Stocks: '#4f7bff',
  ETF: '#27d18f',
  Crypto: '#f1b749',
  Cash: '#40c2ff',
  Other: '#7f8ba6',
};

export const AllocationChart: React.FC<AllocationChartProps> = ({ data }) => {
  const chartData = React.useMemo(() => {
    if (!data) return [];

    const assetMap: Record<string, number> = {
      Stocks: 0,
      ETF: 0,
      Crypto: 0,
      Cash: data.cashBalance || 0,
    };

    for (const holding of data.holdings) {
      let key = 'Other';
      if (holding.assetClass === 'Equity' || holding.assetClass === 'Stocks') key = 'Stocks';
      else if (holding.assetClass === 'ETF' || holding.assetClass === 'Index ETF') key = 'ETF';
      else if (holding.assetClass === 'Crypto') key = 'Crypto';
      assetMap[key] = (assetMap[key] || 0) + holding.currentValue;
    }

    return Object.entries(assetMap)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const totalValue = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <section className="panel rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-[var(--text-primary)]">Allocation Mix</h2>
        <span className="chip text-[var(--text-secondary)]">Asset class view</span>
      </div>

      <div className="h-[230px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                cornerRadius={5}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.Other} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [
                  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  `${((value / totalValue) * 100).toFixed(1)}%`,
                ]}
                contentStyle={{
                  backgroundColor: '#0d1529',
                  borderColor: 'rgba(205, 220, 255, 0.24)',
                  color: '#eaf0ff',
                  borderRadius: '14px',
                }}
                itemStyle={{ color: '#b8c3db' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">No allocation data available.</div>
        )}
      </div>

      <div className="mt-4 space-y-2 border-t border-[var(--border-soft)] pt-4">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-xl px-2 py-2 transition hover:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] || COLORS.Other }}
              />
              <span className="text-sm text-[var(--text-secondary)]">{item.name}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                ${item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">{((item.value / totalValue) * 100).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
