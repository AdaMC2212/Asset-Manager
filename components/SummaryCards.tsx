import React from 'react';
import { ArrowUpRight, DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { PortfolioSummary } from '../types';
import { CountUp } from './ui/CountUp';

interface SummaryCardsProps {
  data: PortfolioSummary | null;
  loading: boolean;
  hideValues?: boolean;
}

const StatCard = ({
  title,
  value,
  note,
  icon,
  accent,
}: {
  title: string;
  value: React.ReactNode;
  note: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
}) => (
  <div className="kpi-card relative overflow-hidden p-6 sm:p-7">
    <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${accent}`} />
    <div className="relative z-10">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{title}</p>
        <div className="rounded-xl border border-[var(--border-soft)] bg-black/20 p-2 text-[var(--text-secondary)]">{icon}</div>
      </div>
      <div className="font-display text-3xl text-[var(--text-primary)] sm:text-4xl">{value}</div>
      <div className="mt-3 text-xs text-[var(--text-secondary)]">{note}</div>
    </div>
  </div>
);

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data, loading, hideValues }) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="kpi-card h-36 animate-pulse" />
        ))}
      </div>
    );
  }

  const isPositive = data.totalPL >= 0;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard
        title="Total Net Worth"
        accent="bg-[var(--accent-primary)]/20"
        icon={<Wallet className="h-4 w-4" />}
        value={hideValues ? '$ ****' : <CountUp end={data.netWorth} prefix="$" />}
        note={<span>Current aggregate value of all holdings and cash liquidity.</span>}
      />

      <StatCard
        title="Lifecycle Return"
        accent={isPositive ? 'bg-emerald-500/20' : 'bg-rose-500/20'}
        icon={isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        value={
          hideValues ? (
            isPositive ? '+$ ****' : '-$ ****'
          ) : (
            <>
              {isPositive ? '+' : ''}
              <CountUp end={data.totalPL} prefix="$" />
            </>
          )
        }
        note={
          <span className={isPositive ? 'text-emerald-300' : 'text-rose-300'}>
            {isPositive ? <ArrowUpRight className="mr-1 inline h-3.5 w-3.5" /> : null}
            {hideValues ? '****' : `${isPositive ? '+' : ''}${data.totalPLPercent.toFixed(2)}% all-time return`}
          </span>
        }
      />

      <StatCard
        title="Cash Liquidity"
        accent="bg-cyan-500/20"
        icon={<DollarSign className="h-4 w-4" />}
        value={hideValues ? '$ ****' : <CountUp end={data.cashBalance} prefix="$" />}
        note={<span>Uninvested capital available for new allocation decisions.</span>}
      />
    </div>
  );
};
