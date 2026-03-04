'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface BreakdownEntry {
  name: string;
  value: number;
}

interface MoneyBreakdownPanelProps {
  pieData: BreakdownEntry[];
  fullBreakdown: BreakdownEntry[];
  hideValues?: boolean;
  colors: string[];
  onSelectCategory: (category: string) => void;
  displayValue: (value: number, prefix?: string) => string;
}

export const MoneyBreakdownPanel: React.FC<MoneyBreakdownPanelProps> = ({
  pieData,
  fullBreakdown,
  hideValues,
  colors,
  onSelectCategory,
  displayValue,
}) => {
  return (
    <div className="flex min-h-[400px] flex-col rounded-3xl border border-white/5 bg-slate-900/40 p-6 shadow-xl backdrop-blur-md">
      <h3 className="mb-6 text-xl font-bold text-white">Net Spending Breakdown</h3>
      <div className="relative flex-grow">
        {pieData.length > 0 && !hideValues ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                cornerRadius={4}
                onClick={(payload) => onSelectCategory(payload.name)}
                className="cursor-pointer focus:outline-none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} className="cursor-pointer transition-opacity hover:opacity-80" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `RM ${value.toLocaleString()}`}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: '#f8fafc',
                  borderRadius: '12px',
                }}
                itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">{hideValues ? 'Hidden' : 'No Data'}</div>
        )}

        {!hideValues && pieData.length > 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">
              NET
              <br />
              SPEND
            </span>
          </div>
        ) : null}
      </div>

      <div className="custom-scrollbar mt-6 max-h-[300px] space-y-2 overflow-y-auto pr-2">
        {fullBreakdown.map((entry, index) => (
          <button
            key={entry.name}
            onClick={() => onSelectCategory(entry.name)}
            className="group flex w-full items-center justify-between rounded-xl border border-transparent p-2.5 text-left transition-all hover:border-white/5 hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]" style={{ backgroundColor: colors[index % colors.length] || '#64748b' }} />
              <span className="text-sm font-semibold text-slate-300 transition-colors group-hover:text-white">{entry.name}</span>
            </div>
            <span className={`text-sm font-bold ${entry.value < 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
              {entry.value < 0 ? '+' : ''}
              {displayValue(Math.abs(entry.value))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
