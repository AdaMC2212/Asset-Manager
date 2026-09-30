require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parsePortfolioRows, parseCashFlowRows, getCashFlowLayout } = require('../lib/investments.ts');
const { portfolioRows, cashFlowRows, legacyCashFlowRows } = require('./fixtures/investment-sheets.cjs');

test('portfolio reads the USD summaries in H22/H28/H31, not labels or MYR values', () => {
  const data = parsePortfolioRows(portfolioRows());
  assert.equal(data.cashBalance, 40);
  assert.equal(data.totalCost, 500);
  assert.equal(data.netWorth, 700);
  assert.equal(data.totalPL, 200);
  assert.equal(data.totalPLPercent, 40);
  assert.deepEqual(data.holdings.map((holding) => holding.ticker), ['VOO', 'NVDA']);
  assert.equal(data.holdings[0].assetClass, 'ETF');
  assert.equal(data.holdings[1].assetClass, 'Equity');
  assert.equal(data.holdings[0].allocation, 500 / 700 * 100);
  assert.equal(data.holdings[0].unrealizedPLPercent, 25);
  assert.equal(data.holdings[1].unrealizedPL, -40);
  assert.equal(data.holdings[1].unrealizedPLPercent, -20);
  assert.equal(data.holdings[0].totalCost + data.holdings[1].totalCost, 600);
});

test('summary lookup survives inserted rows and both adjacent and merged label layouts', () => {
  const rows = portfolioRows();
  for (const row of [21, 27, 30]) {
    rows[row][4] = ` ${rows[row][5].toLowerCase()} `;
    rows[row][5] = rows[row][7];
    rows[row][7] = '';
  }
  rows.splice(15, 0, [], [], []);
  const data = parsePortfolioRows(rows);
  assert.equal(data.cashBalance, 40);
  assert.equal(data.netWorth, 700);
  assert.equal(data.totalCost, 500);
});

test('holdings use header names after columns are reordered and ignore inactive rows', () => {
  const rows = portfolioRows();
  for (const row of rows.slice(0, 3)) {
    [row[2], row[5]] = [row[5], row[2]];
  }
  rows[2][3] = 'Closed';
  rows[1][3] = ' active ';
  const data = parsePortfolioRows(rows);
  assert.equal(data.holdings.length, 1);
  assert.equal(data.holdings[0].quantity, 4);
  assert.equal(data.holdings[0].currentPrice, 125);
});

test('numeric zeros remain valid and are never replaced with a holdings fallback', () => {
  const rows = portfolioRows();
  rows[21][7] = 0;
  rows[27][7] = 0;
  rows[30][7] = 0;
  rows[1][6] = 0;
  rows[1][7] = 0;
  const data = parsePortfolioRows(rows);
  assert.equal(data.totalCost, 0);
  assert.equal(data.netWorth, 0);
  assert.equal(data.cashBalance, 0);
  assert.equal(data.totalPL, 0);
  assert.equal(data.holdings[0].unrealizedPL, 0);
});

test('formatted money, accounting losses, and percentages are parsed without losing signs', () => {
  const rows = portfolioRows();
  rows[27][7] = 'US$ 1,040.50';
  rows[1][6] = '25.00%';
  rows[2][7] = '($40.00)';
  rows[2][6] = '-20%';
  const data = parsePortfolioRows(rows);
  assert.equal(data.cashBalance, 1040.5);
  assert.equal(data.holdings[0].unrealizedPLPercent, 25);
  assert.equal(data.holdings[1].unrealizedPLPercent, -20);
  assert.equal(data.holdings[1].unrealizedPL, -40);
});

test('missing labels and formula errors fail the refresh instead of becoming financial zeros', () => {
  assert.throws(() => parsePortfolioRows([]), /headers/);
  const noCash = portfolioRows();
  noCash[27][5] = '';
  assert.throws(() => parsePortfolioRows(noCash), /summary/);
  for (const value of ['', undefined, '#N/A', '#REF!', 'Loading...', Infinity]) {
    const rows = portfolioRows();
    rows[27][7] = value;
    assert.throws(() => parsePortfolioRows(rows), /investment value/);
    rows[27][7] = 40;
    rows[1][5] = value;
    assert.throws(() => parsePortfolioRows(rows), /current price/);
  }
});

test('cash-only portfolios retain invested capital and lifecycle return', () => {
  const rows = portfolioRows();
  rows[1] = [];
  rows[2] = [];
  rows[27][7] = 700;
  const data = parsePortfolioRows(rows);
  assert.equal(data.holdings.length, 0);
  assert.equal(data.netWorth, 700);
  assert.equal(data.cashBalance, 700);
  assert.equal(data.totalPL, 200);
});

test('cash flow reads F:J from row 3 and nets withdrawals and reverse conversions', () => {
  const data = parseCashFlowRows(cashFlowRows());
  assert.equal(data.deposits.length, 3);
  assert.equal(data.conversions.length, 3);
  assert.equal(data.totalDepositedMYR, 1400);
  assert.equal(data.totalConvertedMYR, 1120);
  assert.equal(data.totalConvertedUSD, 280);
  assert.equal(data.avgRate, 4);
  assert.deepEqual(data.deposits[0], { date: '2026-09-05', amountMYR: -100, reason: 'Withdrawal' });
  assert.equal(data.deposits[2].reason, 'Savings');
  assert.deepEqual(data.conversions[0], { date: '2026-09-06', amountMYR: -80, amountUSD: -20, rate: 4 });
});

test('older A:C/E:H funding layout still works', () => {
  const rows = legacyCashFlowRows();
  const data = parseCashFlowRows(rows);
  assert.equal(data.totalDepositedMYR, 1000);
  assert.equal(data.totalConvertedUSD, 200);
  assert.equal(data.deposits[0].reason, 'Savings');
  assert.equal(getCashFlowLayout(rows).conversion.date, 4);
});

test('funding supports inserted rows, blank lines, formatted numbers and zero entries', () => {
  const rows = cashFlowRows();
  rows.unshift([], ['Investment funding']);
  rows.push([], ['2026-09-30', 0, 'Deposit']);
  rows[4][1] = 'RM 1,000.00';
  const data = parseCashFlowRows(rows);
  assert.equal(data.totalDepositedMYR, 1400);
  assert.equal(data.deposits[0].amountMYR, 0);
  assert.equal(data.conversions.length, 3);
});

test('unknown funding layouts, directions, and formula errors are not silently accepted', () => {
  assert.throws(() => parseCashFlowRows([]), /headers/);
  for (const [column, value] of [[2, 'Savings'], [7, '#VALUE!'], [8, '#DIV/0!'], [9, '']]) {
    const rows = cashFlowRows();
    rows[2][column] = value;
    assert.throws(() => parseCashFlowRows(rows), /invalid/);
  }
});
