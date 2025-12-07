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
      if (h.assetClass === 'Equity' || h.assetClass === 'Stocks') key = 'Stocks';
      else if (h.assetClass === 'ETF' || h.assetClass === 'Index ETF') key = 'ETF';
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
    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col">
      <h2 className="text-xl font-bold text-white mb-6">Allocation</h2>
      
      {/* Chart Section */}
      <div className="flex-shrink-0 h-[220px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                cornerRadius={4}
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
                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '12px' }}
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

      {/* Breakdown List Section - Expanded */}
      <div className="mt-6 border-t border-white/5 pt-4">
        <div className="space-y-3">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]" 
                    style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] || COLORS.Other }}
                  ></div>
                  <span className="text-slate-300 font-medium text-sm">{item.name}</span>
              </div>
              <div className="text-right flex-shrink-0">
                  <div className="text-white font-bold text-sm">
                    ${item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {((item.value / totalValue) * 100).toFixed(1)}%
                  </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
