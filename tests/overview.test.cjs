require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { getOverviewSummary } = require('../lib/overview.ts');
const { Overview } = require('../components/Overview.tsx');
const { portfolio, cashFlow, money } = require('./fixtures/ui-data.ts');

test('overview separates cash accounts from card debt and USD portfolio cash', () => {
  const summary = getOverviewSummary(money, portfolio, cashFlow);
  assert.equal(summary.cashBalance, 1400);
  assert.equal(summary.cashAccounts.length, 2);
  assert.equal(summary.outstanding, 100);
  assert.equal(summary.unrealizedPL, 500);
  assert.equal(summary.unrealizedPercent, 25);
});

test('overview uses payment-month recognition and excludes transfers and unpaid charges', () => {
  const transactions = [
    { id: 'salary', date: '2026-09-01', type: 'Income', amount: 8500 },
    { id: 'bill', date: '2026-09-20', type: 'Expense', amount: 100 },
    { id: 'paid-card', date: '2026-08-01', type: 'Expense', amount: 200, isCardCharge: true, settlementStatus: 'Settled', settledAt: '2026-09-01' },
    { id: 'statement', date: '2026-09-10', type: 'Expense', amount: 980, isCardCharge: true, fromAccount: 'Card' },
    { id: 'unbilled', date: '2026-09-20', type: 'Expense', amount: 280, isCardCharge: true, fromAccount: 'Card' },
    { id: 'payment', date: '2026-09-01', type: 'Transfer', amount: 200 },
  ];
  const summary = getOverviewSummary({ ...money, transactions }, portfolio, cashFlow, new Date(2026, 8, 30));
  assert.equal(summary.income, 8500);
  assert.equal(summary.expense, 300);
  assert.equal(summary.net, 8200);
  assert.equal(summary.outstanding, 1260);
  assert.equal(summary.statement, 980);
  assert.equal(summary.expenseShare + summary.remainingShare, 1);
});

test('overview clamps over-budget flow bars and handles empty data', () => {
  const summary = getOverviewSummary({
    ...money, transactions: [{ date: '2026-09-10', type: 'Expense', amount: 300 }],
  }, null, null, new Date(2026, 8, 30));
  assert.equal(summary.expenseShare, 1);
  assert.equal(summary.remainingShare, 0);
  assert.equal(summary.net, -300);
  const empty = getOverviewSummary(null, null, null);
  assert.equal(empty.expenseShare, 0);
  assert.equal(empty.unrealizedPercent, 0);
  assert.equal(empty.latestConversion, null);
});

test('overview selects recent records without mutating source arrays', () => {
  const conversions = [
    { date: '2026-08-01', amountMYR: 4300, amountUSD: 1000, rate: 4.3 },
    { date: '2026-09-28', amountMYR: 4200, amountUSD: 1000, rate: 4.2 },
  ];
  const summary = getOverviewSummary(money, portfolio, { ...cashFlow, conversions });
  assert.equal(summary.latestConversion, conversions[1]);
  assert.equal(conversions[0].date, '2026-08-01');
});

test('overview masks both currencies, conversion amounts, rates, and chart proportions', () => {
  const markup = renderToStaticMarkup(React.createElement(Overview, {
    money, portfolio, cashFlow: { ...cashFlow, conversions: [{ date: '2026-09-28', amountMYR: 4200, amountUSD: 1000, rate: 4.2 }] },
    hideBalance: true, hideInvestments: true,
    onOpenMoney() {}, onOpenInvestments() {}, onOpenFunding() {}, onAddTransaction() {},
  }));
  assert.doesNotMatch(markup, /1,400|7,500|4,200|1,000|4\.2000|25\.00|style="flex:/);
  assert.match(markup, /MYR/);
  assert.match(markup, /USD/);
  assert.match(markup, /\*\*\*\*/);
});

test('overview preserves USD-to-MYR direction for reverse conversions', () => {
  const markup = renderToStaticMarkup(React.createElement(Overview, {
    money, portfolio, cashFlow: { ...cashFlow, conversions: [{ date: '2026-09-28', amountMYR: -4200, amountUSD: -1000, rate: 4.2 }] },
    hideBalance: false, hideInvestments: false,
    onOpenMoney() {}, onOpenInvestments() {}, onOpenFunding() {}, onAddTransaction() {},
  }));
  assert.match(markup, /USD 1,000.*?MYR 4,200/);
  assert.doesNotMatch(markup, /MYR -4,200/);
});
