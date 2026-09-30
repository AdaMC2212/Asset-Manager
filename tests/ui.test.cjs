const { stubModule } = require('./register.cjs');
const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');

process.env.TZ = 'Asia/Kuala_Lumpur';
global.window = { addEventListener() {}, removeEventListener() {} };
global.alert = () => {};
global.confirm = () => true;
global.setInterval = () => 1;
global.clearInterval = () => {};
const h = React.createElement;
const noop = () => {};
let rendered;
let calls;
let failReads;
let readPending;
const moneyData = {
  accounts: [{ name: 'Bank', category: 'Bank', currentBalance: 500 }],
  transactions: [], totalBalance: 500, monthlyStats: { income: 0, expense: 0 }, categorySpending: [], graphData: [],
  categories: [], incomeCategories: ['Salary'], expenseCategories: ['Bills'], autoDebitRules: [],
};
const portfolioData = { holdings: [], netWorth: 500 };
const cashFlowData = { deposits: [], conversions: [], totalDepositedMYR: 500 };
const read = async (value) => {
  if (readPending) await readPending;
  if (failReads) throw new Error('Injected sync failure');
  return value;
};
const actionStubs = {
  checkDatabaseStatus: async () => ({ configured: true, initialized: true, isDemo: false }),
  getPortfolioData: () => read(portfolioData),
  getCashFlowData: () => read(cashFlowData),
  getMoneyManagerData: () => read(moneyData),
};
for (const name of ['addTrade', 'addDeposit', 'addConversion', 'addMoneyTransaction', 'updateMoneyTransaction',
  'deleteMoneyTransaction', 'settleCreditCardBill', 'updateCreditCardBillingDay', 'addAutoDebitRule',
  'updateAutoDebitRule', 'toggleAutoDebitRule', 'deleteAutoDebitRule', 'syncAutoDebitRuleFromTransaction', 'deactivateAutoDebitRuleById']) {
  actionStubs[name] = async (...args) => { calls.push({ name, args }); return { success: true }; };
}
stubModule('../app/actions.ts', actionStubs);
stubModule('next/link', { __esModule: true, default: ({ children, ...props }) => h('a', props, children) });
stubModule('../components/ui/DecryptedText.tsx', { DecryptedText: ({ text }) => text });
stubModule('../components/CommandPalette.tsx', { CommandPalette: () => null });
const AppWorkspace = () => null;
const MoneyStatsRow = () => null;
const MoneyBreakdownPanel = () => null;
stubModule('../components/layout/AppWorkspace.tsx', { AppWorkspace });
stubModule('../components/MoneyManager/MoneyStatsRow.tsx', { MoneyStatsRow });
stubModule('../components/MoneyManager/MoneyBreakdownPanel.tsx', { MoneyBreakdownPanel });

const { WorkspaceModeProvider } = require('../components/WorkspaceMode.tsx');
const { AutoDebitModal } = require('../components/MoneyManager/AutoDebitModal.tsx');
const { SettleCreditCardModal } = require('../components/MoneyManager/SettleCreditCardModal.tsx');
const { AddMoneyModal } = require('../components/MoneyManager/AddMoneyModal.tsx');
const { AddTradeModal } = require('../components/AddTradeModal.tsx');
const { AddFundingModal } = require('../components/FundingStats/AddFundingModal.tsx');
const { MoneyManager } = require('../components/MoneyManager.tsx');
const { AutoDebitPanel } = require('../components/MoneyManager/AutoDebitPanel.tsx');
const { MoneyActivityList } = require('../components/MoneyManager/MoneyActivityList.tsx');
const Home = require('../app/page.tsx').default;

const mount = async (component, readOnly = false) => {
  await act(async () => { rendered = create(h(WorkspaceModeProvider, { value: readOnly }, component)); });
};
const update = async (component, readOnly = false) => {
  await act(async () => { rendered.update(h(WorkspaceModeProvider, { value: readOnly }, component)); });
};
const commonProps = { isOpen: true, onClose: noop, onSuccess: noop, accounts: moneyData.accounts };
const textInput = () => rendered.root.findAllByType('input').find((input) => input.props.type === undefined);
const dateInput = () => rendered.root.findAllByType('input').find((input) => input.props.type === 'date');

beforeEach(() => {
  calls = [];
  failReads = false;
  readPending = null;
  delete process.env.NEXT_PUBLIC_APP_PASSWORD;
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-01T01:00:00+08:00') });
});
afterEach(() => {
  if (rendered) act(() => rendered.unmount());
  rendered = null;
  mock.timers.reset();
});

test('recurrence drafts survive equal-valued refreshed arrays and reset on reopen', async () => {
  const props = { ...commonProps, expenseCategories: ['Bills'] };
  await mount(h(AutoDebitModal, props));
  await act(async () => textInput().props.onChange({ target: { value: 'Draft subscription' } }));
  await update(h(AutoDebitModal, { ...props, accounts: [...props.accounts], expenseCategories: ['Bills'] }));
  assert.equal(textInput().props.value, 'Draft subscription');
  await update(h(AutoDebitModal, { ...props, isOpen: false }));
  await update(h(AutoDebitModal, props));
  assert.equal(textInput().props.value, '');
  assert.equal(dateInput().props.value, '2026-10-01');
});

test('switching the edited rule initializes a fresh draft', async () => {
  const props = { ...commonProps, expenseCategories: ['Bills'], initialRule: { id: 'a', name: 'First' } };
  await mount(h(AutoDebitModal, props));
  await update(h(AutoDebitModal, { ...props, initialRule: { id: 'b', name: 'Second' } }));
  assert.equal(textInput().props.value, 'Second');
});

test('settlement drafts survive refresh and use a stable retry operation ID', async () => {
  const props = { ...commonProps, cardAccount: { name: 'Card' }, initialScope: 'outstanding', outstandingAmount: 100, statementAmount: 50 };
  await mount(h(SettleCreditCardModal, props));
  await act(async () => dateInput().props.onChange({ target: { value: '2026-09-05' } }));
  await update(h(SettleCreditCardModal, { ...props, accounts: [...props.accounts] }));
  assert.equal(dateInput().props.value, '2026-09-05');
  await act(async () => rendered.root.findByType('form').props.onSubmit({ preventDefault: noop }));
  await act(async () => rendered.root.findByType('form').props.onSubmit({ preventDefault: noop }));
  assert.equal(calls[0].args[5], calls[1].args[5]);
  assert.ok(calls[0].args[5]);
});

test('all date-entry forms default to the local calendar day', async () => {
  const components = [
    h(AddMoneyModal, { ...commonProps, incomeCategories: [], expenseCategories: ['Bills'] }),
    h(AutoDebitModal, { ...commonProps, expenseCategories: ['Bills'] }),
    h(SettleCreditCardModal, { ...commonProps, cardAccount: { name: 'Card' }, initialScope: 'outstanding', outstandingAmount: 100, statementAmount: 50 }),
    h(AddTradeModal, commonProps),
    h(AddFundingModal, commonProps),
  ];
  for (const component of components) {
    await mount(component);
    assert.equal(dateInput().props.value, '2026-10-01');
    act(() => rendered.unmount());
    rendered = null;
  }
});

test('all mutation forms are absent in a read-only workspace', async () => {
  for (const component of [
    h(AddMoneyModal, { ...commonProps, incomeCategories: [], expenseCategories: [] }),
    h(AutoDebitModal, { ...commonProps, expenseCategories: [] }),
    h(SettleCreditCardModal, { ...commonProps, cardAccount: { name: 'Card' }, initialScope: 'outstanding' }),
    h(AddTradeModal, commonProps),
    h(AddFundingModal, commonProps),
  ]) {
    await mount(component, true);
    assert.equal(rendered.toJSON(), null);
    act(() => rendered.unmount());
    rendered = null;
  }
  assert.equal(calls.length, 0);
});

test('demo recurrence controls are disabled', async () => {
  await mount(h(AutoDebitPanel, {
    rules: [{ id: 'r', rowIndex: 2, name: 'Rule', startDate: '2026-10-01', dayOfMonth: 1, isActive: true, amount: 50 }],
    onAdd: noop, onEdit: noop, onRefresh: noop,
  }), true);
  assert.ok(rendered.root.findAllByType('button').every((button) => button.props.disabled));
});

test('demo activity and settled-record controls are disabled', async () => {
  const props = {
    filteredTransactions: [{ id: '1', type: 'Transfer', category: 'Credit Card Settlement', amount: 100, date: '2026-09-05' }],
    filters: { type: 'All', account: 'All' }, accounts: [], onToggleFilters: noop, onSetFilters: noop,
    onClearFilters: noop, onEdit: noop, onDelete: noop, onViewAll: noop, displayValue: String,
    getCategoryStyles: () => ({}), getTransactionDisplay: () => ({}),
  };
  await mount(h(MoneyActivityList, props));
  assert.equal(rendered.root.findAllByType('button').filter((button) => button.props.disabled).length, 2);
  await update(h(MoneyActivityList, { ...props, filteredTransactions: [{ ...props.filteredTransactions[0], type: 'Expense', category: 'Bills' }] }), true);
  assert.equal(rendered.root.findAllByType('button').filter((button) => button.props.disabled).length, 2);
});

test('client totals and breakdown recognize a card expense in its payment month, activity keeps purchase date', async () => {
  const transaction = { id: '1', date: '2026-08-31', type: 'Expense', category: 'Bills', amount: 100,
    isCardCharge: true, settlementStatus: 'Settled', settledAt: '2026-09-05', fromAccount: 'Card' };
  const data = { ...moneyData, transactions: [transaction] };
  mock.timers.setTime(new Date('2026-09-30T12:00:00+08:00').getTime());
  await mount(h(MoneyManager, { data, loading: false, onRefresh: noop }));
  assert.equal(rendered.root.findByType(MoneyStatsRow).props.expense, 100);
  assert.equal(rendered.root.findByType(MoneyBreakdownPanel).props.fullBreakdown[0].value, 100);
  assert.equal(rendered.root.findByType(MoneyActivityList).props.filteredTransactions.length, 0);
  const header = rendered.root.findByType(require('../components/MoneyManager/MoneyHeader.tsx').MoneyHeader);
  await act(async () => header.props.onPrevMonth());
  assert.equal(rendered.root.findByType(MoneyStatsRow).props.expense, 0);
  assert.equal(rendered.root.findByType(MoneyActivityList).props.filteredTransactions.length, 1);
});

test('historical transactions can retain an empty original account', async () => {
  const original = { id: '1', type: 'Expense', category: 'Bills', fromAccount: 'Empty', amount: 100, date: '2026-09-05' };
  await mount(h(AddMoneyModal, { ...commonProps, accounts: [{ name: 'Empty', category: 'Bank', currentBalance: 0 }],
    initialData: original, incomeCategories: [], expenseCategories: ['Bills'] }));
  assert.ok(rendered.root.findAllByType('option').some((option) => option.props.value === 'Empty'));
});

const unlockHome = async () => {
  await act(async () => { rendered = create(h(Home)); });
  const input = rendered.root.findByType('input');
  assert.equal(input.props.inputMode, 'text');
  assert.equal(input.props.pattern, undefined);
  await act(async () => input.props.onChange({ target: { value: 'admin' } }));
  await act(async () => rendered.root.findByType('form').props.onSubmit({ preventDefault: noop }));
};

test('fallback login works and failed refresh preserves the last successful balances', async () => {
  await unlockHome();
  const workspace = () => rendered.root.findByType(AppWorkspace).props;
  assert.equal(workspace().moneyData.totalBalance, 500);
  failReads = true;
  await act(async () => workspace().onRefresh());
  assert.equal(workspace().moneyData.totalBalance, 500);
  assert.equal(workspace().data, portfolioData);
  assert.equal(workspace().cashFlowData, cashFlowData);
  assert.match(workspace().error, /Sync failed/);
  failReads = false;
  await act(async () => workspace().onRefresh());
  assert.equal(workspace().error, null);
});

test('first sync failure leaves data unavailable, not a successful zero-balance dataset', async () => {
  failReads = true;
  await unlockHome();
  const workspace = rendered.root.findByType(AppWorkspace).props;
  assert.equal(workspace.moneyData, null);
  assert.equal(workspace.data, null);
  assert.match(workspace.error, /Sync failed/);
});

test('balance badge does not claim a successful sync after a read failure', () => {
  const { renderToStaticMarkup } = require('react-dom/server');
  const { TotalBalanceCard } = require('../components/TotalBalanceCard.tsx');
  const markup = renderToStaticMarkup(h(TotalBalanceCard, {
    totalBalance: 500, accounts: [], hideValues: false, onTogglePrivacy: noop, syncFailed: true,
  }));
  assert.match(markup, /Sync incomplete/);
  assert.doesNotMatch(markup, />Synced</);
});

test('card detail and view controls are independent buttons, not nested buttons', async () => {
  const filename = require.resolve('../components/MoneyManager/MoneyStatsRow.tsx');
  const stub = require.cache[filename];
  delete require.cache[filename];
  const { MoneyStatsRow: RealStats } = require(filename);
  require.cache[filename] = stub;
  let opened = false;
  let selected;
  await mount(h(RealStats, {
    income: 0, expense: 0, outstanding: 100, statement: 50, balance: 0, hideValues: true,
    creditCardView: 'outstanding', onOpenOutstandingDetails: () => { opened = true; },
    onChangeCreditCardView: (value) => { selected = value; },
  }));
  const buttons = rendered.root.findAllByType('button');
  for (const button of buttons) {
    assert.equal(button.findAll((child) => child !== button && child.type === 'button').length, 0);
  }
  await act(async () => buttons.find((button) => button.props['aria-label'] === 'View cards').props.onClick());
  assert.equal(opened, true);
  await act(async () => buttons.find((button) => button.props['aria-label'] === 'Show statement').props.onClick());
  assert.equal(selected, 'statement');
});
