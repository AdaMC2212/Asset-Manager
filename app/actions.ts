
'use server';

import { getSheetClient, SPREADSHEET_ID, SHEET_NAME, CASH_FLOW_SHEET_NAME, PORTFOLIO_SHEET_NAME, MM_ACCOUNTS_SHEET, MM_TRANSACTIONS_SHEET, MM_CATEGORIES_SHEET } from '../lib/googleSheets';
import { PortfolioSummary, Holding, TradeAction, CashFlowSummary, Deposit, Conversion, MoneyManagerData, MoneyAccount, MoneyTransaction, CategorySpending, GraphDataPoint, Bill, MonthlyStats } from '../types';
import yahooFinance from 'yahoo-finance2';

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

export async function checkDatabaseStatus() {
    if (typeof window !== 'undefined') throw new Error("Server Action");
    const isConfigured = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!isConfigured) return { configured: false, initialized: false };
    try {
        const { googleSheets } = await getSheetClient();
        await googleSheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MM_ACCOUNTS_SHEET}!A1:A1`, 
        });
        return { configured: true, initialized: true };
    } catch (error: any) {
        if (error.message?.includes("Unable to parse range")) return { configured: true, initialized: false };
        return { configured: true, initialized: false, error: error.message };
    }
}

export async function initializeDatabase() {
    if (typeof window !== 'undefined') throw new Error("Server Action");
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return { success: false, error: "No API Key" };
    try {
        const { googleSheets } = await getSheetClient();
        const requests = [];
        const meta = await googleSheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const existingSheets = meta.data.sheets?.map(s => s.properties?.title) || [];
        if (!existingSheets.includes(MM_ACCOUNTS_SHEET)) requests.push({ addSheet: { properties: { title: MM_ACCOUNTS_SHEET } } });
        if (!existingSheets.includes(MM_TRANSACTIONS_SHEET)) requests.push({ addSheet: { properties: { title: MM_TRANSACTIONS_SHEET } } });
        if (!existingSheets.includes(MM_CATEGORIES_SHEET)) requests.push({ addSheet: { properties: { title: MM_CATEGORIES_SHEET } } });
        if (requests.length > 0) {
            await googleSheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: { requests }
            });
        }
        if (!existingSheets.includes(MM_ACCOUNTS_SHEET)) {
             await googleSheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${MM_ACCOUNTS_SHEET}!A1:E1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [['Account Name', 'Category', 'Logo URL', 'Initial Balance', 'Current Balance (Calc)']] }
            });
        }
        if (!existingSheets.includes(MM_TRANSACTIONS_SHEET)) {
             await googleSheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${MM_TRANSACTIONS_SHEET}!A1:G1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [['Date', 'Type', 'Category', 'Amount', 'From Account', 'To Account', 'Note']] }
            });
        }
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

/**
 * Server Action: Fetches portfolio data from Google Sheets
 */
export async function getPortfolioData(): Promise<PortfolioSummary> {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) throw new Error("Configuration Missing.");

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

    // Target F25 explicitly for Uninvested Cash positioning
    if (rows[24] && rows[24][5]) {
        cashBalance = parseMoney(rows[24][5]);
    }

    const rowPromises = [];

    // Scan for Summary Stats
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

export async function getCashFlowData(): Promise<CashFlowSummary> {
  if (typeof window !== 'undefined') throw new Error("Server Action");
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

export async function getMoneyManagerData(): Promise<MoneyManagerData> {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  const defaultData: MoneyManagerData = { accounts: [], transactions: [], totalBalance: 0, monthlyStats: { income: 0, expense: 0, incomeGrowth: 0, expenseGrowth: 0 }, categorySpending: [], graphData: [], upcomingBills: [], categories: [...DEFAULT_EXPENSE_CATS, ...DEFAULT_INCOME_CATS], incomeCategories: DEFAULT_INCOME_CATS, expenseCategories: DEFAULT_EXPENSE_CATS };
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return defaultData;
  try {
    const { googleSheets } = await getSheetClient();
    const [accResponse, txResponse, catResponse] = await Promise.all([
        googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_ACCOUNTS_SHEET}!A:F` }), // Extended to F to capture everything
        googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_TRANSACTIONS_SHEET}!A:G` }),
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
        const initialBal = parseMoney(accRows[i][3]);
        // INTEGRATION: Use Column E (index 4) as the 'final version' source of truth for balances
        const currentBalFromSheet = parseMoney(accRows[i][4]); 
        
        const acc = { 
            name: accRows[i][0], 
            category: accRows[i][1] || 'General', 
            logoUrl: accRows[i][2] || '', 
            initialBalance: initialBal, 
            currentBalance: currentBalFromSheet 
        };
        accounts.push(acc);
        accountMap[accRows[i][0]] = acc;
      }
    }
    
    const txRows = txResponse.data.values || [];
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
         const dateObj = parseDate(row[0]);
         const amount = parseMoney(row[3]);
         const type = row[1]?.trim();
         const category = row[2] || 'Uncategorized';
         const fromAcc = row[4]?.trim();
         const toAcc = row[5]?.trim();
         
         if (category && category !== 'Uncategorized') uniqueCategories.add(category);
         transactions.push({ id: `mtx-${i}`, rowIndex: i + 1, date: formatDateDisplay(dateObj), type: type as any, category, amount, fromAccount: fromAcc, toAccount: toAcc, note: row[6] });
         
         // Note: We no longer modify currentBalance here because we trust the sheet's final version (Column E)
         
         if (type === 'Income' || type === 'Expense') {
            const txMonthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
            if (txMonthKey === currentMonthKey) {
                if (type === 'Income') currentMonthIncome += amount;
                else { currentMonthExpense += amount; categoryTotals[category] = (categoryTotals[category] || 0) + amount; }
            } else if (txMonthKey === lastMonthKey) {
                if (type === 'Income') lastMonthIncome += amount;
                else lastMonthExpense += amount;
            }
            const graphKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            if (!graphMap[graphKey]) graphMap[graphKey] = { income: 0, expense: 0, sortKey: dateObj.getTime() };
            if (type === 'Income') graphMap[graphKey].income += amount;
            else graphMap[graphKey].expense += amount;
         }
         if (dateObj > today && type === 'Expense') upcomingBills.push({ id: `bill-${i}`, name: row[6] || category, date: formatDateDisplay(dateObj), amount: amount, isPaid: false });
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
        incomeCategories: incomeCats, expenseCategories: expenseCats 
    };
  } catch (error) { return defaultData; }
}

export async function addMoneyTransaction(data: MoneyTransaction) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${MM_TRANSACTIONS_SHEET}!A:G`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[data.date, data.type, data.category, data.amount, data.fromAccount || '', data.toAccount || '', data.note || '']] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function updateMoneyTransaction(rowIndex: number, data: MoneyTransaction) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${MM_TRANSACTIONS_SHEET}!A${rowIndex}:G${rowIndex}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[data.date, data.type, data.category, data.amount, data.fromAccount || '', data.toAccount || '', data.note || '']] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function deleteMoneyTransaction(rowIndex: number) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `${MM_TRANSACTIONS_SHEET}!A${rowIndex}:G${rowIndex}` });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function addCategory(category: string, type: 'Income' | 'Expense') {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  try {
    const { googleSheets } = await getSheetClient();
    const col = type === 'Expense' ? 'A' : 'B';
    const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MM_CATEGORIES_SHEET}!${col}:${col}` });
    const nextRow = (response.data.values || []).length + 1;
    await googleSheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${MM_CATEGORIES_SHEET}!${col}${nextRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[category]] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function deleteCategory(category: string, type: 'Income' | 'Expense') {
  if (typeof window !== 'undefined') throw new Error("Server Action");
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

export async function updateCategory(oldName: string, newName: string, type: 'Income' | 'Expense') {
  if (typeof window !== 'undefined') throw new Error("Server Action");
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

export async function addTrade(data: any) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A:G`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[data.date, data.ticker, data.action, data.quantity, data.price, data.fees, (data.quantity * data.price)]] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function addDeposit(data: { date: string, amount: number, reason: string }) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${CASH_FLOW_SHEET_NAME}!A:C`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[data.date, data.amount, data.reason]] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}

export async function addConversion(data: { date: string, myr: number, usd: number, rate: number }) {
  if (typeof window !== 'undefined') throw new Error("Server Action");
  try {
    const { googleSheets } = await getSheetClient();
    await googleSheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${CASH_FLOW_SHEET_NAME}!E:H`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[data.date, data.myr, data.usd, data.rate]] } });
    return { success: true };
  } catch (error) { return { success: false, error: 'Failed' }; }
}
