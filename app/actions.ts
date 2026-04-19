
'use server';

import { getSheetClient, SPREADSHEET_ID, SHEET_NAME, CASH_FLOW_SHEET_NAME, PORTFOLIO_SHEET_NAME, MM_ACCOUNTS_SHEET, MM_TRANSACTIONS_SHEET, MM_CATEGORIES_SHEET, MM_AUTODEBITS_SHEET } from '../lib/googleSheets';
import { PortfolioSummary, Holding, CashFlowSummary, Deposit, Conversion, MoneyManagerData, MoneyAccount, MoneyTransaction, Bill, RecurringDebitRule, CreditCardSettlementScope } from '../types';
import yahooFinance from 'yahoo-finance2';
import { DEFAULT_CREDIT_CARD_BILLING_DAY, getActiveBillingCycle, getBillingDayOfMonth, isTransactionInActiveStatement } from '../lib/creditCard';

// --- MOCK DATA FOR DEMO MODE ---
const MOCK_PRICES: Record<string, number> = {
  AAPL: 175.50, VOO: 475.00, QQQ: 440.00, INTC: 32.00, NVDA: 900.00, SMH: 220.00,
  META: 500.00, AMZN: 180.00, IWM: 205.00, TSLA: 175.00, JPM: 195.00, PLTR: 25.00,
  UNH: 480.00, AVGO: 1300.00, IBIT: 70.00, QQQM: 180.00, GOOGL: 150.00, MSFT: 420.00
};

const MOCK_TRANSACTIONS_RAW = [
  { date: '2024-04-01', ticker: 'AAPL', action: 'Buy', quantity: 1.0000, price: 170.03, fees: 0 },
  { date: '2024-04-01', ticker: 'VOO', action: 'Buy', quantity: 5.0000, price: 440, fees: 1.62 },
  { date: '2024-04-15', ticker: 'QQQ', action: 'Buy', quantity: 3.0000, price: 430, fees: 1.62 },
  { date: '2024-05-30', ticker: 'NVDA', action: 'Buy', quantity: 2.0000, price: 113, fees: 1.2 },
  { date: '2024-06-18', ticker: 'SMH', action: 'Buy', quantity: 2.0000, price: 215, fees: 1.41 },
  { date: '2024-07-11', ticker: 'META', action: 'Buy', quantity: 1.0000, price: 460, fees: 1.2 },
  { date: '2024-08-07', ticker: 'AMZN', action: 'Buy', quantity: 5.0000, price: 165, fees: 1.21 },
  { date: '2025-01-13', ticker: 'TSLA', action: 'Buy', quantity: 2.0000, price: 170, fees: 0.71 },
  { date: '2025-01-14', ticker: 'JPM', action: 'Buy', quantity: 1.0000, price: 190, fees: 0.71 },
  { date: '2025-01-17', ticker: 'IBIT', action: 'Buy', quantity: 10.0000, price: 35, fees: 1.21 },
  { date: '2025-02-25', ticker: 'PLTR', action: 'Buy', quantity: 10.0000, price: 22, fees: 1.25 }
];

const MOCK_MONEY_DATA = {
    accounts: [
        { name: 'Maybank', category: 'Bank', logoUrl: '', initialBalance: 12000, currentBalance: 8450.50 },
        { name: 'Maybank Debit', category: 'Debit Card', logoUrl: '', initialBalance: 3200, currentBalance: 2780.15 },
        { name: 'GXBank', category: 'Bank', logoUrl: '', initialBalance: 5000, currentBalance: 5200 },
        { name: 'TnG eWallet', category: 'Wallet', logoUrl: '', initialBalance: 500, currentBalance: 145.20 },
        { name: 'Cash', category: 'Cash', logoUrl: '', initialBalance: 500, currentBalance: 320 },
        { name: 'Maybank Visa', category: 'Credit Card', logoUrl: '', initialBalance: 0, currentBalance: -1250, billingDayOfMonth: DEFAULT_CREDIT_CARD_BILLING_DAY }
    ],
    transactions: [
        { id: '1', date: '2024-03-24', type: 'Expense', category: 'Food', amount: 25.50, fromAccount: 'TnG eWallet', note: 'Lunch' },
        { id: '2', date: '2024-03-23', type: 'Expense', category: 'Transport', amount: 50.00, fromAccount: 'Maybank', note: 'Petrol' },
        { id: '3', date: '2024-03-22', type: 'Income', category: 'Salary', amount: 5500.00, toAccount: 'Maybank', note: 'March Salary' },
        { id: '4', date: '2024-03-21', type: 'Expense', category: 'Utilities', amount: 180.00, fromAccount: 'Maybank Debit', note: 'Electric Bill' },
        { id: '5', date: '2024-03-20', type: 'Expense', category: 'Fashion', amount: 299.00, fromAccount: 'GXBank', note: 'Uniqlo Haul' },
        { id: '6', date: '2024-03-19', type: 'Expense', category: 'Food', amount: 15.00, fromAccount: 'Cash', note: 'Hawker Stall' },
        { id: '7', date: '2024-03-18', type: 'Transfer', category: 'Transfer', amount: 200.00, fromAccount: 'Maybank', toAccount: 'TnG eWallet', note: 'Topup' },
        { id: '8', date: '2024-03-15', type: 'Expense', category: 'Entertainment', amount: 45.00, fromAccount: 'Maybank Visa', note: 'Movie Night', isCardCharge: true, settlementStatus: 'Unsettled' },
        { id: '9', date: '2024-03-14', type: 'Expense', category: 'Bills', amount: 89.90, fromAccount: 'Maybank Visa', note: 'Streaming Bundle', isCardCharge: true, settlementStatus: 'Unsettled' },
        { id: '10', date: '2024-03-12', type: 'Expense', category: 'Healthcare', amount: 120.00, fromAccount: 'Maybank', note: 'Supplements' },
        { id: '11', date: '2024-03-10', type: 'Income', category: 'Bonus', amount: 1000.00, toAccount: 'GXBank', note: 'Performance Bonus' },
        { id: '12', date: '2024-03-29', type: 'Transfer', category: 'Credit Card Settlement', amount: 220.00, fromAccount: 'Maybank', toAccount: 'Maybank Visa', note: 'Settled Maybank Visa bill' },
        { id: '13', date: '2024-03-05', type: 'Expense', category: 'Electronics', amount: 220.00, fromAccount: 'Maybank Visa', note: 'Keyboard', isCardCharge: true, settlementStatus: 'Settled', settledAt: '2024-03-29', settledByAccount: 'Maybank' }
    ],
    autoDebitRules: [
        {
            id: 'demo-rule-1',
            name: 'Netflix',
            amount: 55.9,
            category: 'Bills',
            fromAccount: 'Maybank Visa',
            scheduleType: 'Monthly' as const,
            dayOfMonth: 14,
            startDate: '2024-03-14',
            isActive: true,
            lastProcessedOccurrence: '2024-03-14',
            notes: 'Streaming subscription'
        }
    ] as RecurringDebitRule[]
};

// --- Helper Functions for Categorization ---

const SECTOR_MAP: Record<string, string> = {
    AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Semiconductors', INTC: 'Semiconductors', AMD: 'Semiconductors',
    SMH: 'Semiconductors', META: 'Technology', GOOGL: 'Technology', GOOG: 'Technology', AMZN: 'Consumer Cyclical', 
    PLTR: 'Technology', AVGO: 'Semiconductors', NFLX: 'Communication Services', CRM: 'Technology', ADBE: 'Technology',
    ORCL: 'Technology', CSCO: 'Technology', TSM: 'Semiconductors', QCOM: 'Semiconductors', MU: 'Semiconductors',
    TSLA: 'Automotive', F: 'Automotive', GM: 'Automotive', RIVN: 'Automotive', LCID: 'Automotive',
    JPM: 'Financials', BAC: 'Financials', V: 'Financials', MA: 'Financials', WFC: 'Financials',
    GS: 'Financials', MS: 'Financials', BLK: 'Financials', C: 'Financials',
    UNH: 'Healthcare', JNJ: 'Healthcare', PFE: 'Healthcare', LLY: 'Healthcare', MRK: 'Healthcare',
    ABBV: 'Healthcare', TMO: 'Healthcare',
    XOM: 'Energy', CVX: 'Energy', SHEL: 'Energy', COP: 'Energy',
    WMT: 'Consumer Defensive', KO: 'Consumer Defensive', PEP: 'Consumer Defensive', PG: 'Consumer Defensive',
    COST: 'Consumer Defensive', MCD: 'Consumer Cyclical', SBUX: 'Consumer Cyclical', NKE: 'Consumer Cyclical',
    VOO: 'Index ETF', SPY: 'Index ETF', QQQ: 'Index ETF', QQQM: 'Index ETF', IWM: 'Index ETF', 
    VTI: 'Index ETF', VEA: 'Index ETF', VWO: 'Index ETF', BND: 'Bond ETF', GLD: 'Commodity ETF',
    IBIT: 'Crypto', BTC: 'Crypto', ETH: 'Crypto', COIN: 'Crypto', MSTR: 'Crypto Proxy'
};

const DEFAULT_INCOME_CATS = ['Salary', 'Bonus', 'Allowance', 'Dividend', 'Side Hustle', 'Other'];
const DEFAULT_EXPENSE_CATS = ['Food', 'Transport', 'Bills', 'Fashion', 'Entertainment', 'Healthcare', 'Electronics', 'Debt', 'Family', 'Other'];
const MM_TRANSACTION_HEADERS = [
  'Date',
  'Type',
  'Category',
  'Amount',
  'From Account',
  'To Account',
  'Note',
  'Card Charge?',
  'Settlement Status',
  'Settled At',
  'Settled By Account',
  'Auto Rule ID',
  'Auto Occurrence Date',
  'Auto Generated'
];

const MM_AUTODEBIT_HEADERS = [
  'Rule ID',
  'Name',
  'Amount',
  'Category',
  'From Account',
  'To Account',
  'Schedule Type',
  'Day Of Month',
  'Start Date',
  'End Date',
  'Is Active',
  'Last Processed Occurrence',
  'Notes',
  'Created At',
  'Updated At'
];

const getAssetClass = (ticker: string) => {
  const t = ticker.toUpperCase();
  if (SECTOR_MAP[t]?.includes('ETF')) return 'ETF';
  if (SECTOR_MAP[t]?.includes('Crypto')) return 'Crypto';
  if (t === 'BTC' || t === 'ETH' || t === 'SOL') return 'Crypto';
  if (t.length === 3 && t.startsWith('V')) return 'ETF';
  return 'Equity';
};

const getSector = async (ticker: string) => {
  const t = ticker.toUpperCase();
  if (SECTOR_MAP[t]) return SECTOR_MAP[t];
  
  // In Demo mode or if offline, we skip Yahoo Finance check to prevent errors
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return 'Other';

  try {
    const quote = await yahooFinance.quoteSummary(t, { modules: ['summaryProfile', 'quoteType'] }) as any;
    const sector = quote.summaryProfile?.sector;
    const quoteType = quote.quoteType?.quoteType;
    if (sector) return sector;
    if (quoteType === 'ETF') return 'Index ETF';
    if (quoteType === 'CRYPTOCURRENCY') return 'Crypto';
  } catch (e) {}
  return 'Other';
};

const parseMoney = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const clean = value.toString().replace(/[^0-9.-]/g, '');
  return parseFloat(clean) || 0;
};

const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
     const [year, month, day] = dateStr.split('-').map(Number);
     return new Date(year, month - 1, day, 12, 0, 0);
  }
  return new Date(dateStr);
};

const formatDateDisplay = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getLastDayOfMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

const getMonthlyOccurrenceDate = (year: number, monthIndex: number, dayOfMonth: number) => {
  const safeDay = Math.min(Math.max(dayOfMonth, 1), getLastDayOfMonth(year, monthIndex));
  return new Date(year, monthIndex, safeDay, 12, 0, 0);
};

const normalizeAccountName = (value?: string) => (value || '').trim();
const normalizeAccountCategory = (category?: string) => (category || '').trim().toLowerCase();

const isCreditCardCategory = (category?: string) => normalizeAccountCategory(category) === 'credit card';

const isDebitLikeCategory = (category?: string) => {
  const normalized = normalizeAccountCategory(category);
  return normalized === 'bank' || normalized === 'wallet' || normalized === 'cash' || normalized === 'debit card';
};

const isTruthySheetValue = (value: any) => ['yes', 'true', '1', 'y'].includes((value || '').toString().trim().toLowerCase());
const parseBillingDay = (value: any, fallback: number = DEFAULT_CREDIT_CARD_BILLING_DAY) => {
  const parsed = Math.trunc(parseMoney(value));
  if (!parsed) return fallback;
  return Math.min(31, Math.max(1, parsed));
};

const getSettlementStatus = (value: any): 'Unsettled' | 'Settled' => {
  const normalized = (value || '').toString().trim().toLowerCase();
  return normalized === 'settled' ? 'Settled' : 'Unsettled';
};

const isActiveSheetValue = (value: any) => {
  const normalized = (value || '').toString().trim().toLowerCase();
  return normalized === '' ? true : ['yes', 'true', '1', 'y', 'active'].includes(normalized);
};

const buildRecurringRuleRow = (rule: RecurringDebitRule) => [
  rule.id,
  rule.name,
  rule.amount,
  rule.category,
  rule.fromAccount,
  rule.toAccount || '',
  rule.scheduleType,
  rule.dayOfMonth,
  rule.startDate,
  rule.endDate || '',
  rule.isActive ? 'Yes' : 'No',
  rule.lastProcessedOccurrence || '',
  rule.notes || '',
  rule.createdAt || '',
  rule.updatedAt || ''
];

const ensureAutoDebitInfrastructure = async (googleSheets: any) => {
  const meta = await googleSheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = meta.data.sheets?.map((sheet: any) => sheet.properties?.title) || [];

  if (!existingSheets.includes(MM_AUTODEBITS_SHEET)) {
    await googleSheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: MM_AUTODEBITS_SHEET } } }]
      }
    });
  }

  await Promise.all([
    googleSheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_TRANSACTIONS_SHEET}!A1:N1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [MM_TRANSACTION_HEADERS] }
    }),
    googleSheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_AUTODEBITS_SHEET}!A1:O1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [MM_AUTODEBIT_HEADERS] }
    })
  ]);
};

const createCardMetadata = (data: Pick<MoneyTransaction, 'type' | 'fromAccount' | 'settlementStatus' | 'settledAt' | 'settledByAccount'>, accountMap: Record<string, MoneyAccount>) => {
  const fromAccount = data.fromAccount ? accountMap[data.fromAccount] : undefined;
  const isCreditCardExpense = data.type === 'Expense' && isCreditCardCategory(fromAccount?.category);

  if (!isCreditCardExpense) {
    return ['', '', '', ''];
  }

  const status = data.settlementStatus === 'Settled' ? 'Settled' : 'Unsettled';
  return ['Yes', status, data.settledAt || '', data.settledByAccount || ''];
};

const buildMoneyTransactionRow = (data: MoneyTransaction, accountMap: Record<string, MoneyAccount>) => {
  const [isCardCharge, settlementStatus, settledAt, settledByAccount] = createCardMetadata(data, accountMap);
  return [
    data.date,
    data.type,
    data.category,
    data.amount,
    data.fromAccount || '',
    data.toAccount || '',
    data.note || '',
    isCardCharge,
    settlementStatus,
    settledAt,
    settledByAccount,
    data.autoRuleId || '',
    data.autoOccurrenceDate || '',
    data.isAutoGenerated ? 'Yes' : ''
  ];
};

const mapMoneyTransactionRow = (row: any[], rowIndex: number, accountMap: Record<string, MoneyAccount>): MoneyTransaction | null => {
  if (!row[0] || !row[3]) return null;

  const dateObj = parseDate(row[0]);
  const amount = parseMoney(row[3]);
  const type = row[1]?.toString().trim();
  const fromAcc = normalizeAccountName(row[4]);
  const isCardCharge = isTruthySheetValue(row[7]) || (type === 'Expense' && isCreditCardCategory(accountMap[fromAcc]?.category));
  const settlementStatus = isCardCharge ? getSettlementStatus(row[8]) : undefined;

  return {
    id: `mtx-${rowIndex - 1}`,
    rowIndex,
    date: formatDateDisplay(dateObj),
    type: type as any,
    category: row[2] || 'Uncategorized',
    amount,
    fromAccount: fromAcc,
    toAccount: normalizeAccountName(row[5]),
    note: row[6]?.toString().trim(),
    isCardCharge,
    settlementStatus,
    settledAt: row[9] ? formatDateDisplay(parseDate(row[9])) : undefined,
    settledByAccount: row[10]?.toString().trim() || undefined,
    autoRuleId: row[11]?.toString().trim() || undefined,
    autoOccurrenceDate: row[12] ? formatDateDisplay(parseDate(row[12])) : undefined,
    isAutoGenerated: isTruthySheetValue(row[13]),
  };
};

const getRecurringRules = async (googleSheets: any): Promise<RecurringDebitRule[]> => {
  const response = await googleSheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MM_AUTODEBITS_SHEET}!A:O`
  });
  const rows = response.data.values || [];
  const rules: RecurringDebitRule[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1] || !row[2] || !row[3] || !row[4] || !row[8]) continue;

    rules.push({
      id: row[0].toString().trim(),
      rowIndex: i + 1,
      name: row[1].toString().trim(),
      amount: parseMoney(row[2]),
      category: row[3].toString().trim(),
      fromAccount: normalizeAccountName(row[4]),
      toAccount: normalizeAccountName(row[5]),
      scheduleType: 'Monthly',
      dayOfMonth: Math.max(1, Math.min(31, parseMoney(row[7]) || parseDate(row[8]).getDate())),
      startDate: formatDateDisplay(parseDate(row[8])),
      endDate: row[9] ? formatDateDisplay(parseDate(row[9])) : undefined,
      isActive: isActiveSheetValue(row[10]),
      lastProcessedOccurrence: row[11] ? formatDateDisplay(parseDate(row[11])) : undefined,
      notes: row[12]?.toString().trim() || '',
      createdAt: row[13] ? formatDateDisplay(parseDate(row[13])) : undefined,
      updatedAt: row[14] ? formatDateDisplay(parseDate(row[14])) : undefined,
    });
  }

  return rules;
};

const getDueOccurrences = (rule: RecurringDebitRule, today: Date) => {
  const startDate = parseDate(rule.startDate);
  const endDate = rule.endDate ? parseDate(rule.endDate) : null;
  const occurrences: string[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 12, 0, 0);
  const limit = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);

  while (cursor <= limit) {
    const occurrence = getMonthlyOccurrenceDate(cursor.getFullYear(), cursor.getMonth(), rule.dayOfMonth);
    if (occurrence >= startDate && occurrence <= today && (!endDate || occurrence <= endDate)) {
      occurrences.push(formatDateDisplay(occurrence));
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return occurrences;
};

const processAutoDebitOccurrences = async (
  googleSheets: any,
  accountMap: Record<string, MoneyAccount>,
  txRows: any[] = [],
  rules: RecurringDebitRule[]
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingKeys = new Set<string>();
  for (let i = 1; i < txRows.length; i++) {
    const row = txRows[i];
    const ruleId = row[11]?.toString().trim();
    const occurrenceDate = row[12] ? formatDateDisplay(parseDate(row[12])) : '';
    if (ruleId && occurrenceDate) existingKeys.add(`${ruleId}::${occurrenceDate}`);
  }

  const generatedRows: any[][] = [];
  const ruleUpdates: Array<{ rowIndex: number; values: any[] }> = [];

  for (const rule of rules) {
    const account = accountMap[rule.fromAccount];
    if (!rule.isActive || !account || (!isDebitLikeCategory(account.category) && !isCreditCardCategory(account.category))) {
      continue;
    }

    const dueOccurrences = getDueOccurrences(rule, today);
    let lastProcessed = rule.lastProcessedOccurrence || '';

    for (const occurrenceDate of dueOccurrences) {
      const dedupeKey = `${rule.id}::${occurrenceDate}`;
      if (existingKeys.has(dedupeKey)) {
        lastProcessed = occurrenceDate;
        continue;
      }

      const tx: MoneyTransaction = {
        id: createId('auto-tx'),
        date: occurrenceDate,
        type: 'Expense',
        category: rule.category,
        amount: rule.amount,
        fromAccount: rule.fromAccount,
        toAccount: rule.toAccount || '',
        note: rule.name,
        autoRuleId: rule.id,
        autoOccurrenceDate: occurrenceDate,
        isAutoGenerated: true,
      };

      generatedRows.push(buildMoneyTransactionRow(tx, accountMap));
      existingKeys.add(dedupeKey);
      lastProcessed = occurrenceDate;
    }

    if (rule.rowIndex && lastProcessed && lastProcessed !== rule.lastProcessedOccurrence) {
      ruleUpdates.push({
        rowIndex: rule.rowIndex,
        values: [buildRecurringRuleRow({ ...rule, lastProcessedOccurrence: lastProcessed, updatedAt: formatDateDisplay(today) })]
      });
    }
  }

  if (generatedRows.length > 0) {
    await googleSheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_TRANSACTIONS_SHEET}!A:N`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: generatedRows }
    });
  }

  await Promise.all(
    ruleUpdates.map((update) =>
      googleSheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MM_AUTODEBITS_SHEET}!A${update.rowIndex}:O${update.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: update.values }
      })
    )
  );

  if (generatedRows.length === 0) return txRows;

  const refreshed = await googleSheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MM_TRANSACTIONS_SHEET}!A:N`
  });
  return refreshed.data.values || [];
};

const getMoneyAccounts = async (googleSheets: any) => {
  const response = await googleSheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MM_ACCOUNTS_SHEET}!A:F`
  });
  const rows = response.data.values || [];
  const accounts: MoneyAccount[] = [];
  const accountMap: Record<string, MoneyAccount> = {};

  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;

    const accountName = normalizeAccountName(rows[i][0]);
    if (!accountName) continue;

    const account: MoneyAccount = {
      name: accountName,
      category: normalizeAccountName(rows[i][1]) || 'General',
      logoUrl: normalizeAccountName(rows[i][2]),
      initialBalance: parseMoney(rows[i][3]),
      currentBalance: parseMoney(rows[i][4]),
      billingDayOfMonth: isCreditCardCategory(rows[i][1]) ? parseBillingDay(rows[i][5]) : undefined
    };

    accounts.push(account);
    accountMap[accountName] = account;
  }

  return { accounts, accountMap };
};

// ACTIONS

export async function checkDatabaseStatus(forceDemo: boolean = false) {
    if (typeof window !== 'undefined') throw new Error("Server Action");
    
    // DEMO MODE CHECK
    if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        return { configured: true, initialized: true, isDemo: true };
    }

    try {
        const { googleSheets } = await getSheetClient();
        await googleSheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MM_ACCOUNTS_SHEET}!A1:A1`, 
        });
        return { configured: true, initialized: true, isDemo: false };
    } catch (error: any) {
        if (error.message?.includes("Unable to parse range")) return { configured: true, initialized: false, isDemo: false };
        return { configured: true, initialized: false, error: error.message, isDemo: false };
    }
}

export async function initializeDatabase(forceDemo: boolean = false) {
    if (typeof window !== 'undefined') throw new Error("Server Action");
    if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true }; 
    try {
        const { googleSheets } = await getSheetClient();
        const requests = [];
        const meta = await googleSheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const existingSheets = meta.data.sheets?.map(s => s.properties?.title) || [];
        if (!existingSheets.includes(MM_ACCOUNTS_SHEET)) requests.push({ addSheet: { properties: { title: MM_ACCOUNTS_SHEET } } });
        if (!existingSheets.includes(MM_TRANSACTIONS_SHEET)) requests.push({ addSheet: { properties: { title: MM_TRANSACTIONS_SHEET } } });
        if (!existingSheets.includes(MM_CATEGORIES_SHEET)) requests.push({ addSheet: { properties: { title: MM_CATEGORIES_SHEET } } });
        if (!existingSheets.includes(MM_AUTODEBITS_SHEET)) requests.push({ addSheet: { properties: { title: MM_AUTODEBITS_SHEET } } });
        if (requests.length > 0) {
            await googleSheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: { requests }
            });
        }
        await googleSheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MM_ACCOUNTS_SHEET}!A1:F1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [['Account Name', 'Category', 'Logo URL', 'Initial Balance', 'Current Balance (Calc)', 'Billing Day Of Month']] }
        });
        await googleSheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MM_TRANSACTIONS_SHEET}!A1:N1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [MM_TRANSACTION_HEADERS] }
        });
        await googleSheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MM_AUTODEBITS_SHEET}!A1:O1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [MM_AUTODEBIT_HEADERS] }
        });
        if (!existingSheets.includes(MM_CATEGORIES_SHEET)) {
             const maxLen = Math.max(DEFAULT_EXPENSE_CATS.length, DEFAULT_INCOME_CATS.length);
             const values = [['Expense Categories', 'Income Categories']];
             for(let i=0; i<maxLen; i++) {
                 values.push([DEFAULT_EXPENSE_CATS[i] || '', DEFAULT_INCOME_CATS[i] || '']);
             }
             await googleSheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${MM_CATEGORIES_SHEET}!A1:B${values.length}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values }
            });
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getPortfolioData(forceDemo: boolean = false): Promise<PortfolioSummary> {
  if (typeof window !== 'undefined') throw new Error("Server Action");

  // DEMO MODE CHECK
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const holdingsMap: Record<string, Holding> = {};
      const txs = MOCK_TRANSACTIONS_RAW;
      
      txs.forEach(tx => {
          if (!holdingsMap[tx.ticker]) {
              holdingsMap[tx.ticker] = {
                  ticker: tx.ticker, quantity: 0, avgCost: 0, currentPrice: 0, currentValue: 0,
                  totalCost: 0, unrealizedPL: 0, unrealizedPLPercent: 0, allocation: 0,
                  sector: SECTOR_MAP[tx.ticker] || 'Other', assetClass: getAssetClass(tx.ticker)
              };
          }
          const h = holdingsMap[tx.ticker];
          if (tx.action === 'Buy') {
              const cost = (tx.quantity * tx.price) + tx.fees;
              h.totalCost += cost;
              h.quantity += tx.quantity;
          }
      });

      let netWorth = 0;
      let totalCost = 0;
      const holdings = Object.values(holdingsMap).map(h => {
          h.avgCost = h.quantity > 0 ? h.totalCost / h.quantity : 0;
          h.currentPrice = MOCK_PRICES[h.ticker] || h.avgCost * 1.1; // 10% gain default
          h.currentValue = h.quantity * h.currentPrice;
          h.unrealizedPL = h.currentValue - h.totalCost;
          h.unrealizedPLPercent = h.totalCost > 0 ? (h.unrealizedPL / h.totalCost) * 100 : 0;
          netWorth += h.currentValue;
          totalCost += h.totalCost;
          return h;
      });

      const cashBalance = 5000;
      netWorth += cashBalance;

      holdings.forEach(h => h.allocation = (h.currentValue / netWorth) * 100);

      return {
          netWorth,
          totalCost,
          totalPL: netWorth - totalCost,
          totalPLPercent: totalCost > 0 ? ((netWorth - totalCost) / totalCost) * 100 : 0,
          cashBalance,
          holdings: holdings.sort((a, b) => b.currentValue - a.currentValue)
      };
  }

  try {
    const { googleSheets } = await getSheetClient();
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PORTFOLIO_SHEET_NAME}!A:N`, 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { netWorth: 0, totalCost: 0, totalPL: 0, totalPLPercent: 0, cashBalance: 0, holdings: [] };
    }

    const holdings: Holding[] = [];
    let netWorth = 0;
    let totalCost = 0;
    let cashBalance = 0;

    if (rows[24] && rows[24][5]) {
        cashBalance = parseMoney(rows[24][5]);
    }

    const rowPromises = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[4]) {
        const label = row[4].toString().trim();
        const val = parseMoney(row[5]);
        if (label === 'Total Invested') totalCost = val;
        else if (label === 'Net Asset') netWorth = val;
      }

      const status = row[3]?.toString().trim();
      if (status === 'Active') {
        const ticker = row[1]?.toString().toUpperCase().trim();
        if (ticker && ticker !== 'SYMBOL') {
          rowPromises.push(
             (async () => {
                const quantity = parseMoney(row[2]);
                const avgCost = parseMoney(row[4]);
                const currentPrice = parseMoney(row[5]);
                const currentValue = parseMoney(row[8]);
                const unrealizedPL = parseMoney(row[7]);
                
                const sector = await getSector(ticker);
                const assetClass = getAssetClass(ticker);
                
                return {
                    ticker, quantity, avgCost, currentPrice, currentValue,
                    totalCost: quantity * avgCost, 
                    unrealizedPL,
                    unrealizedPLPercent: (quantity * avgCost) > 0 ? (unrealizedPL / (quantity * avgCost)) * 100 : 0,
                    allocation: 0, sector, assetClass
                };
             })()
          );
        }
      }
    }

    const resolvedHoldings = await Promise.all(rowPromises);
    holdings.push(...resolvedHoldings);

    if (netWorth === 0 && holdings.length > 0) {
       netWorth = holdings.reduce((sum, h) => sum + h.currentValue, 0) + cashBalance;
    }
    if (totalCost === 0 && holdings.length > 0) {
       totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    }

    holdings.forEach(h => {
      h.allocation = netWorth > 0 ? (h.currentValue / netWorth) * 100 : 0;
    });

    const totalPL = netWorth - totalCost;
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    return {
      netWorth, totalCost, totalPL, totalPLPercent, cashBalance,
      holdings: holdings.sort((a, b) => b.currentValue - a.currentValue)
    };
  } catch (error: any) {
    if (error.message?.includes("Unable to parse range")) return { netWorth: 0, totalCost: 0, totalPL: 0, totalPLPercent: 0, cashBalance: 0, holdings: [] };
    throw error;
  }
}

export async function getCashFlowData(forceDemo: boolean = false): Promise<CashFlowSummary> {
  if (typeof window !== 'undefined') throw new Error("Server Action");

  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const deposits: Deposit[] = [
        { date: '2024-03-01', amountMYR: 5000, reason: 'Initial Capital' },
        { date: '2024-04-15', amountMYR: 2000, reason: 'Monthly Savings' }
      ];
      const conversions: Conversion[] = [
        { date: '2024-03-05', amountMYR: 4500, amountUSD: 950, rate: 4.73 },
        { date: '2024-04-20', amountMYR: 1800, amountUSD: 380, rate: 4.74 }
      ];
      return {
        totalDepositedMYR: 7000,
        totalConvertedMYR: 6300,
        totalConvertedUSD: 1330,
        avgRate: 4.736,
        deposits: deposits.reverse(), 
        conversions: conversions.reverse()
      };
  }

  try {
    const { googleSheets } = await getSheetClient();
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CASH_FLOW_SHEET_NAME}!A:H`, 
    });
    const rows = response.data.values || [];
    const deposits: Deposit[] = [];
    const conversions: Conversion[] = [];
    rows.forEach((row, index) => {
      if (index === 0) return;
      if (row[0] && row[1]) {
          const amount = parseMoney(row[1]);
          if (!isNaN(amount) && row[0].match(/\d/)) deposits.push({ date: row[0], amountMYR: amount, reason: row[2] });
      }
      if (row[4] && row[5] && row[6]) {
          const myr = parseMoney(row[5]);
          const usd = parseMoney(row[6]);
          const rate = parseMoney(row[7]);
          if (!isNaN(usd) && row[4].match(/\d/)) conversions.push({ date: row[4], amountMYR: myr, amountUSD: usd, rate: rate });
      }
    });
    const totalDepositedMYR = deposits.reduce((sum, d) => sum + d.amountMYR, 0);
    const totalConvertedMYR = conversions.reduce((sum, c) => sum + c.amountMYR, 0);
    const totalConvertedUSD = conversions.reduce((sum, c) => sum + c.amountUSD, 0);
    return { totalDepositedMYR, totalConvertedMYR, totalConvertedUSD, avgRate: totalConvertedUSD > 0 ? totalConvertedMYR / totalConvertedUSD : 0, deposits: deposits.reverse(), conversions: conversions.reverse() };
  } catch (error) {
    return { totalDepositedMYR: 0, totalConvertedMYR: 0, totalConvertedUSD: 0, avgRate: 0, deposits: [], conversions: [] };
  }
}

export async function getMoneyManagerData(forceDemo: boolean = false): Promise<MoneyManagerData> {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  const defaultData: MoneyManagerData = { accounts: [], transactions: [], totalBalance: 0, monthlyStats: { income: 0, expense: 0, incomeGrowth: 0, expenseGrowth: 0 }, categorySpending: [], graphData: [], upcomingBills: [], categories: [...DEFAULT_EXPENSE_CATS, ...DEFAULT_INCOME_CATS], incomeCategories: DEFAULT_INCOME_CATS, expenseCategories: DEFAULT_EXPENSE_CATS, creditCardAccounts: [], autoDebitRules: [] };
  
  // DEMO MODE CHECK
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const accs = MOCK_MONEY_DATA.accounts as MoneyAccount[];
      const txsRaw = MOCK_MONEY_DATA.transactions;
      const transactions = txsRaw.map((t, i) => ({ ...t, rowIndex: i + 1, type: t.type as any })) as MoneyTransaction[];
      
      const totalBalance = accs.reduce((sum, a) => sum + a.currentBalance, 0);
      const creditCardAccounts = accs.filter(acc => isCreditCardCategory(acc.category));
      
      // Basic stats calc
      const income = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions
        .filter(t => t.type === 'Expense' && (!t.isCardCharge || t.settlementStatus === 'Settled'))
        .reduce((sum, t) => sum + t.amount, 0);

      const categoryTotals: Record<string, number> = {};
      transactions
        .filter(t => t.type === 'Expense' && (!t.isCardCharge || t.settlementStatus === 'Settled'))
        .forEach(t => categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount);
      const categorySpending = Object.entries(categoryTotals).map(([c, val]) => ({
          category: c, spent: val, limit: 1000, percentage: (val / 1000) * 100
      })).sort((a,b) => b.spent - a.spent);

      const graphData = [
        { name: 'Jan', income: 4500, expense: 2000 },
        { name: 'Feb', income: 5200, expense: 2300 },
        { name: 'Mar', income: 6500, expense: 2850 }
      ];

      return {
          accounts: accs,
          transactions: transactions,
          totalBalance,
          monthlyStats: { income, expense, incomeGrowth: 10, expenseGrowth: 5 },
          categorySpending,
          graphData,
          upcomingBills: [],
          categories: [...DEFAULT_EXPENSE_CATS, ...DEFAULT_INCOME_CATS],
          incomeCategories: DEFAULT_INCOME_CATS,
          expenseCategories: DEFAULT_EXPENSE_CATS,
          creditCardAccounts,
          autoDebitRules: MOCK_MONEY_DATA.autoDebitRules
      };
  }

  try {
    const { googleSheets } = await getSheetClient();
    await ensureAutoDebitInfrastructure(googleSheets);
    const [accResponse, txResponse, catResponse] = await Promise.all([
        googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_ACCOUNTS_SHEET}!A:F` }),
        googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_TRANSACTIONS_SHEET}!A:N` }),
        googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_CATEGORIES_SHEET}!A:B` })
    ]);
    
    const catRows = catResponse.data.values || [];
    const fetchedIncomeCats: string[] = [];
    const fetchedExpenseCats: string[] = [];
    for(let i = 1; i < catRows.length; i++) {
        if (catRows[i][0]) fetchedExpenseCats.push(catRows[i][0].toString().trim());
        if (catRows[i][1]) fetchedIncomeCats.push(catRows[i][1].toString().trim());
    }
    const incomeCats = fetchedIncomeCats.length > 0 ? fetchedIncomeCats : DEFAULT_INCOME_CATS;
    const expenseCats = fetchedExpenseCats.length > 0 ? fetchedExpenseCats : DEFAULT_EXPENSE_CATS;
    
    const accRows = accResponse.data.values || [];
    const accounts: MoneyAccount[] = [];
    const accountMap: Record<string, MoneyAccount> = {};
    
    for (let i = 1; i < accRows.length; i++) {
      if (accRows[i][0]) {
        const accountName = normalizeAccountName(accRows[i][0]);
        if (!accountName) continue;
        const initialBal = parseMoney(accRows[i][3]);
        const currentBalFromSheet = parseMoney(accRows[i][4]); 
        
        const acc = { 
            name: accountName, 
            category: normalizeAccountName(accRows[i][1]) || 'General', 
            logoUrl: normalizeAccountName(accRows[i][2]), 
            initialBalance: initialBal, 
            currentBalance: currentBalFromSheet,
            billingDayOfMonth: isCreditCardCategory(accRows[i][1]) ? parseBillingDay(accRows[i][5]) : undefined
        };
        accounts.push(acc);
        accountMap[accountName] = acc;
      }
    }
    
    const creditCardAccounts = accounts.filter(acc => isCreditCardCategory(acc.category));
    const autoDebitRules = await getRecurringRules(googleSheets);
    const txRows = await processAutoDebitOccurrences(googleSheets, accountMap, txResponse.data.values || [], autoDebitRules);
    const hydratedAutoDebitRules = txRows === (txResponse.data.values || []) ? autoDebitRules : await getRecurringRules(googleSheets);
    const transactions: MoneyTransaction[] = [];
    const categoryTotals: Record<string, number> = {};
    const graphMap: Record<string, { income: number, expense: number, sortKey: number }> = {};
    const upcomingBills: Bill[] = [];
    const uniqueCategories = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`; 
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;
    
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    let lastMonthIncome = 0;
    let lastMonthExpense = 0;
    
    for (let i = 1; i < txRows.length; i++) {
       const row = txRows[i];
       if (row[0] && row[3]) {
         const tx = mapMoneyTransactionRow(row, i + 1, accountMap);
         if (!tx) continue;
         const dateObj = parseDate(tx.date);
         const amount = tx.amount;
         const type = tx.type;
         const category = tx.category;
         const isCardCharge = tx.isCardCharge;
         const settlementStatus = tx.settlementStatus;
         const settledAt = tx.settledAt;
         const fromAcc = tx.fromAccount || '';
         
         if (category && category !== 'Uncategorized') uniqueCategories.add(category);
         transactions.push(tx);
         
         if (type === 'Income' || type === 'Expense') {
            const recognizedDate = isCardCharge && settlementStatus === 'Settled' && settledAt ? parseDate(settledAt) : dateObj;
            const shouldCountAsExpense = type === 'Expense' && (!isCardCharge || settlementStatus === 'Settled');
            const txMonthKey = `${recognizedDate.getFullYear()}-${recognizedDate.getMonth()}`;
            if (txMonthKey === currentMonthKey) {
                if (type === 'Income') currentMonthIncome += amount;
                else if (shouldCountAsExpense) { currentMonthExpense += amount; categoryTotals[category] = (categoryTotals[category] || 0) + amount; }
            } else if (txMonthKey === lastMonthKey) {
                if (type === 'Income') lastMonthIncome += amount;
                else if (shouldCountAsExpense) lastMonthExpense += amount;
            }
            if (type === 'Income' || shouldCountAsExpense) {
                const graphKey = `${recognizedDate.getFullYear()}-${String(recognizedDate.getMonth() + 1).padStart(2, '0')}`;
                if (!graphMap[graphKey]) graphMap[graphKey] = { income: 0, expense: 0, sortKey: recognizedDate.getTime() };
                if (type === 'Income') graphMap[graphKey].income += amount;
                else graphMap[graphKey].expense += amount;
            }
         }
         if (dateObj > today && type === 'Expense' && !isCardCharge) {
            upcomingBills.push({ id: `bill-${i}`, name: row[6] || category, date: formatDateDisplay(dateObj), amount: amount, isPaid: false });
         }
       }
    }
    
    accounts.sort((a, b) => b.currentBalance - a.currentBalance);
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const graphData = Object.entries(graphMap).sort(([, a], [, b]) => a.sortKey - b.sortKey).slice(-7).map(([key, val]) => {
        const [y, m] = key.split('-');
        return { name: new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('default', { month: 'short' }), income: val.income, expense: val.expense };
    });
    
    const calcGrowth = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
    const categorySpending = Object.keys(categoryTotals).filter(cat => categoryTotals[cat] > 0).map(cat => {
        const spent = categoryTotals[cat];
        const limit = Math.max(spent * 1.2, 500); 
        return { category: cat, spent, limit, percentage: (spent / limit) * 100 };
    }).sort((a, b) => b.spent - a.spent);
    
    return { 
        accounts, 
        transactions, 
        totalBalance: accounts.reduce((sum, acc) => sum + acc.currentBalance, 0), // Pure sum from Column E
        monthlyStats: { income: currentMonthIncome, expense: currentMonthExpense, incomeGrowth: calcGrowth(currentMonthIncome, lastMonthIncome), expenseGrowth: calcGrowth(currentMonthExpense, lastMonthExpense) }, 
        categorySpending, graphData, upcomingBills, 
        categories: Array.from(uniqueCategories).sort().length > 0 ? Array.from(uniqueCategories).sort() : expenseCats, 
        incomeCategories: incomeCats, expenseCategories: expenseCats,
        creditCardAccounts,
        autoDebitRules: hydratedAutoDebitRules
    };
  } catch (error) { return defaultData; }
}

export async function addMoneyTransaction(data: MoneyTransaction, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };
  try {
    const { googleSheets } = await getSheetClient();
    const { accountMap } = await getMoneyAccounts(googleSheets);
    await googleSheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_TRANSACTIONS_SHEET}!A:N`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [buildMoneyTransactionRow(data, accountMap)] }
    });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function updateMoneyTransaction(rowIndex: number, data: MoneyTransaction, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };
  try {
    const { googleSheets } = await getSheetClient();
    const { accountMap } = await getMoneyAccounts(googleSheets);
    await googleSheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_TRANSACTIONS_SHEET}!A${rowIndex}:N${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [buildMoneyTransactionRow(data, accountMap)] }
    });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function deleteMoneyTransaction(rowIndex: number, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `${MM_TRANSACTIONS_SHEET}!A${rowIndex}:N${rowIndex}` });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function settleCreditCardBill(
  cardAccountName: string,
  payingAccountName: string,
  settledAt: string,
  settlementScope: CreditCardSettlementScope,
  forceDemo: boolean = false
) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };

  try {
    const { googleSheets } = await getSheetClient();
    const [{ accountMap }, txResponse] = await Promise.all([
      getMoneyAccounts(googleSheets),
      googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_TRANSACTIONS_SHEET}!A:N` })
    ]);

    const cardAccount = accountMap[cardAccountName];
    if (!cardAccount || !isCreditCardCategory(cardAccount.category)) {
      return { success: false, error: 'Selected account is not a credit card.' };
    }

    const payingAccount = accountMap[payingAccountName];
    if (!payingAccount || !isDebitLikeCategory(payingAccount.category)) {
      return { success: false, error: 'Selected paying account must be Bank, Wallet, Cash, or Debit Card.' };
    }

    const rows = txResponse.data.values || [];
    const updates: Array<{ rowIndex: number; amount: number; values: any[] }> = [];
    let settlementTotal = 0;
    const activeCycle = getActiveBillingCycle(cardAccount.billingDayOfMonth);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || !row[3]) continue;

      const type = row[1]?.toString().trim();
      const fromAccount = row[4]?.toString().trim();
      const amount = parseMoney(row[3]);
      const isCardCharge = isTruthySheetValue(row[7]) || (type === 'Expense' && fromAccount === cardAccountName && isCreditCardCategory(accountMap[fromAccount]?.category));
      const settlementStatus = isCardCharge ? getSettlementStatus(row[8]) : undefined;

      const isEligibleStatementCharge =
        settlementScope === 'outstanding' ||
        isTransactionInActiveStatement({ date: formatDateDisplay(parseDate(row[0])) }, cardAccount, activeCycle.startDate);

      if (type === 'Expense' && fromAccount === cardAccountName && isCardCharge && settlementStatus !== 'Settled' && isEligibleStatementCharge) {
        const nextRow = [...row];
        nextRow[7] = 'Yes';
        nextRow[8] = 'Settled';
        nextRow[9] = settledAt;
        nextRow[10] = payingAccountName;
        updates.push({ rowIndex: i + 1, amount, values: nextRow.slice(0, 14) });
        settlementTotal += amount;
      }
    }

    if (updates.length === 0) {
      return { success: false, error: settlementScope === 'statement' ? 'No unpaid statement charges found for this card.' : 'No unpaid credit card charges found for this card.' };
    }

    await Promise.all(
      updates.map((update) =>
        googleSheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${MM_TRANSACTIONS_SHEET}!A${update.rowIndex}:N${update.rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [update.values] }
        })
      )
    );

    await googleSheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_TRANSACTIONS_SHEET}!A:N`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          settledAt,
          'Transfer',
          'Credit Card Settlement',
          settlementTotal,
          payingAccountName,
          cardAccountName,
          `Recorded ${settlementScope === 'statement' ? 'statement' : 'outstanding'} payment for ${cardAccountName}`,
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]]
      }
    });

    return { success: true, settledCount: updates.length, settledAmount: settlementTotal };
  } catch (error) {
    return { success: false, error: 'Failed to settle credit card bill.' };
  }
}

export async function updateCreditCardBillingDay(
  cardAccountName: string,
  billingDayOfMonth: number,
  forceDemo: boolean = false
) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };

  try {
    const { googleSheets } = await getSheetClient();
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_ACCOUNTS_SHEET}!A:F`
    });
    const rows = response.data.values || [];
    const safeBillingDay = getBillingDayOfMonth({ billingDayOfMonth });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (normalizeAccountName(row[0]) !== cardAccountName) continue;
      if (!isCreditCardCategory(row[1])) {
        return { success: false, error: 'Selected account is not a credit card.' };
      }

      await googleSheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MM_ACCOUNTS_SHEET}!F${i + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[safeBillingDay]] }
      });
      return { success: true };
    }

    return { success: false, error: 'Credit card account not found.' };
  } catch (error) {
    return { success: false, error: 'Failed to update credit card billing day.' };
  }
}

export async function addAutoDebitRule(data: RecurringDebitRule, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };

  try {
    const { googleSheets } = await getSheetClient();
    await ensureAutoDebitInfrastructure(googleSheets);
    const today = formatDateDisplay(new Date());
    const rule: RecurringDebitRule = {
      ...data,
      id: data.id || createId('rule'),
      scheduleType: 'Monthly',
      createdAt: data.createdAt || today,
      updatedAt: today,
    };

    await googleSheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_AUTODEBITS_SHEET}!A:O`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [buildRecurringRuleRow(rule)] }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to add auto-debit rule.' };
  }
}

export async function updateAutoDebitRule(rowIndex: number, data: RecurringDebitRule, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };

  try {
    const { googleSheets } = await getSheetClient();
    await ensureAutoDebitInfrastructure(googleSheets);
    const currentRow = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_AUTODEBITS_SHEET}!A${rowIndex}:O${rowIndex}`
    });
    const existing = currentRow.data.values?.[0] || [];
    const rule: RecurringDebitRule = {
      ...data,
      createdAt: data.createdAt || existing[13] || formatDateDisplay(new Date()),
      updatedAt: formatDateDisplay(new Date()),
      scheduleType: 'Monthly',
    };

    await googleSheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_AUTODEBITS_SHEET}!A${rowIndex}:O${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [buildRecurringRuleRow(rule)] }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update auto-debit rule.' };
  }
}

export async function toggleAutoDebitRule(rowIndex: number, isActive: boolean, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };

  try {
    const { googleSheets } = await getSheetClient();
    await ensureAutoDebitInfrastructure(googleSheets);
    const rules = await getRecurringRules(googleSheets);
    const target = rules.find((rule) => rule.rowIndex === rowIndex);
    if (!target) return { success: false, error: 'Rule not found.' };

    return updateAutoDebitRule(rowIndex, { ...target, isActive }, forceDemo);
  } catch (error) {
    return { success: false, error: 'Failed to update auto-debit rule status.' };
  }
}

export async function deleteAutoDebitRule(rowIndex: number, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };

  try {
    const { googleSheets } = await getSheetClient();
    await ensureAutoDebitInfrastructure(googleSheets);
    await googleSheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_AUTODEBITS_SHEET}!A${rowIndex}:O${rowIndex}`
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete auto-debit rule.' };
  }
}

export async function syncAutoDebitRuleFromTransaction(autoRuleId: string, data: MoneyTransaction, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };

  try {
    const { googleSheets } = await getSheetClient();
    await ensureAutoDebitInfrastructure(googleSheets);
    const rules = await getRecurringRules(googleSheets);
    const target = rules.find((rule) => rule.id === autoRuleId);
    if (!target || !target.rowIndex) return { success: false, error: 'Auto-debit rule not found.' };

    const updatedRule: RecurringDebitRule = {
      ...target,
      name: data.note || target.name,
      amount: data.amount,
      category: data.category,
      fromAccount: data.fromAccount || target.fromAccount,
      toAccount: data.toAccount || '',
      dayOfMonth: parseDate(data.date).getDate(),
      updatedAt: formatDateDisplay(new Date()),
    };

    return updateAutoDebitRule(target.rowIndex, updatedRule, forceDemo);
  } catch (error) {
    return { success: false, error: 'Failed to sync auto-debit rule.' };
  }
}

export async function deactivateAutoDebitRuleById(autoRuleId: string, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };

  try {
    const { googleSheets } = await getSheetClient();
    await ensureAutoDebitInfrastructure(googleSheets);
    const rules = await getRecurringRules(googleSheets);
    const target = rules.find((rule) => rule.id === autoRuleId);
    if (!target || !target.rowIndex) return { success: false, error: 'Auto-debit rule not found.' };

    return updateAutoDebitRule(target.rowIndex, { ...target, isActive: false }, forceDemo);
  } catch (error) {
    return { success: false, error: 'Failed to deactivate auto-debit rule.' };
  }
}

export async function addCategory(category: string, type: 'Income' | 'Expense', forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };
  try {
    const { googleSheets } = await getSheetClient();
    const col = type === 'Expense' ? 'A' : 'B';
    const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_CATEGORIES_SHEET}!${col}:${col}` });
    const nextRow = (response.data.values || []).length + 1;
    await googleSheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${MM_CATEGORIES_SHEET}!${col}${nextRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[category]] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function deleteCategory(category: string, type: 'Income' | 'Expense', forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };
  try {
    const { googleSheets } = await getSheetClient();
    const col = type === 'Expense' ? 'A' : 'B';
    const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_CATEGORIES_SHEET}!${col}:${col}` });
    const rows = response.data.values || [];
    let idx = -1;
    for(let i=1; i < rows.length; i++) { if(rows[i][0] === category) { idx = i + 1; break; } }
    if(idx === -1) return { success: false, error: 'Not found' };
    await googleSheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `${MM_CATEGORIES_SHEET}!${col}${idx}` });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function updateCategory(oldName: string, newName: string, type: 'Income' | 'Expense', forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };
  try {
    const { googleSheets } = await getSheetClient();
    const col = type === 'Expense' ? 'A' : 'B';
    const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_CATEGORIES_SHEET}!${col}:${col}` });
    const rows = response.data.values || [];
    let idx = -1;
    for(let i=1; i < rows.length; i++) { if(rows[i][0] === oldName) { idx = i + 1; break; } }
    if(idx === -1) return { success: false, error: 'Not found' };
    await googleSheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${MM_CATEGORIES_SHEET}!${col}${idx}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[newName]] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function addTrade(data: any, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A:G`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[data.date, data.ticker, data.action, data.quantity, data.price, data.fees, (data.quantity * data.price)]] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function addDeposit(data: { date: string, amount: number, reason: string }, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${CASH_FLOW_SHEET_NAME}!A:C`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[data.date, data.amount, data.reason]] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function addConversion(data: { date: string, myr: number, usd: number, rate: number }, forceDemo: boolean = false) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (forceDemo || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: true };
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${CASH_FLOW_SHEET_NAME}!E:H`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[data.date, data.myr, data.usd, data.rate]] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}
