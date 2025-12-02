'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PortfolioSummary } from '../types';

interface AllocationChartProps {
  data: PortfolioSummary | null;
}

const COLORS = {
  Stocks: '#6366f1', // Indigo
  ETF: '#10b981',    // Emerald
  Crypto: '#f59e0b', // Amber
  Cash: '#3b82f6',   // Blue
  Other: '#64748b'   // Slate
};

export const AllocationChart: React.FC<AllocationChartProps> = ({ data }) => {
  const chartData = React.useMemo(() => {
    if (!data) return [];
    
    // Group by Asset Class
    const assetMap: Record<string, number> = {
      Stocks: 0,
      ETF: 0,
      Crypto: 0,
      Cash: data.cashBalance || 0
    };
    
    data.holdings.forEach(h => {
      let key = 'Other';
      if (h.assetClass === 'Equity') key = 'Stocks';
      else if (h.assetClass === 'ETF') key = 'ETF';
      else if (h.assetClass === 'Crypto') key = 'Crypto';
      
      assetMap[key] = (assetMap[key] || 0) + h.currentValue;
    });

    return Object.entries(assetMap)
      .filter(([_, value]) => value > 0) // Remove empty categories
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const totalValue = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col h-full">
      <h2 className="text-lg font-semibold text-white mb-2">Asset Allocation</h2>
      
      {/* Chart Section */}
      <div className="flex-grow min-h-[220px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.Other} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [
                  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  `${((value / totalValue) * 100).toFixed(1)}%`
                ]}
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            No data available
          </div>
        )}
      </div>

      {/* Breakdown List Section */}
      <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
             <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] || COLORS.Other }}
                ></div>
                <span className="text-slate-300">{item.name}</span>
             </div>
             <div className="text-right">
                <div className="text-white font-medium">
                   ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500">
                   {((item.value / totalValue) * 100).toFixed(1)}%
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};