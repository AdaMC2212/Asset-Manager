'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface MoneyHeaderProps {
  monthLabel: string;
  isCustomDateMode: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onAddNew: () => void;
}

export const MoneyHeader: React.FC<MoneyHeaderProps> = ({
  monthLabel,
  isCustomDateMode,
  onPrevMonth,
  onNextMonth,
  onAddNew,
}) => {
  const [monthName, year] = monthLabel.split(' ');

  return (
    <div className="flex flex-row items-center justify-between gap-2 p-1 md:gap-6">
      <div
        className={`flex items-center gap-1 rounded-2xl border border-white/5 bg-slate-900/50 p-1 shadow-sm transition-opacity md:gap-2 md:p-1.5 ${
          isCustomDateMode ? 'pointer-events-none opacity-50 grayscale' : ''
        }`}
      >
        <button onClick={onPrevMonth} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:p-3">
          <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
        </button>
        <div className="flex min-w-[100px] flex-col items-center px-1 md:min-w-[140px] md:px-2">
          <span className="text-base font-bold tracking-tight text-white md:text-xl">{monthName}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 md:text-xs">{year}</span>
        </div>
        <button onClick={onNextMonth} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:p-3">
          <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      </div>

      <button
        onClick={onAddNew}
        className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 hover:bg-indigo-500 active:scale-95 md:px-6 md:py-3"
      >
        <Plus className="h-5 w-5" />
        <span className="hidden md:inline">Add New</span>
        <span className="md:hidden">Add</span>
      </button>
    </div>
  );
};
