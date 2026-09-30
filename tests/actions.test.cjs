const { stubModule } = require('./register.cjs');
const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { FakeSheets } = require('./fakeSheets.cjs');
const { portfolioRows, cashFlowRows, legacyCashFlowRows } = require('./fixtures/investment-sheets.cjs');

process.env.TZ = 'Asia/Kuala_Lumpur';
let sheets;
let referer;
stubModule('../lib/googleSheets.ts', {
  getSheetClient: async () => ({ googleSheets: sheets }),
  SPREADSHEET_ID: 'test-only',
  SHEET_NAME: 'Transaction',
  CASH_FLOW_SHEET_NAME: 'Cash Flow',
  PORTFOLIO_SHEET_NAME: 'Portfolio',
  MM_ACCOUNTS_SHEET: 'MM_Accounts',
  MM_TRANSACTIONS_SHEET: 'MM_Transactions',
  MM_CATEGORIES_SHEET: 'MM_Categories',
  MM_AUTODEBITS_SHEET: 'MM_AutoDebits',
});
stubModule('next/headers', { headers: () => ({ get: () => referer }) });
stubModule('yahoo-finance2', { quoteSummary: async () => { throw new Error('External calls are prohibited in tests'); } });
const actions = require('../app/actions.ts');
const { localISODate } = require('../lib/dates.ts');
const { getRecognitionDate, getExpenseAccounts, isSettlementLocked } = require('../lib/money.ts');
const { withSpreadsheetLock } = require('../lib/spreadsheetLock.ts');

const cardCharge = (date = '2026-08-31', amount = 100) =>
  [date, 'Expense', 'Bills', amount, 'Card', '', 'Purchase', 'Yes', 'Unsettled'];
const ruleRow = (day = 30, start = '2026-09-01') =>
  ['rule-1', 'Subscription', 50, 'Bills', 'Bank', '', 'Monthly', day, start, '', 'Yes', '', '', start, start, ''];
const paymentRows = () => sheets.tables.MM_Transactions.filter((row) => row[2] === 'Credit Card Settlement');
const expenseRows = () => sheets.tables.MM_Transactions.filter((row) => row[1] === 'Expense');

beforeEach(() => {
  sheets = new FakeSheets();
  referer = 'http://localhost:3000/';
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY = 'test-only-never-used';
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-30T01:00:00+08:00') });
});
afterEach(() => mock.timers.reset());

test('every mutation rejects demo requests before touching Sheets', async () => {
  const mutations = [
    (demo) => actions.initializeDatabase(demo),
    (demo) => actions.addMoneyTransaction({}, demo),
    (demo) => actions.updateMoneyTransaction(2, {}, demo),
    (demo) => actions.deleteMoneyTransaction(2, demo),
    (demo) => actions.settleCreditCardBill('Card', 'Bank', '2026-09-30', 'outstanding', demo),
    (demo) => actions.updateCreditCardBillingDay('Card', 15, demo),
    (demo) => actions.addAutoDebitRule({}, demo),
    (demo) => actions.updateAutoDebitRule(2, {}, demo),
    (demo) => actions.toggleAutoDebitRule(2, true, demo),
    (demo) => actions.deleteAutoDebitRule(2, demo),
    (demo) => actions.syncAutoDebitRuleFromTransaction('rule', {}, demo),
    (demo) => actions.deactivateAutoDebitRuleById('rule', demo),
    (demo) => actions.addCategory('Bills', 'Expense', demo),
    (demo) => actions.deleteCategory('Bills', 'Expense', demo),
    (demo) => actions.updateCategory('Bills', 'Food', 'Expense', demo),
    (demo) => actions.addTrade({}, demo),
    (demo) => actions.addDeposit({}, demo),
    (demo) => actions.addConversion({}, demo),
  ];
  for (const mutation of mutations) assert.equal((await mutation(true)).success, false);
  referer = 'http://localhost:3000/demo';
  for (const mutation of mutations) assert.equal((await mutation(false)).success, false);
  referer = 'http://localhost:3000/';
  delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  for (const mutation of mutations) assert.equal((await mutation(false)).success, false);
  assert.equal(sheets.calls.length, 0);
});

test('demo records have no persistence row indexes', async () => {
  const data = await actions.getMoneyManagerData(true);
  assert.ok(data.transactions.every((tx) => tx.rowIndex === undefined));
  assert.equal(sheets.calls.length, 0);
});

test('demo-origin reads cannot accidentally trigger live recurrence processing', async () => {
  referer = 'http://localhost:3000/demo';
  sheets.tables.MM_AutoDebits.push(ruleRow());
  const data = await actions.getMoneyManagerData();
  assert.ok(data.transactions.every((tx) => tx.rowIndex === undefined));
  assert.equal(sheets.calls.length, 0);
});

test('header and invalid row indexes cannot be edited or deleted', async () => {
  for (const row of [0, 1, -1, 1.5, NaN]) {
    assert.equal((await actions.deleteMoneyTransaction(row)).success, false);
    assert.equal((await actions.updateMoneyTransaction(row, {})).success, false);
    assert.equal((await actions.deleteAutoDebitRule(row)).success, false);
    assert.equal((await actions.updateAutoDebitRule(row, {})).success, false);
  }
  assert.equal(sheets.calls.length, 0);
});

test('failed settlement is atomic and can be retried', async () => {
  sheets.tables.MM_Transactions.push(cardCharge(), cardCharge('2026-09-01', 25));
  sheets.failBatch = true;
  const args = ['Card', 'Bank', '2026-09-05', 'outstanding', false, 'operation-1'];
  assert.equal((await actions.settleCreditCardBill(...args)).success, false);
  assert.ok(expenseRows().every((row) => row[8] === 'Unsettled'));
  assert.equal(paymentRows().length, 0);
  sheets.failBatch = false;
  assert.equal((await actions.settleCreditCardBill(...args)).success, true);
  assert.ok(expenseRows().every((row) => row[8] === 'Settled' && row[14] === 'operation-1'));
  assert.equal(paymentRows().length, 1);
  assert.equal(paymentRows()[0][3], 125);
  assert.equal(sheets.calls.filter((call) => call.type !== 'batch').length, 0);
});

test('retry after a lost settlement response does not pay new charges twice', async () => {
  sheets.tables.MM_Transactions.push(cardCharge());
  sheets.loseBatchResponse = true;
  const args = ['Card', 'Bank', '2026-09-05', 'outstanding', false, 'operation-1'];
  assert.equal((await actions.settleCreditCardBill(...args)).success, false);
  sheets.tables.MM_Transactions.push(cardCharge('2026-09-29', 25));
  sheets.loseBatchResponse = false;
  const result = await actions.settleCreditCardBill(...args);
  assert.equal(result.success, true);
  assert.equal(result.alreadyRecorded, true);
  assert.equal(paymentRows().length, 1);
  assert.equal(expenseRows()[1][8], 'Unsettled');
});

test('concurrent settlements create one payment', async () => {
  sheets.tables.MM_Transactions.push(cardCharge());
  await Promise.all([
    actions.settleCreditCardBill('Card', 'Bank', '2026-09-30', 'outstanding', false, 'a'),
    actions.settleCreditCardBill('Card', 'Bank', '2026-09-30', 'outstanding', false, 'b'),
  ]);
  assert.equal(paymentRows().length, 1);
});

test('settled charges and their transfers reject generic edits and deletes', async () => {
  sheets.tables.MM_Transactions.push(cardCharge());
  await actions.settleCreditCardBill('Card', 'Bank', '2026-09-05', 'outstanding');
  const snapshot = structuredClone(sheets.tables.MM_Transactions);
  for (const row of [2, 3]) {
    assert.equal((await actions.deleteMoneyTransaction(row)).success, false);
    assert.equal((await actions.updateMoneyTransaction(row, { type: 'Expense', amount: 500 })).success, false);
  }
  assert.deepEqual(sheets.tables.MM_Transactions, snapshot);
  assert.equal(isSettlementLocked({ type: 'Transfer', category: 'Credit Card Settlement' }), true);
});

test('statement settlements leave unbilled charges unpaid', async () => {
  sheets.tables.MM_Transactions.push(cardCharge('2026-09-15'), cardCharge('2026-09-16', 50));
  const result = await actions.settleCreditCardBill('Card', 'Bank', '2026-09-30', 'statement');
  assert.equal(result.settledAmount, 100);
  assert.equal(expenseRows()[1][8], 'Unsettled');
});

test('monthly debit is due at the start of its scheduled local date', async () => {
  sheets.tables.MM_AutoDebits.push(ruleRow());
  const data = await actions.getMoneyManagerData();
  assert.equal(data.transactions.length, 1);
  assert.equal(data.transactions[0].date, '2026-09-30');
  assert.equal(data.autoDebitRules[0].lastProcessedOccurrence, '2026-09-30');
});

test('month-end schedules clamp to the final calendar day', async () => {
  sheets.tables.MM_AutoDebits.push(ruleRow(31));
  await actions.getMoneyManagerData();
  assert.equal(expenseRows()[0][0], '2026-09-30');
});

test('deleted recurring occurrence stays cancelled after refresh and schedule edits', async () => {
  sheets.tables.MM_AutoDebits.push(ruleRow(15));
  const data = await actions.getMoneyManagerData();
  assert.equal((await actions.deleteMoneyTransaction(data.transactions[0].rowIndex)).success, true);
  assert.equal(sheets.tables.MM_Transactions[1][13], 'Cancelled');
  assert.equal((await actions.getMoneyManagerData()).transactions.length, 0);
  await actions.updateAutoDebitRule(2, { ...data.autoDebitRules[0], dayOfMonth: 30 });
  assert.equal((await actions.getMoneyManagerData()).transactions.length, 0);
});

test('schedule edits preserve past postings and do not backfill a second charge', async () => {
  sheets.tables.MM_AutoDebits.push(ruleRow(15, '2026-07-01'));
  const data = await actions.getMoneyManagerData();
  assert.equal(data.transactions.length, 3);
  assert.equal((await actions.updateAutoDebitRule(2, { ...data.autoDebitRules[0], dayOfMonth: 30 })).success, true);
  assert.equal((await actions.getMoneyManagerData()).transactions.length, 3);
  mock.timers.setTime(new Date('2026-10-30T01:00:00+08:00').getTime());
  const next = await actions.getMoneyManagerData();
  assert.equal(next.transactions.length, 4);
  assert.equal(next.transactions[0].date, '2026-10-30');
});

test('editing an occurrence preserves its recurrence identity for future synchronization', async () => {
  sheets.tables.MM_AutoDebits.push(ruleRow(15));
  const data = await actions.getMoneyManagerData();
  const original = data.transactions[0];
  const payload = { ...original, date: '2026-09-30', amount: 75, autoRuleId: undefined, autoOccurrenceDate: undefined };
  assert.equal((await actions.updateMoneyTransaction(original.rowIndex, payload)).success, true);
  assert.equal((await actions.syncAutoDebitRuleFromTransaction('rule-1', payload)).success, true);
  const refreshed = await actions.getMoneyManagerData();
  assert.equal(refreshed.transactions.length, 1);
  assert.equal(refreshed.transactions[0].autoOccurrenceDate, '2026-09-15');
  assert.equal(refreshed.autoDebitRules[0].dayOfMonth, 30);
});

test('concurrent refreshes reread under the shared lock and append once', async () => {
  sheets.tables.MM_AutoDebits.push(ruleRow());
  const results = await Promise.all(Array.from({ length: 4 }, () => actions.getMoneyManagerData()));
  assert.equal(expenseRows().length, 1);
  assert.ok(results.every((data) => data.transactions.length === 1));
});

test('lock releases after an error and supports nested actions', async () => {
  await assert.rejects(withSpreadsheetLock('test-lock', async () => { throw new Error('failure'); }));
  assert.equal(await withSpreadsheetLock('test-lock', () => withSpreadsheetLock('test-lock', async () => 42)), 42);
});

test('all financial reads propagate failure instead of returning zeros', async () => {
  sheets.failRead = true;
  for (const read of [actions.getMoneyManagerData, actions.getPortfolioData, actions.getCashFlowData]) {
    await assert.rejects(read(), /Injected Sheets read failure/);
  }
});

test('investment actions request unformatted numbers and map the downloaded layout without writes', async () => {
  sheets.tables.Portfolio = portfolioRows();
  sheets.tables['Cash Flow'] = cashFlowRows();
  const portfolio = await actions.getPortfolioData();
  const funding = await actions.getCashFlowData();
  assert.equal(portfolio.cashBalance, 40);
  assert.equal(portfolio.totalPL, 200);
  assert.equal(funding.totalConvertedUSD, 280);
  assert.equal(sheets.calls.length, 0);
  assert.deepEqual(sheets.readCalls, [
    { spreadsheetId: 'test-only', range: 'Portfolio!A:N', valueRenderOption: 'UNFORMATTED_VALUE' },
    { spreadsheetId: 'test-only', range: 'Cash Flow!A:J', valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
  ]);
});

test('funding writes use A:D and F:J with the type and direction required by sheet formulas', async () => {
  sheets.tables['Cash Flow'] = cashFlowRows();
  const before = structuredClone(sheets.tables['Cash Flow']);
  assert.equal((await actions.addDeposit({ date: '2026-09-30', amount: 500, reason: 'Savings' })).success, true);
  assert.equal((await actions.addConversion({ date: '2026-09-30', myr: 200, usd: 50, rate: 4 })).success, true);
  const appends = sheets.calls.filter((call) => call.type === 'append').map((call) => call.request);
  assert.equal(appends[0].range, 'Cash Flow!A2:D');
  assert.deepEqual(appends[0].requestBody.values, [['2026-09-30', 500, 'Deposit', 'Savings']]);
  assert.equal(appends[1].range, 'Cash Flow!F2:J');
  assert.deepEqual(appends[1].requestBody.values, [['2026-09-30', 200, 50, 4, 'MYR to USD']]);
  assert.deepEqual(sheets.tables['Cash Flow'].slice(0, before.length), before);
  const data = await actions.getCashFlowData();
  assert.equal(data.totalDepositedMYR, 1900);
  assert.equal(data.totalConvertedUSD, 330);
});

test('legacy funding writes preserve the original layout', async () => {
  sheets.tables['Cash Flow'] = legacyCashFlowRows();
  assert.equal((await actions.addDeposit({ date: '2026-09-30', amount: 500, reason: 'Savings' })).success, true);
  assert.equal((await actions.addConversion({ date: '2026-09-30', myr: 200, usd: 50, rate: 4 })).success, true);
  const appends = sheets.calls.filter((call) => call.type === 'append').map((call) => call.request);
  assert.equal(appends[0].range, 'Cash Flow!A1:C');
  assert.deepEqual(appends[0].requestBody.values, [['2026-09-30', 500, 'Savings']]);
  assert.equal(appends[1].range, 'Cash Flow!E1:H');
  assert.deepEqual(appends[1].requestBody.values, [['2026-09-30', 200, 50, 4]]);
});

test('funding writes reject an unrecognized sheet layout without appending', async () => {
  sheets.tables['Cash Flow'] = [['Unexpected columns']];
  assert.equal((await actions.addDeposit({ date: '2026-09-30', amount: 500, reason: 'Savings' })).success, false);
  assert.equal((await actions.addConversion({ date: '2026-09-30', myr: 200, usd: 50, rate: 4 })).success, false);
  assert.equal(sheets.calls.length, 0);
});

test('settled card expenses are recognized in payment month on the server', async () => {
  const charge = cardCharge('2026-08-31');
  charge[8] = 'Settled';
  charge[9] = '2026-09-05';
  sheets.tables.MM_Transactions.push(charge);
  const data = await actions.getMoneyManagerData();
  assert.equal(data.monthlyStats.expense, 100);
  assert.equal(data.categorySpending[0].spent, 100);
  assert.equal(getRecognitionDate(data.transactions[0]), '2026-09-05');
});

test('local default dates and historical account eligibility', () => {
  assert.equal(localISODate(new Date('2026-10-01T01:00:00+08:00')), '2026-10-01');
  const accounts = [
    { name: 'Empty Bank', category: 'Bank', currentBalance: 0 },
    { name: 'Overdraft', category: 'Bank', currentBalance: -100 },
    { name: 'Legacy', category: 'Other', currentBalance: 0 },
  ];
  assert.equal(getExpenseAccounts(accounts).length, 2);
  assert.equal(getExpenseAccounts(accounts, 'Legacy').length, 3);
});
