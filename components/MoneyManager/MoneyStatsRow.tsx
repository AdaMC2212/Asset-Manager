'use client';

import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { CountUp } from '../ui/CountUp';

interface MoneyStatsRowProps {
  income: number;
  expense: number;
  charged: number;
  outstanding: number;
  balance: number;
  isCustomDateMode: boolean;
  hideValues?: boolean;
}

const StatTile = ({
  label,
  value,
  accentClass,
  dotClass,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  accentClass: string;
  dotClass: string;
  icon?: React.ReactNode;
}) => (
  <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50 p-3 shadow-lg md:rounded-3xl md:p-6">
    {icon ? <div className="absolute right-0 top-0 hidden p-8 opacity-5 transition duration-500 group-hover:scale-110 group-hover:opacity-10 md:block">{icon}</div> : null}
    <div className="relative z-10 text-center md:text-left">
      <span className={`mb-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider md:mb-4 md:px-3 md:py-1 md:text-xs ${accentClass}`}>
        <span className={`h-1 w-1 rounded-full md:h-1.5 md:w-1.5 ${dotClass}`} />
        {label}
      </span>
      <div className="truncate text-sm font-bold text-white md:text-3xl">{value}</div>
    </div>
  </div>
);

export const MoneyStatsRow: React.FC<MoneyStatsRowProps> = ({ income, expense, charged, outstanding, balance, isCustomDateMode, hideValues }) => {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-4">
      <StatTile
        label={isCustomDateMode ? 'Inc' : 'Income'}
        accentClass="bg-emerald-500/10 text-emerald-400"
        dotClass="bg-emerald-500"
        icon={<ArrowDownRight className="h-24 w-24 text-emerald-500" />}
        value={hideValues ? '****' : <CountUp end={income} prefix="RM " />}
      />
      <StatTile
        label={isCustomDateMode ? 'Exp' : 'Expenses'}
        accentClass="bg-rose-500/10 text-rose-400"
        dotClass="bg-rose-500"
        icon={<ArrowUpRight className="h-24 w-24 text-rose-500" />}
        value={hideValues ? '****' : <CountUp end={expense} prefix="RM " />}
      />
      <StatTile
        label="Charged"
        accentClass="bg-amber-500/10 text-amber-400"
        dotClass="bg-amber-500"
        value={hideValues ? '****' : <CountUp end={charged} prefix="RM " />}
      />
      <StatTile
        label="Outstanding"
        accentClass="bg-cyan-500/10 text-cyan-400"
        dotClass="bg-cyan-500"
        value={hideValues ? '****' : <CountUp end={outstanding} prefix="RM " />}
      />
      <StatTile
        label="Net"
        accentClass="bg-indigo-500/10 text-indigo-400"
        dotClass="bg-indigo-500"
        value={
          hideValues ? (
            '****'
          ) : (
            <span className={balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {balance > 0 ? '+' : ''}
              <CountUp end={balance} prefix="RM " />
            </span>
          )
        }
      />
    </div>
  );
};
