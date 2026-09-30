'use client';

import React from 'react';
import { ArrowLeftRight, ArrowUpRight, ChevronRight, Plus, Wallet } from 'lucide-react';
import { CashFlowSummary, MoneyManagerData, PortfolioSummary } from '../types';
import { MoneyViewRequest } from '../types/ui';
import { getOverviewSummary } from '../lib/overview';
import { localISODate } from '../lib/dates';
import { useReadOnly } from './WorkspaceMode';

interface OverviewProps {
  money: MoneyManagerData | null;
  portfolio: PortfolioSummary | null;
  cashFlow: CashFlowSummary | null;
  hideBalance: boolean;
  hideInvestments: boolean;
  onOpenMoney: (request?: MoneyViewRequest) => void;
  onOpenInvestments: () => void;
  onOpenFunding: () => void;
  onAddTransaction: () => void;
}

const amount = (value: number | undefined, hidden: boolean, decimals = 2) =>
  hidden ? '****' : value === undefined ? 'Unavailable' : value.toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const Overview: React.FC<OverviewProps> = ({
  money, portfolio, cashFlow, hideBalance, hideInvestments, onOpenMoney,
  onOpenInvestments, onOpenFunding, onAddTransaction,
}) => {
  const readOnly = useReadOnly();
  const date = new Date();
  const summary = getOverviewSummary(money, portfolio, cashFlow, date);
  const { cashAccounts, latestConversion, recentTransactions } = summary;
  const reverseConversion = latestConversion && latestConversion.amountMYR < 0 && latestConversion.amountUSD < 0;
  const conversionFrom = reverseConversion ? 'USD' : 'MYR';
  const conversionTo = reverseConversion ? 'MYR' : 'USD';
  const moneyValue = (value: number, decimals = 2) => amount(money ? value : undefined, hideBalance, decimals);
  const investmentValue = (value: number, decimals = 2) => amount(portfolio ? value : undefined, hideInvestments, decimals);
  const profit = portfolio && !hideInvestments && summary.unrealizedPL > 0 ? '+' : '';
  const profitClass = summary.unrealizedPL >= 0 ? 'overview-positive' : 'overview-negative';
  const recent = recentTransactions[0];
  const account = cashAccounts[0];
  const transactionAccount = (transaction: NonNullable<typeof recent>) =>
    transaction.type === 'Income' ? transaction.toAccount : transaction.fromAccount;
  const transactionAmount = (transaction: NonNullable<typeof recent>, currency = false) =>
    `${hideBalance ? '' : transaction.type === 'Income' ? '+' : transaction.type === 'Expense' ? '-' : ''}${currency ? 'MYR ' : ''}${amount(transaction.amount, hideBalance)}`;

  return (
    <div className="overview">
      <section className="overview-summaries" aria-label="Currency summaries">
        <div className="overview-currency-group">
          <div className="overview-currency-heading"><Wallet size={20} strokeWidth={1.6} className="overview-positive" /><span>Money / MYR</span></div>
          <div className="overview-metrics">
            <button type="button" className="overview-metric overview-metric-main focus-ring" onClick={() => onOpenMoney()}>
              <span className="overview-desktop-only">Cash &amp; wallets</span>
              <span className="overview-mobile-only">Cash &amp; wallets / MYR</span>
              <strong className="overview-desktop-only">{moneyValue(summary.cashBalance)}</strong>
              <strong className="overview-mobile-only">{moneyValue(summary.cashBalance, 0)}</strong>
              <small>{money ? `${cashAccounts.length} accounts` : 'Money data unavailable'}</small>
            </button>
            <button type="button" className="overview-metric overview-metric-secondary focus-ring" onClick={() => onOpenMoney({ kind: 'cards' })}>
              <span>Card outstanding</span>
              <strong className="overview-negative">{moneyValue(summary.outstanding)}</strong>
              <small>Statement {moneyValue(summary.statement)}</small>
            </button>
          </div>
        </div>
        <div className="overview-currency-group">
          <div className="overview-currency-heading"><ArrowUpRight size={20} strokeWidth={1.6} className="overview-accent" /><span>Investments / USD</span></div>
          <div className="overview-metrics">
            <button type="button" className="overview-metric overview-metric-main focus-ring" onClick={onOpenInvestments}>
              <span className="overview-desktop-only">Portfolio value</span>
              <span className="overview-mobile-only">Portfolio / USD</span>
              <strong className="overview-desktop-only">{amount(portfolio?.netWorth, hideInvestments)}</strong>
              <strong className="overview-mobile-only">{amount(portfolio?.netWorth, hideInvestments, 0)}</strong>
              <small className="overview-desktop-only">Holdings + cash</small>
              <small className={`overview-mobile-only ${profitClass}`}>{profit}{investmentValue(summary.unrealizedPercent)}{hideInvestments || !portfolio ? '' : '%'} unrealized</small>
            </button>
            <button type="button" className="overview-metric overview-metric-secondary focus-ring" onClick={onOpenInvestments}>
              <span>Unrealized P/L</span>
              <strong className={profitClass}>{profit}{investmentValue(summary.unrealizedPL)}</strong>
              <small className={profitClass}>{profit}{investmentValue(summary.unrealizedPercent)}{hideInvestments || !portfolio ? '' : '%'} on open holdings</small>
            </button>
          </div>
        </div>
      </section>

      <div className="overview-body">
        <section className="overview-cash-flow" aria-labelledby="overview-cash-flow-title">
          <div className="overview-section-heading">
            <h2 id="overview-cash-flow-title"><span className="overview-desktop-only">{date.toLocaleDateString('en-GB', { month: 'long' })} cash flow</span><span className="overview-mobile-only">This month</span></h2>
            <span className="overview-accent">MYR</span>
          </div>
          <div className="overview-flow-totals">
            <div><span>Income</span><strong className="overview-positive">{moneyValue(summary.income, 0)}</strong></div>
            <div><span>Expenses</span><strong className="overview-negative">{moneyValue(summary.expense, 0)}</strong></div>
            <div><span><span className="overview-desktop-only">Net income</span><span className="overview-mobile-only">Net</span></span><strong>{moneyValue(summary.net, 0)}</strong></div>
          </div>
          <div className={`overview-flow-bar${hideBalance ? ' is-private' : ''}`} aria-hidden="true">
            {!hideBalance && money ? <>
              {summary.expenseShare > 0 ? <span className="overview-flow-spent" style={{ flex: summary.expenseShare }} /> : null}
              {summary.remainingShare > 0 ? <span className="overview-flow-remaining" style={{ flex: summary.remainingShare }} /> : null}
            </> : null}
          </div>
        </section>

        <section className="overview-attention" aria-labelledby="overview-attention-title">
          <div className="overview-section-heading"><h2 id="overview-attention-title">Needs attention</h2></div>
          {money ? <button type="button" className={`overview-statement focus-ring${summary.statement > 0 ? ' is-unpaid' : ''}`} onClick={() => onOpenMoney({ kind: 'cards' })}>
            <span className="overview-account-mark overview-mobile-only">C</span>
            <span className="overview-statement-description">
              <span className="overview-desktop-only">Card statement / MYR</span>
              <span className="overview-mobile-only">Card statement</span>
              <small className="overview-mobile-only">{summary.statement > 0 ? 'Billed & unpaid' : 'No unpaid statement'}</small>
            </span>
            <strong><span className="overview-mobile-only">MYR </span><span className="overview-desktop-only">{moneyValue(summary.statement)}</span><span className="overview-mobile-only">{moneyValue(summary.statement, 0)}</span></strong>
            <span className="overview-statement-footer">
              <span className="overview-desktop-only">{summary.statement > 0 ? 'Billed & unpaid' : 'Up to date'}</span>
              <span className="overview-desktop-only">View &amp; settle <ChevronRight size={12} /></span>
              <span className="overview-mobile-only">{readOnly || summary.statement === 0 ? 'View cards' : 'Settle'}</span>
            </span>
          </button> : <p className="overview-empty">Card data unavailable.</p>}
        </section>

        <section className="overview-conversion" aria-labelledby="overview-conversion-title">
          <div className="overview-section-heading"><h2 id="overview-conversion-title">Latest conversion</h2><button type="button" className="overview-text-action focus-ring" onClick={onOpenFunding}>History</button></div>
          {latestConversion ? <button type="button" className="overview-conversion-details focus-ring" onClick={onOpenFunding}>
            <ArrowLeftRight size={20} strokeWidth={1.6} className="overview-mobile-only overview-accent" />
            <span>
              <strong>{conversionFrom} {amount(reverseConversion ? -latestConversion.amountUSD : latestConversion.amountMYR, hideInvestments, 0)} <ChevronRight size={14} /> {conversionTo} {amount(reverseConversion ? -latestConversion.amountMYR : latestConversion.amountUSD, hideInvestments, 0)}</strong>
              <small>{formatDate(latestConversion.date)} / Recorded rate {amount(latestConversion.rate, hideInvestments, 4)}</small>
              <span className="overview-desktop-only overview-accent">View funding <ChevronRight size={12} /></span>
            </span>
          </button> : <div className="overview-conversion-details overview-empty">{cashFlow ? 'No conversions recorded.' : 'Funding data unavailable.'}</div>}
        </section>

        <button type="button" className="workspace-primary-action overview-add focus-ring" onClick={onAddTransaction} disabled={readOnly || !money} title={readOnly ? 'Demo is read-only' : 'Add transaction'}>
          <Plus size={16} aria-hidden="true" />Add transaction
        </button>

        <section className="overview-activity" aria-labelledby="overview-activity-title">
          <div className="overview-section-heading"><h2 id="overview-activity-title">Recent activity</h2><button type="button" className="overview-text-action focus-ring" onClick={() => onOpenMoney({ kind: 'history' })}>View all</button></div>
          {recent ? <>
            <div className="overview-desktop-only overview-table-wrap">
              <table className="overview-activity-table">
                <thead><tr><th>Date</th><th>Transaction</th><th>Account</th><th>Amount / MYR</th><th><span className="sr-only">Open transaction</span></th></tr></thead>
                <tbody>{recentTransactions.map((transaction) => <tr key={transaction.id}>
                  <td>{formatDate(transaction.date)}</td>
                  <td>{transaction.category}</td>
                  <td>{transactionAccount(transaction) || '-'}</td>
                  <td className={transaction.type === 'Income' ? 'overview-positive' : ''}>{transactionAmount(transaction)}</td>
                  <td><button type="button" className="overview-row-action focus-ring" title={`View ${transaction.category}`} aria-label={`View ${transaction.category} transaction`} onClick={() => onOpenMoney({ kind: 'transaction', transaction })}><ChevronRight size={16} strokeWidth={1.6} /></button></td>
                </tr>)}</tbody>
              </table>
            </div>
            <button type="button" className="overview-finance-row overview-mobile-only focus-ring" onClick={() => onOpenMoney({ kind: 'transaction', transaction: recent })}>
              <span className="overview-account-mark">{recent.category.charAt(0)}</span>
              <span className="overview-row-description"><strong>{recent.category}</strong><small>{recent.date === localISODate(date) ? 'Today' : formatDate(recent.date)} / {transactionAccount(recent)}</small></span>
              <span className="overview-row-amount"><strong className={recent.type === 'Income' ? 'overview-positive' : ''}>{transactionAmount(recent, true)}</strong><small>{recent.type}</small></span>
            </button>
          </> : <p className="overview-empty">{money ? 'No transactions yet.' : 'Transactions unavailable.'}</p>}
        </section>

        <section className="overview-accounts overview-desktop-only" aria-labelledby="overview-accounts-title">
          <div className="overview-section-heading"><h2 id="overview-accounts-title">Accounts</h2><button type="button" className="overview-text-action focus-ring" onClick={() => onOpenMoney()}>View all</button></div>
          {account ? <button type="button" className="overview-finance-row focus-ring" onClick={() => onOpenMoney()}>
            <span className="overview-account-mark">{account.name.charAt(0)}</span>
            <span className="overview-row-description"><strong>{account.name}</strong><small>{account.category}</small></span>
            <span className="overview-row-amount"><strong>MYR {amount(account.currentBalance, hideBalance, 0)}</strong><small>{account.category}</small></span>
          </button> : <p className="overview-empty">{money ? 'No cash accounts yet.' : 'Accounts unavailable.'}</p>}
        </section>
      </div>
    </div>
  );
};
