'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MoneyHeaderProps {
  monthLabel: string;
  isCustomDateMode: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const MoneyHeader: React.FC<MoneyHeaderProps> = ({ monthLabel, isCustomDateMode, onPrevMonth, onNextMonth }) => (
  <div className="money-toolbar">
    <h2 className="text-base font-semibold">Monthly cash flow</h2>
    <div className={`workspace-period${isCustomDateMode ? ' is-custom' : ''}`}>
      <button type="button" onClick={onPrevMonth} disabled={isCustomDateMode} aria-label="Previous month" title="Previous month" className="workspace-icon-button"><ChevronLeft size={18} /></button>
      <strong>{monthLabel}</strong>
      <button type="button" onClick={onNextMonth} disabled={isCustomDateMode} aria-label="Next month" title="Next month" className="workspace-icon-button"><ChevronRight size={18} /></button>
    </div>
  </div>
);
