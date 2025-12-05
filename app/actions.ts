
'use server';

import { getSheetClient, SPREADSHEET_ID, SHEET_NAME, CASH_FLOW_SHEET_NAME, PORTFOLIO_SHEET_NAME, MM_ACCOUNTS_SHEET, MM_TRANSACTIONS_SHEET, MM_CATEGORIES_SHEET } from '../lib/googleSheets';
import { PortfolioSummary, Holding, TradeAction, CashFlowSummary, Deposit, Conversion, MoneyManagerData, MoneyAccount, MoneyTransaction, CategorySpending, GraphDataPoint, Bill, MonthlyStats } from '../types';
import yahooFinance from 'yahoo-finance2';

// --- Helper Functions for Categorization ---

// Expanded Map for instant lookups
const SECTOR_MAP: Record<string, string> = {
    // Tech
    AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Semiconductors', INTC: 'Semiconductors', AMD: 'Semiconductors',
    SMH: 'Semiconductors', META: 'Technology', GOOGL: 'Technology', GOOG: 'Technology', AMZN: 'Consumer Cyclical', 
    PLTR: 'Technology', AVGO: 'Semiconductors', NFLX: 'Communication Services', CRM: 'Technology', ADBE: 'Technology',
    ORCL: 'Technology', CSCO: 'Technology', TSM: 'Semiconductors', QCOM: 'Semiconductors', MU: 'Semiconductors',
    
    // EV / Auto
    TSLA: 'Automotive', F: 'Automotive', GM: 'Automotive', RIVN: 'Automotive', LCID: 'Automotive',

    // Financials
    JPM: 'Financials', BAC: 'Financials', V: 'Financials', MA: 'Financials', WFC: 'Financials',
    GS: 'Financials', MS: 'Financials', BLK: 'Financials', C: 'Financials',

    // Healthcare
    UNH: 'Healthcare', JNJ: 'Healthcare', PFE: 'Healthcare', LLY: 'Healthcare', MRK: 'Healthcare',
    ABBV: 'Healthcare', TMO: 'Healthcare',

    // Energy
    XOM: 'Energy', CVX: 'Energy', SHEL: 'Energy', COP: 'Energy',

    // Consumer
    WMT: 'Consumer Defensive', KO: 'Consumer Defensive', PEP: 'Consumer Defensive', PG: 'Consumer Defensive',
    COST: 'Consumer Defensive', MCD: 'Consumer Cyclical', SBUX: 'Consumer Cyclical', NKE: 'Consumer Cyclical',

    // ETFs (Index / Sector)
    VOO: 'Index ETF', SPY: 'Index ETF', QQQ: 'Index ETF', QQQM: 'Index ETF', IWM: 'Index ETF', 
    VTI: 'Index ETF', VEA: 'Index ETF', VWO: 'Index ETF', BND: 'Bond ETF', GLD: 'Commodity ETF',
    XLE: 'Energy ETF', XLF: 'Financial ETF', XLK: 'Tech ETF', XLV: 'Healthcare ETF',

    // Crypto
    IBIT: 'Crypto', BTC: 'Crypto', ETH: 'Crypto', COIN: 'Crypto', MSTR: 'Crypto Proxy'
};

const DEFAULT_INCOME_CATS = ['Salary', 'Bonus', 'Allowance', 'Dividend', 'Side Hustle', 'Other'];
const DEFAULT_EXPENSE_CATS = ['Food', 'Transport', 'Bills', 'Fashion', 'Entertainment', 'Healthcare', 'Electronics', 'Debt', 'Family', 'Other'];

const getAssetClass = (ticker: string) => {
  const t = ticker.toUpperCase();
  if (SECTOR_MAP[t]?.includes('ETF')) return 'ETF';
  if (SECTOR_MAP[t]?.includes('Crypto')) return 'Crypto';
  
  // Basic heuristic if unknown
  if (t === 'BTC' || t === 'ETH' || t === 'SOL') return 'Crypto';
  if (t.length === 3 && t.startsWith('V')) return 'ETF'; // Rough guess for Vanguard

  return 'Equity';
};

// Dynamic Sector Fetcher
const getSector = async (ticker: string) => {
  const t = ticker.toUpperCase();
  
  // 1. Check Hardcoded Map first (Fastest)
  if (SECTOR_MAP[t]) return SECTOR_MAP[t];

  // 2. Try Yahoo Finance
  try {
    const quote = await yahooFinance.quoteSummary(t, { modules: ['summaryProfile', 'quoteType'] }) as any;
    const sector = quote.summaryProfile?.sector;
    const quoteType = quote.quoteType?.quoteType;

    if (sector) return sector;
    if (quoteType === 'ETF') return 'Index ETF';
    if (quoteType === 'CRYPTOCURRENCY') return 'Crypto';
    
  } catch (e) {
    // console.warn(`Failed to fetch sector for ${t}`, e);
  }

  // 3. Fallback
  return 'Other';
};

// Helper: Remove currency symbols ($) and commas
const parseMoney = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Keep only digits, dots, and negative signs
  const clean = value.toString().replace(/[^0-9.-]/g, '');
  return parseFloat(clean) || 0;
};

// Helper: Parse dates flexibly (DD/MM/YYYY or YYYY-MM-DD)
// FIXED: Uses Noon time to avoid Timezone offsets rolling dates back/forward
const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Check for DD/MM/YYYY
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    // Use 12:00:00 to be safe from timezone shifts
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  
  // Check for YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
     const [year, month, day] = dateStr.split('-').map(Number);
     return new Date(year, month - 1, day, 12, 0, 0);
  }
  
  return new Date(dateStr);
};

// Helper: Format date for display
const formatDateDisplay = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Server Action: Fetches portfolio data from Google Sheets
 */
export async function getPortfolioData(): Promise<PortfolioSummary> {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser. Please use a local Next.js server.");
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error("Configuration Missing: GOOGLE_SERVICE_ACCOUNT_KEY not found in env.");
  }

  try {
    const { googleSheets } = await getSheetClient();
    
    // Fetch columns A through N from the Portfolio sheet
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

    // We assume row 0 is header, data starts at row 1
    // Collect all promises for sector fetching
    const rowPromises = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Parse Summary Stats
      if (row[11]) {
        const label = row[11].toString().trim();
        const val = parseMoney(row[12]);
        if (label === 'Total Invested') totalCost = val;
        else if (label === 'Total Cash') cashBalance = val;
        else if (label === 'Net Asset') netWorth = val;
      }

      const status = row[3]?.toString().trim();
      if (status === 'Active') {
        const ticker = row[1]?.toString().toUpperCase().trim();
        if (ticker) {
          rowPromises.push(
             (async () => {
                const quantity = parseMoney(row[2]);
                const avgCost = parseMoney(row[4]);
                const currentPrice = parseMoney(row[5]);
                const currentValue = quantity * currentPrice;
                const totalCostForHolding = quantity * avgCost;
                const unrealizedPL = currentValue - totalCostForHolding;
                
                const sector = await getSector(ticker);
                const assetClass = getAssetClass(ticker);

                return {
                    ticker,
                    quantity,
                    avgCost,
                    currentPrice,
                    currentValue,
                    totalCost: totalCostForHolding,
                    unrealizedPL,
                    unrealizedPLPercent: totalCostForHolding > 0 ? (unrealizedPL / totalCostForHolding) * 100 : 0,
                    allocation: 0,
                    sector: sector,
                    assetClass: assetClass
                };
             })()
          );
        }
      }
    }

    const resolvedHoldings = await Promise.all(rowPromises);
    holdings.push(...resolvedHoldings);

    // Fallback Summary Stats
    if (netWorth === 0 && holdings.length > 0) {
       netWorth = holdings.reduce((sum, h) => sum + h.currentValue, 0) + cashBalance;
    }
    if (totalCost === 0 && holdings.length > 0) {
       totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    }

    // Calculate Allocation
    holdings.forEach(h => {
      h.allocation = netWorth > 0 ? (h.currentValue / netWorth) * 100 : 0;
    });

    const totalPL = netWorth - totalCost;
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    return {
      netWorth,
      totalCost,
      totalPL,
      totalPLPercent,
      cashBalance,
      holdings: holdings.sort((a, b) => b.currentValue - a.currentValue)
    };

  } catch (error: any) {
    console.error("Portfolio Fetch Error:", error);
    if (error.message?.includes("Unable to parse range")) {
        throw new Error(`Sheet Not Found: Could not find tab named '${PORTFOLIO_SHEET_NAME}'. Please rename your Google Sheet tab to exactly '${PORTFOLIO_SHEET_NAME}'.`);
    }
    throw error;
  }
}

export async function getCashFlowData(): Promise<CashFlowSummary> {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error("Configuration Missing: GOOGLE_SERVICE_ACCOUNT_KEY not found in env.");
  }

  try {
    const { googleSheets } = await getSheetClient();
    
    // Fetch Cash Flow tab Columns A-H
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CASH_FLOW_SHEET_NAME}!A:H`, 
    });

    const rows = response.data.values || [];
    const deposits: Deposit[] = [];
    const conversions: Conversion[] = [];

    rows.forEach((row, index) => {
      if (index === 0) return; // Skip Header

      if (row[0] && row[1]) {
          const amount = parseMoney(row[1]);
          if (!isNaN(amount) && row[0].match(/\d/)) {
            deposits.push({
                date: row[0],
                amountMYR: amount,
                reason: row[2]
            });
          }
      }
      
      if (row[4] && row[5] && row[6]) {
          const myr = parseMoney(row[5]);
          const usd = parseMoney(row[6]);
          const rate = parseMoney(row[7]);
          if (!isNaN(usd) && row[4].match(/\d/)) {
            conversions.push({
                date: row[4],
                amountMYR: myr,
                amountUSD: usd,
                rate: rate
            });
          }
      }
    });

    const totalDepositedMYR = deposits.reduce((sum, d) => sum + d.amountMYR, 0);
    const totalConvertedMYR = conversions.reduce((sum, c) => sum + c.amountMYR, 0);
    const totalConvertedUSD = conversions.reduce((sum, c) => sum + c.amountUSD, 0);
    const avgRate = totalConvertedUSD > 0 ? totalConvertedMYR / totalConvertedUSD : 0;

    return {
      totalDepositedMYR,
      totalConvertedMYR,
      totalConvertedUSD,
      avgRate,
      deposits: deposits.reverse(),
      conversions: conversions.reverse()
    };
  } catch (error: any) {
    console.error("Cash Flow Fetch Error:", error);
    return {
      totalDepositedMYR: 0,
      totalConvertedMYR: 0,
      totalConvertedUSD: 0,
      avgRate: 0,
      deposits: [],
      conversions: []
    };
  }
}

export async function getMoneyManagerData(): Promise<MoneyManagerData> {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  const defaultData: MoneyManagerData = { 
       accounts: [], 
       transactions: [], 
       totalBalance: 0,
       monthlyStats: { income: 0, expense: 0, incomeGrowth: 0, expenseGrowth: 0 },
       categorySpending: [],
       graphData: [],
       upcomingBills: [],
       categories: [...DEFAULT_EXPENSE_CATS, ...DEFAULT_INCOME_CATS],
       incomeCategories: DEFAULT_INCOME_CATS,
       expenseCategories: DEFAULT_EXPENSE_CATS
    };

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
     return defaultData;
  }

  try {
    const { googleSheets } = await getSheetClient();
    
    // Fetch all required data in parallel
    const [accResponse, txResponse, catResponse] = await Promise.all([
        googleSheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MM_ACCOUNTS_SHEET}!A:E`, 
        }),
        googleSheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MM_TRANSACTIONS_SHEET}!A:G`, 
        }),
        googleSheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MM_CATEGORIES_SHEET}!A:B`, 
        })
    ]);

    // --- Process Categories ---
    const catRows = catResponse.data.values || [];
    const fetchedIncomeCats: string[] = [];
    const fetchedExpenseCats: string[] = [];

    // Skip header
    for(let i = 1; i < catRows.length; i++) {
        const row = catRows[i];
        if (row[0] && row[1]) {
            if (row[1] === 'Income') fetchedIncomeCats.push(row[0]);
            else if (row[1] === 'Expense') fetchedExpenseCats.push(row[0]);
        }
    }
    
    const incomeCats = fetchedIncomeCats.length > 0 ? fetchedIncomeCats : DEFAULT_INCOME_CATS;
    const expenseCats = fetchedExpenseCats.length > 0 ? fetchedExpenseCats : DEFAULT_EXPENSE_CATS;
    const allCategories = [...expenseCats, ...incomeCats];

    // --- Process Accounts ---
    const accRows = accResponse.data.values || [];
    const accounts: MoneyAccount[] = [];

    for (let i = 1; i < accRows.length; i++) {
      const row = accRows[i];
      if (row[0]) {
        const initialBal = parseMoney(row[3]);
        const currentBalFromSheet = parseMoney(row[4]);

        accounts.push({
          name: row[0],
          category: row[1] || 'General',
          logoUrl: row[2] || '',
          initialBalance: initialBal,
          currentBalance: currentBalFromSheet, 
        });
      }
    }

    // --- Process Transactions ---
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
         const rawDate = row[0];
         const dateObj = parseDate(rawDate);
         const amount = parseMoney(row[3]);
         const type = row[1];
         const category = row[2] || 'Uncategorized';
         const fromAcc = row[4];
         const toAcc = row[5];
         const formattedDate = formatDateDisplay(dateObj);

         if (category && category !== 'Uncategorized') {
             uniqueCategories.add(category);
         }

         transactions.push({
            id: `mtx-${i}`,
            rowIndex: i + 1, // Store 1-based index for edits
            date: formattedDate,
            type: type as any,
            category,
            amount,
            fromAccount: fromAcc,
            toAccount: toAcc,
            note: row[6]
         });

         if (type === 'Income' || type === 'Expense') {
            const txMonthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
            
            if (txMonthKey === currentMonthKey) {
                if (type === 'Income') {
                    currentMonthIncome += amount;
                    // For Net Spending Logic: Subtract income from category
                    categoryTotals[category] = (categoryTotals[category] || 0) - amount;
                }
                else {
                    currentMonthExpense += amount;
                    // Add expense to category
                    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
                }
            } 
            else if (txMonthKey === lastMonthKey) {
                if (type === 'Income') lastMonthIncome += amount;
                else lastMonthExpense += amount;
            }

            const graphKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            if (!graphMap[graphKey]) {
                graphMap[graphKey] = { income: 0, expense: 0, sortKey: dateObj.getTime() };
            }
            if (type === 'Income') graphMap[graphKey].income += amount;
            else graphMap[graphKey].expense += amount;
         }

         if (dateObj > today && type === 'Expense') {
             upcomingBills.push({
                 id: `bill-${i}`,
                 name: row[6] || category, 
                 date: formattedDate,
                 amount: amount,
                 isPaid: false
             });
         }
       }
    }

    accounts.sort((a, b) => b.currentBalance - a.currentBalance);
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    upcomingBills.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const graphData: GraphDataPoint[] = Object.entries(graphMap)
        .sort(([, a], [, b]) => a.sortKey - b.sortKey)
        .slice(-7)
        .map(([key, val]) => {
            const [year, month] = key.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return {
                name: date.toLocaleString('default', { month: 'short' }),
                income: val.income,
                expense: val.expense
            };
        });

    const calcGrowth = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    };

    const monthlyStats: MonthlyStats = {
        income: currentMonthIncome,
        expense: currentMonthExpense,
        incomeGrowth: calcGrowth(currentMonthIncome, lastMonthIncome),
        expenseGrowth: calcGrowth(currentMonthExpense, lastMonthExpense)
    };

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    const categorySpending: CategorySpending[] = Object.keys(categoryTotals)
        .filter(cat => categoryTotals[cat] > 0) // Only show categories with Positive Net Expense
        .map(cat => {
            const spent = categoryTotals[cat];
            const limit = Math.max(spent * 1.2, 500); 
            return {
                category: cat,
                spent,
                limit,
                percentage: (spent / limit) * 100
            };
        })
        .sort((a, b) => b.spent - a.spent);

    const sortedCategories = Array.from(uniqueCategories).sort();

    return { 
        accounts, 
        transactions, 
        totalBalance,
        monthlyStats,
        categorySpending,
        graphData,
        upcomingBills,
        categories: sortedCategories.length > 0 ? sortedCategories : expenseCats, // Prefer tx derived cats or default
        incomeCategories: incomeCats,
        expenseCategories: expenseCats
    };

  } catch (error: any) {
    console.error("Money Manager Fetch Error:", error);
    return defaultData;
  }
}

// ... existing Transaction functions ...

export async function addMoneyTransaction(data: MoneyTransaction) {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  try {
    const { googleSheets } = await getSheetClient();
    
    const values = [
      [
        data.date,
        data.type,
        data.category,
        data.amount,
        data.fromAccount || '',
        data.toAccount || '',
        data.note || ''
      ]
    ];

    await googleSheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_TRANSACTIONS_SHEET}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to add money transaction:", error);
    return { success: false, error: 'Failed to write to Google Sheets' };
  }
}

export async function updateMoneyTransaction(rowIndex: number, data: MoneyTransaction) {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  try {
    const { googleSheets } = await getSheetClient();
    
    const values = [
      [
        data.date,
        data.type,
        data.category,
        data.amount,
        data.fromAccount || '',
        data.toAccount || '',
        data.note || ''
      ]
    ];

    await googleSheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_TRANSACTIONS_SHEET}!A${rowIndex}:G${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update money transaction:", error);
    return { success: false, error: 'Failed to update Google Sheets' };
  }
}

export async function deleteMoneyTransaction(rowIndex: number) {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  try {
    const { googleSheets } = await getSheetClient();
    
    await googleSheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_TRANSACTIONS_SHEET}!A${rowIndex}:G${rowIndex}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete money transaction:", error);
    return { success: false, error: 'Failed to delete from Google Sheets' };
  }
}

// --- Category Management Actions ---

export async function addCategory(category: string, type: 'Income' | 'Expense') {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  if (!category) return { success: false, error: 'Category name required' };

  try {
    const { googleSheets } = await getSheetClient();
    const values = [[category, type]];

    await googleSheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_CATEGORIES_SHEET}!A:B`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to add category:", error);
    return { success: false, error: 'Failed to write to Google Sheets' };
  }
}

export async function deleteCategory(category: string, type: 'Income' | 'Expense') {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  try {
    const { googleSheets } = await getSheetClient();
    // 1. Fetch current categories to find index
    const response = await googleSheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MM_CATEGORIES_SHEET}!A:B`, 
    });
    
    const rows = response.data.values || [];
    let rowIndex = -1;

    // Assuming row 0 is Header
    for(let i=1; i < rows.length; i++) {
        if(rows[i][0] === category && rows[i][1] === type) {
            rowIndex = i;
            break;
        }
    }

    if(rowIndex === -1) {
        return { success: false, error: 'Category not found' };
    }

    // 2. Delete the row
    // sheetId for MM_CATEGORIES_SHEET needs to be known or fetched. 
    // For simplicity, we'll try to just clear the content, but better to delete row.
    // To delete row, we need the sheetId (integer), not just sheet name.
    
    const spreadsheet = await googleSheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === MM_CATEGORIES_SHEET);
    
    if(!sheet?.properties?.sheetId) {
        return { success: false, error: 'Could not find sheet ID' };
    }

    await googleSheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheet.properties.sheetId,
                        dimension: 'ROWS',
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }]
        }
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete category:", error);
    return { success: false, error: 'Failed to update Google Sheets' };
  }
}

export async function updateCategory(oldName: string, newName: string, type: 'Income' | 'Expense') {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  try {
    const { googleSheets } = await getSheetClient();
    
    const response = await googleSheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MM_CATEGORIES_SHEET}!A:B`, 
    });
    
    const rows = response.data.values || [];
    let rowIndex = -1;

    for(let i=1; i < rows.length; i++) {
        if(rows[i][0] === oldName && rows[i][1] === type) {
            rowIndex = i + 1; // 1-based index for A1 notation
            break;
        }
    }

    if(rowIndex === -1) {
        return { success: false, error: 'Category not found' };
    }

    const values = [[newName]]; // Only update name column A

    await googleSheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MM_CATEGORIES_SHEET}!A${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update category:", error);
    return { success: false, error: 'Failed to update Google Sheets' };
  }
}

export async function addTrade(data: any) {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
     return { success: false, error: 'Setup Required: GOOGLE_SERVICE_ACCOUNT_KEY missing.' };
  }

  try {
    const { googleSheets } = await getSheetClient();
    
    const amount = (data.quantity * data.price);

    const values = [
      [
        data.date,
        data.ticker,
        data.action,
        data.quantity,
        data.price,
        data.fees,
        amount
      ]
    ];

    await googleSheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to add trade:", error);
    return { success: false, error: 'Failed to write to Google Sheets' };
  }
}

export async function addDeposit(data: { date: string, amount: number, reason: string }) {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
     return { success: false, error: 'Setup Required.' };
  }

  try {
    const { googleSheets } = await getSheetClient();
    const values = [[data.date, data.amount, data.reason]];

    await googleSheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CASH_FLOW_SHEET_NAME}!A:C`, // Append to cols A-C
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to add deposit:", error);
    return { success: false, error: 'Failed to write to Google Sheets' };
  }
}

export async function addConversion(data: { date: string, myr: number, usd: number, rate: number }) {
  if (typeof window !== 'undefined') {
    throw new Error("Server Actions cannot run in the browser.");
  }
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
     return { success: false, error: 'Setup Required.' };
  }

  try {
    const { googleSheets } = await getSheetClient();
    const values = [[data.date, data.myr, data.usd, data.rate]];

    await googleSheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CASH_FLOW_SHEET_NAME}!E:H`, // Append to cols E-H
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to add conversion:", error);
    return { success: false, error: 'Failed to write to Google Sheets' };
  }
}
