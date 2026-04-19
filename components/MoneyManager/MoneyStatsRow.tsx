'use client';

import React, { useRef } from 'react';
import { ArrowDownRight, ArrowUpRight, CreditCard } from 'lucide-react';
import { CountUp } from '../ui/CountUp';
import { CreditCardSettlementScope } from '../../types';

interface MoneyStatsRowProps {
  income: number;
  expense: number;
  outstanding: number;
  statement: number;
  balance: number;
  isCustomDateMode: boolean;
  hideValues?: boolean;
  onOpenOutstandingDetails?: () => void;
  creditCardView: CreditCardSettlementScope;
  onChangeCreditCardView: (scope: CreditCardSettlementScope) => void;
}

const StatTile = ({
  label,
  value,
  accentClass,
  dotClass,
  icon,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  accentClass: string;
  dotClass: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) => {
  const TileTag = onClick ? 'button' : 'div';

  return (
    <TileTag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50 p-3 text-left shadow-lg transition md:rounded-3xl md:p-5 ${
        onClick ? 'cursor-pointer hover:border-cyan-400/30 hover:bg-slate-900/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/40' : ''
      }`}
    >
      {icon ? <div className="absolute right-0 top-0 hidden p-8 opacity-5 transition duration-500 group-hover:scale-110 group-hover:opacity-10 md:block">{icon}</div> : null}
      <div className="relative z-10">
        <span className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider md:mb-3 md:px-3 md:py-1 md:text-xs ${accentClass}`}>
          <span className={`h-1 w-1 rounded-full md:h-1.5 md:w-1.5 ${dotClass}`} />
          {label}
        </span>
        <div className="break-words text-lg font-bold leading-tight text-white sm:text-xl md:text-2xl xl:text-[1.75rem]">{value}</div>
        {onClick ? <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-300/70">View cards</div> : null}
      </div>
    </TileTag>
  );
};

const CreditCardBalanceTile = ({
  outstanding,
  statement,
  hideValues,
  activeView,
  onChangeView,
  onClick,
}: {
  outstanding: number;
  statement: number;
  hideValues?: boolean;
  activeView: CreditCardSettlementScope;
  onChangeView: (scope: CreditCardSettlementScope) => void;
  onClick?: () => void;
}) => {
  const touchStartX = useRef<number | null>(null);
  const didSwipe = useRef(false);

  const currentValue = activeView === 'statement' ? statement : outstanding;
  const label = activeView === 'statement' ? 'Statement' : 'Outstanding';
  const helperText = activeView === 'statement' ? 'Swipe for outstanding' : 'Swipe for statement';
  const ctaText = activeView === 'statement' ? 'View statement' : 'View cards';

  return (
    <button
      type="button"
      onClick={() => {
        if (didSwipe.current) {
          didSwipe.current = false;
          return;
        }
        onClick?.();
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        touchStartX.current = null;

        if (Math.abs(deltaX) < 40) return;
        didSwipe.current = true;
        onChangeView(deltaX < 0 ? 'statement' : 'outstanding');
        window.setTimeout(() => {
          didSwipe.current = false;
        }, 180);
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50 p-3 text-left shadow-lg transition hover:border-cyan-400/30 hover:bg-slate-900/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 md:rounded-3xl md:p-5"
    >
      <div className="absolute right-0 top-0 hidden p-8 opacity-5 transition duration-500 group-hover:scale-110 group-hover:opacity-10 md:block">
        <CreditCard className="h-24 w-24 text-cyan-500" />
      </div>
      <div
        className="relative z-10 flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${activeView === 'outstanding' ? '0%' : '-50%'})`, width: '200%' }}
      >
        {(['outstanding', 'statement'] as CreditCardSettlementScope[]).map((scope) => {
          const isStatement = scope === 'statement';
          const scopeValue = isStatement ? statement : outstanding;
          return (
            <div key={scope} className="w-1/2 pr-3">
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 md:mb-3 md:px-3 md:py-1 md:text-xs">
                <span className="h-1 w-1 rounded-full bg-cyan-500 md:h-1.5 md:w-1.5" />
                {isStatement ? 'Statement' : 'Outstanding'}
              </span>
              <div className="break-words text-lg font-bold leading-tight text-white sm:text-xl md:text-2xl xl:text-[1.75rem]">
                {hideValues ? '****' : <CountUp end={scopeValue} prefix="RM " />}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-cyan-300/70">{isStatement ? 'Current cycle due' : 'All unpaid charges'}</div>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mt-3 flex items-center justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-300/70">{ctaText}</div>
        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <div className="hidden rounded-full border border-white/10 bg-slate-950/70 p-1 md:flex">
            {(['outstanding', 'statement'] as CreditCardSettlementScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => onChangeView(scope)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                  activeView === scope ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {scope === 'statement' ? 'Stmt' : 'Out'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 md:hidden">
            {(['outstanding', 'statement'] as CreditCardSettlementScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                aria-label={`Show ${scope}`}
                onClick={() => onChangeView(scope)}
                className={`h-2.5 w-2.5 rounded-full transition ${activeView === scope ? 'bg-cyan-300' : 'bg-slate-600'}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500 md:hidden">{helperText}</div>
    </button>
  );
};

export const MoneyStatsRow: React.FC<MoneyStatsRowProps> = ({
  income,
  expense,
  outstanding,
  statement,
  balance,
  isCustomDateMode,
  hideValues,
  onOpenOutstandingDetails,
  creditCardView,
  onChangeCreditCardView,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 md:gap-4">
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
      <CreditCardBalanceTile
        outstanding={outstanding}
        statement={statement}
        hideValues={hideValues}
        activeView={creditCardView}
        onChangeView={onChangeCreditCardView}
        onClick={onOpenOutstandingDetails}
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
