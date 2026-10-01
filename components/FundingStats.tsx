'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CashFlowSummary, PortfolioSummary } from '../types';
import { WorkspaceTabs } from './ui/WorkspaceTabs';

interface FundingStatsProps {
  cashFlow: CashFlowSummary | null;
  portfolio: PortfolioSummary | null;
  hideValues?: boolean;
}

const displayValue = (value: number, prefix: string, hide?: boolean) =>
  hide ? `${prefix} ****` : `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const FundingStats: React.FC<FundingStatsProps> = ({ cashFlow, portfolio, hideValues }) => {
  const [tab, setTab] = useState<'deposits' | 'conversions'>('deposits');
  if (!cashFlow) return <p className="workspace-empty" role="status">Funding data is unavailable.</p>;

  const lifecyclePL = portfolio ? portfolio.netWorth - cashFlow.totalConvertedUSD : null;
  const lifecyclePercent = lifecyclePL !== null && cashFlow.totalConvertedUSD > 0
    ? lifecyclePL / cashFlow.totalConvertedUSD * 100 : 0;
  const latest = [...cashFlow.conversions].sort((a, b) => b.date.localeCompare(a.date))[0];
  const reverse = latest && latest.amountMYR < 0 && latest.amountUSD < 0;
  const metrics = [
    { label: 'Net Deposited MYR', value: displayValue(cashFlow.totalDepositedMYR, 'RM ', hideValues), note: 'Deposits less withdrawals' },
    { label: 'Net Converted USD', value: displayValue(cashFlow.totalConvertedUSD, '$', hideValues), note: `Avg FX: ${hideValues ? '****' : cashFlow.avgRate.toFixed(4)} MYR/USD` },
    { label: 'Available cash USD', value: portfolio ? displayValue(portfolio.cashBalance, '$', hideValues) : 'Unavailable', note: 'Uninvested cash' },
    { label: 'Lifecycle P/L', value: lifecyclePL === null ? 'Unavailable' : displayValue(lifecyclePL, lifecyclePL >= 0 && !hideValues ? '+$' : '$', hideValues),
      note: lifecyclePL === null ? 'Portfolio unavailable' : hideValues ? '****' : `${lifecyclePercent >= 0 ? '+' : ''}${lifecyclePercent.toFixed(2)}% total return`,
      color: lifecyclePL === null || hideValues ? '' : lifecyclePL >= 0 ? 'overview-positive' : 'overview-negative' },
  ];

  return (
    <div className="workspace-stack">
      <div className="workspace-metrics">
        {metrics.map((metric) => <div className="workspace-metric" key={metric.label}>
          <p className="workspace-metric-label">{metric.label}</p>
          <div className={`workspace-metric-value ${metric.color || ''}`}>{metric.value}</div>
          <p className={`workspace-metric-note ${metric.color || ''}`}>{metric.note}</p>
        </div>)}
      </div>
      <div className="workspace-columns">
        <section className="workspace-section">
          <WorkspaceTabs id="funding" label="Funding history" value={tab} onChange={setTab}
            items={[{ value: 'deposits', label: 'Deposits & withdrawals' }, { value: 'conversions', label: 'Conversions' }]} />
          <div role="tabpanel" id={`funding-panel-${tab}`} aria-labelledby={`funding-tab-${tab}`}>
            <div className="workspace-section-heading">
              <h2>{tab === 'deposits' ? 'Deposit / Withdrawal History (MYR)' : 'USD Conversions'}</h2>
              <span>{tab === 'deposits' ? cashFlow.deposits.length : cashFlow.conversions.length} records</span>
            </div>
            <div className="workspace-table-scroll">
              {tab === 'deposits' ? (
                <table className="workspace-table">
                  <thead><tr><th>Date</th><th>Reason</th><th className="numeric">Amount (MYR)</th></tr></thead>
                  <tbody>
                    {cashFlow.deposits.map((deposit, index) => (
                      <tr key={`${deposit.date}-${index}`}>
                        <td>{deposit.date}</td><td>{deposit.reason || '-'}</td>
                        <td className={`numeric ${deposit.amountMYR < 0 ? 'overview-negative' : 'overview-positive'}`}>
                          {displayValue(deposit.amountMYR, 'RM ', hideValues)}
                        </td>
                      </tr>
                    ))}
                    {!cashFlow.deposits.length ? <tr><td colSpan={3} className="workspace-empty">No deposits or withdrawals.</td></tr> : null}
                  </tbody>
                </table>
              ) : (
                <table className="workspace-table">
                  <thead><tr><th>Date</th><th className="numeric">MYR</th><th className="numeric">Rate</th><th className="numeric">USD</th></tr></thead>
                  <tbody>
                    {cashFlow.conversions.map((conversion, index) => (
                      <tr key={`${conversion.date}-${index}`}>
                        <td>{conversion.date}</td>
                        <td className="numeric">{displayValue(conversion.amountMYR, '', hideValues)}</td>
                        <td className="numeric">{hideValues ? '****' : conversion.rate.toFixed(4)}</td>
                        <td className="numeric">{displayValue(conversion.amountUSD, '$', hideValues)}</td>
                      </tr>
                    ))}
                    {!cashFlow.conversions.length ? <tr><td colSpan={4} className="workspace-empty">No conversions recorded.</td></tr> : null}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
        <section className="workspace-section">
          <div className="workspace-section-heading"><h2>Latest conversion</h2><span>{latest?.date}</span></div>
          {latest ? (
            <div className="workspace-conversion">
              <strong>
                {displayValue(reverse ? -latest.amountUSD : latest.amountMYR, reverse ? 'USD ' : 'MYR ', hideValues)}
                <ArrowRight size={16} aria-hidden="true" />
                {displayValue(reverse ? -latest.amountMYR : latest.amountUSD, reverse ? 'MYR ' : 'USD ', hideValues)}
              </strong>
              <p>{hideValues ? '****' : latest.rate.toFixed(4)} MYR / USD</p>
            </div>
          ) : <p className="workspace-empty">No conversions recorded.</p>}
        </section>
      </div>
    </div>
  );
};
