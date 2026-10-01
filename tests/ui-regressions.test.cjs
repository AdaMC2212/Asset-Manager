const { stubModule } = require('./register.cjs');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { portfolio, cashFlow, money } = require('./fixtures/ui-data.ts');

const h = React.createElement;
const noop = () => {};
global.window = { addEventListener() {}, removeEventListener() {} };
global.setInterval = () => 1;
global.clearInterval = noop;
let pendingRead;
let isDemo = false;
let rendered;
stubModule('../app/actions.ts', {
  checkDatabaseStatus: async () => ({ configured: true, initialized: true, isDemo }),
  getPortfolioData: async () => portfolio,
  getCashFlowData: async () => cashFlow,
  getMoneyManagerData: async () => { if (pendingRead) await pendingRead; return money; },
});
stubModule('next/link', { __esModule: true, default: ({ children, ...props }) => h('a', props, children) });
stubModule('../components/ui/CountUp.tsx', { CountUp: ({ end, prefix = '' }) => `${prefix}${end}` });
stubModule('../components/ui/DecryptedText.tsx', { DecryptedText: ({ text }) => text });
stubModule('../components/ui/ModalPortal.tsx', { ModalPortal: ({ children }) => children });
const chartStubs = Object.fromEntries(['PieChart', 'Pie', 'Cell', 'ResponsiveContainer', 'Tooltip'].map((name) =>
  [name, ({ children }) => children || null]));
stubModule('recharts', chartStubs);

const Home = require('../app/page.tsx').default;
const { AppWorkspace } = require('../components/layout/AppWorkspace.tsx');
const { AppShell } = require('../components/layout/AppShell.tsx');
const { CommandPalette } = require('../components/CommandPalette.tsx');
const { MoneyManager } = require('../components/MoneyManager.tsx');
const { MoneyActivityList } = require('../components/MoneyManager/MoneyActivityList.tsx');
const { AddMoneyModal } = require('../components/MoneyManager/AddMoneyModal.tsx');
const { AllocationChart } = require('../components/AllocationChart.tsx');
const { TotalBalanceCard } = require('../components/TotalBalanceCard.tsx');
const { WorkspaceModeProvider } = require('../components/WorkspaceMode.tsx');
const { Overview } = require('../components/Overview.tsx');
const { FundingStats } = require('../components/FundingStats.tsx');
const { AddFundingModal } = require('../components/FundingStats/AddFundingModal.tsx');
const { WorkspaceTabs } = require('../components/ui/WorkspaceTabs.tsx');
const { AccountList } = require('../components/MoneyManager/AccountList.tsx');
const { AutoDebitPanel } = require('../components/MoneyManager/AutoDebitPanel.tsx');

afterEach(() => {
  if (rendered) act(() => rendered.unmount());
  rendered = null;
  pendingRead = undefined;
  isDemo = false;
});

const mountHome = async () => {
  delete process.env.NEXT_PUBLIC_APP_PASSWORD;
  await act(async () => { rendered = create(h(Home)); });
  await act(async () => rendered.root.findByType('input').props.onChange({ target: { value: 'admin' } }));
  await act(async () => rendered.root.findByType('form').props.onSubmit({ preventDefault: noop }));
};
const workspace = () => rendered.root.findByType(AppWorkspace);
const runAction = async (action) => act(async () => rendered.root.findByType(CommandPalette).props.onRunAction(action));
const text = (node) => typeof node === 'string' ? node : (node?.children || []).map(text).join(' ');

test('search Add Transaction opens the real form after switching modules and on repeated requests', async () => {
  await mountHome();
  await act(async () => workspace().props.onSelectModule('investment'));
  assert.equal(rendered.root.findAllByType(MoneyManager).length, 0);
  await runAction('add_transaction');
  assert.equal(workspace().props.activeModule, 'manager');
  assert.equal(workspace().props.addTransactionRequested, false);
  assert.equal(rendered.root.findByType(AddMoneyModal).props.isOpen, true);
  await act(async () => rendered.root.findByType(AddMoneyModal).props.onClose());
  await runAction('add_transaction');
  assert.equal(rendered.root.findByType(AddMoneyModal).props.isOpen, true);
});

test('a queued search request is consumed only after the data and manager are ready', async () => {
  let finishRead;
  pendingRead = new Promise((resolve) => { finishRead = resolve; });
  await mountHome();
  await runAction('add_transaction');
  assert.equal(workspace().props.addTransactionRequested, true);
  assert.equal(rendered.root.findAllByType(MoneyManager).length, 0);
  await act(async () => finishRead());
  assert.equal(workspace().props.addTransactionRequested, false);
  assert.equal(rendered.root.findByType(AddMoneyModal).props.isOpen, true);
});

test('unmounting MoneyManager unregisters its add handler', async () => {
  const handlers = [];
  await act(async () => { rendered = create(h(MoneyManager, {
    data: money, loading: false, onRefresh: noop, registerAddHandler: (handler) => handlers.push(handler),
  })); });
  assert.equal(typeof handlers.at(-1), 'function');
  act(() => rendered.unmount());
  rendered = null;
  assert.equal(handlers.at(-1), null);
});

test('read-only search never queues a transaction form', async () => {
  isDemo = true;
  await mountHome();
  await runAction('add_transaction');
  assert.equal(workspace().props.addTransactionRequested, false);
  assert.equal(rendered.root.findByType(AddMoneyModal).props.isOpen, false);
});

test('asset search selects Portfolio even when the current tab is Cash Flow', async () => {
  await mountHome();
  await act(async () => {
    workspace().props.onSelectModule('investment');
    workspace().props.onSelectInvTab('funding');
    workspace().props.onOpenSearch();
  });
  const result = rendered.root.findByType(CommandPalette).findAllByType('button')
    .find((button) => text(button).includes('AAPL'));
  await act(async () => result.props.onClick());
  assert.equal(workspace().props.activeModule, 'investment');
  assert.equal(workspace().props.activeInvTab, 'dashboard');
  assert.equal(rendered.root.findByType(CommandPalette).props.isOpen, false);
});

test('investment privacy masks allocation values, chart proportions and concentration independently of money', async () => {
  await mountHome();
  await act(async () => {
    workspace().props.onSelectModule('investment');
    workspace().props.onToggleHideInvestments();
  });
  const chart = rendered.root.findByType(AllocationChart);
  assert.equal(chart.props.hideValues, true);
  assert.doesNotMatch(text(chart), /\$5,000|\$2,500|66\.7%|33\.3%/);
  assert.equal(chart.findAllByProps({ className: 'workspace-allocation-bar' }).length, 0);
  const story = rendered.root.findByProps({ className: 'workspace-concentration' });
  assert.doesNotMatch(text(story), /\d+\.\d+%/);
  assert.equal(workspace().props.hideBalance, false);
  assert.equal(rendered.root.findAllByType(TotalBalanceCard).length, 0, 'Invest does not show the MYR money balance');
  await act(async () => workspace().props.onToggleHideInvestments());
  assert.match(text(rendered.root.findByType(AllocationChart)), /\$5,000/);
  assert.match(text(story), /33\.3%/);
  assert.equal(chart.findAllByProps({ className: 'workspace-allocation-bar' }).length, 1);
});

test('Money tabs retain filters and expose accounts and recurring rule controls', async () => {
  await mountHome();
  await act(async () => workspace().props.onSelectModule('manager'));
  const activity = () => rendered.root.findByType(MoneyActivityList);
  await act(async () => activity().props.onSetFilters({ type: 'Expense', account: 'Bank', startDate: '', endDate: '' }));
  const tabs = () => rendered.root.findByType(WorkspaceTabs);
  await act(async () => tabs().props.onChange('accounts'));
  assert.equal(rendered.root.findByType(AccountList).props.accounts, money.accounts);
  assert.equal(rendered.root.findAllByType(MoneyActivityList).length, 0);
  await act(async () => workspace().props.onToggleHideBalance());
  assert.equal(rendered.root.findByType(AccountList).props.hideValues, true);
  await act(async () => tabs().props.onChange('auto'));
  assert.equal(rendered.root.findByType(AutoDebitPanel).props.hideValues, true);
  await act(async () => tabs().props.onChange('activity'));
  assert.equal(activity().props.filters.type, 'Expense');
  assert.equal(activity().props.filters.account, 'Bank');
});

test('Funding primary action opens cash flow, and leaving the page closes it', async () => {
  await mountHome();
  const selectFunding = async () => act(async () => {
    workspace().props.onSelectModule('investment');
    workspace().props.onSelectInvTab('funding');
  });
  await selectFunding();
  assert.equal(rendered.root.findByType(AppShell).props.primaryActionLabel, 'Add cash flow');
  await act(async () => rendered.root.findByType(AppShell).props.onPrimaryAction());
  assert.equal(rendered.root.findByType(AddFundingModal).props.isOpen, true);
  await act(async () => workspace().props.onSelectInvTab('dashboard'));
  assert.equal(rendered.root.findAllByType(AddFundingModal).length, 0);
  await selectFunding();
  assert.equal(rendered.root.findByType(AddFundingModal).props.isOpen, false);
});

test('Funding primary action remains read-only in demo mode', async () => {
  isDemo = true;
  await mountHome();
  await act(async () => {
    workspace().props.onSelectModule('investment');
    workspace().props.onSelectInvTab('funding');
  });
  await act(async () => rendered.root.findByType(AppShell).props.onPrimaryAction());
  assert.equal(rendered.root.findByType(AddFundingModal).props.isOpen, false);
});

test('Funding retains reverse conversion direction and masks amounts and rates in both history tabs', async () => {
  const funding = { ...cashFlow, deposits: [{ date: '2026-09-01', amountMYR: -650, reason: 'Withdrawal' }],
    conversions: [{ date: '2026-09-02', amountMYR: -4300, amountUSD: -1000, rate: 4.3 }] };
  await act(async () => { rendered = create(h(FundingStats, { cashFlow: funding, portfolio, hideValues: false })); });
  assert.match(text(rendered.root.findByProps({ className: 'workspace-conversion' })), /USD 1,000\.00.*MYR 4,300\.00/);
  assert.match(text(rendered.root), /RM -650\.00/);
  await act(async () => rendered.root.findByType(WorkspaceTabs).props.onChange('conversions'));
  assert.match(text(rendered.root), /-4,300\.00/);
  await act(async () => rendered.update(h(FundingStats, { cashFlow: funding, portfolio, hideValues: true })));
  assert.doesNotMatch(text(rendered.root), /4\.3000|4,300|1,000|7,000|650/);
  await act(async () => rendered.root.findByType(WorkspaceTabs).props.onChange('deposits'));
  assert.doesNotMatch(text(rendered.root), /650/);
});

test('Funding unavailable data is not rendered as a zero balance or a perpetual loader', async () => {
  await act(async () => { rendered = create(h(FundingStats, { cashFlow, portfolio: null })); });
  const metrics = rendered.root.findAllByProps({ className: 'workspace-metric' });
  assert.match(text(metrics[2]), /Unavailable/);
  assert.match(text(metrics[3]), /Unavailable/);
  await act(async () => rendered.update(h(FundingStats, { cashFlow: null, portfolio: null })));
  assert.match(text(rendered.root), /unavailable/);
  assert.doesNotMatch(text(rendered.root), /Loading|\$0/);
});

test('workspace tabs support arrow keys, Home and End with one keyboard tab stop', async () => {
  let selected;
  let focused;
  const items = [{ value: 'first', label: 'First' }, { value: 'second', label: 'Second' }];
  await act(async () => { rendered = create(h(WorkspaceTabs, { id: 'test', label: 'Views', value: 'first', items, onChange: (value) => { selected = value; } })); });
  const buttons = rendered.root.findAllByType('button');
  assert.deepEqual(buttons.map((button) => button.props.tabIndex), [0, -1]);
  const press = (index, key) => buttons[index].props.onKeyDown({
    key, preventDefault: noop, currentTarget: { parentElement: { children: items.map((_, i) => ({ focus: () => { focused = i; } })) } },
  });
  press(0, 'ArrowLeft');
  assert.equal(selected, 'second');
  assert.equal(focused, 1);
  press(1, 'Home');
  assert.equal(selected, 'first');
  press(0, 'End');
  assert.equal(selected, 'second');
});

test('a single ordinary transfer exposes editing, deletion and full history', async () => {
  const transaction = money.transactions[0];
  let edited;
  let deleted;
  let historyOpened = false;
  await act(async () => { rendered = create(h(WorkspaceModeProvider, { value: false }, h(MoneyActivityList, {
    filteredTransactions: [transaction], filters: { type: 'All', account: 'All', startDate: '', endDate: '' },
    accounts: money.accounts, onToggleFilters: noop, onSetFilters: noop, onClearFilters: noop,
    onEdit: (tx) => { edited = tx; }, onDelete: (tx) => { deleted = tx; },
    onViewAll: () => { historyOpened = true; }, displayValue: String,
    getCategoryStyles: () => ({}), getTransactionDisplay: () => ({}),
  }))); });
  for (const label of ['Edit transaction', 'Delete transaction']) {
    const button = rendered.root.findByProps({ 'aria-label': label });
    assert.equal(button.props.disabled, false);
    assert.equal(button.parent.props.className, 'flex gap-1');
    await act(async () => button.props.onClick());
  }
  const history = rendered.root.findAllByType('button').find((button) => text(button).includes('View All'));
  await act(async () => history.props.onClick());
  assert.equal(edited, transaction);
  assert.equal(deleted, transaction);
  assert.equal(historyOpened, true);
});

test('normal Add and command Add share the mounted manager form', async () => {
  await mountHome();
  await act(async () => workspace().props.onSelectModule('manager'));
  await act(async () => rendered.root.findByType(AppShell).props.onPrimaryAction());
  assert.equal(rendered.root.findByType(AddMoneyModal).props.isOpen, true);
});

test('Overview is the default and its Add action opens the existing transaction form', async () => {
  await mountHome();
  assert.equal(workspace().props.activeModule, 'overview');
  await act(async () => rendered.root.findByType(Overview).props.onAddTransaction());
  assert.equal(workspace().props.activeModule, 'overview');
  assert.equal(rendered.root.findByType(AddMoneyModal).props.isOpen, true);
});

test('overview privacy hides both modules including a partially hidden state', async () => {
  await mountHome();
  await act(async () => workspace().props.onToggleHideInvestments());
  await act(async () => rendered.root.findByType(AppShell).props.onTogglePrivacy());
  assert.equal(workspace().props.hideBalance, true);
  assert.equal(workspace().props.hideInvestments, true);
  await act(async () => rendered.root.findByType(AppShell).props.onTogglePrivacy());
  assert.equal(workspace().props.hideBalance, false);
  assert.equal(workspace().props.hideInvestments, false);
});

test('overview card and activity links open existing details and protected edit flows', async () => {
  await mountHome();
  await act(async () => rendered.root.findByType(Overview).props.onOpenMoney({ kind: 'cards' }));
  assert.ok(rendered.root.findByProps({ 'aria-label': 'Unpaid card balances' }));
  await act(async () => workspace().props.onSelectModule('overview'));
  await act(async () => rendered.root.findByType(Overview).props.onOpenMoney({ kind: 'transaction', transaction: money.transactions[0] }));
  assert.equal(rendered.root.findByType(AddMoneyModal).props.initialData.id, 'transfer');
  assert.equal(rendered.root.findByType(AddMoneyModal).props.isOpen, true);
});

test('overview history opens the full transaction list', async () => {
  await mountHome();
  await act(async () => rendered.root.findByType(Overview).props.onOpenMoney({ kind: 'history' }));
  assert.ok(rendered.root.findByProps({ 'aria-label': 'Full Transaction List' }));
  assert.equal(rendered.root.findByType(MoneyActivityList).props.filteredTransactions.length, money.transactions.length);
});

test('an Overview history request includes older months in the manager', async () => {
  const older = { ...money.transactions[0], id: 'older', date: '2000-01-01' };
  await act(async () => { rendered = create(h(MoneyManager, {
    data: { ...money, transactions: [...money.transactions, older] }, loading: false, onRefresh: noop,
    viewRequest: { kind: 'history' }, onViewRequestHandled: noop,
  })); });
  assert.equal(rendered.root.findByType(MoneyActivityList).props.filteredTransactions.length, 4);
});

test('leaving Overview closes its form rather than reopening it on return', async () => {
  await mountHome();
  await act(async () => rendered.root.findByType(Overview).props.onAddTransaction());
  await act(async () => workspace().props.onSelectModule('investment'));
  await act(async () => workspace().props.onSelectModule('overview'));
  assert.equal(rendered.root.findByType(AddMoneyModal).props.isOpen, false);
});
