'use server';

import { getSheetClient, SPREADSHEET_ID, SHEET_NAME, CASH_FLOW_SHEET_NAME, PORTFOLIO_SHEET_NAME, MM_ACCOUNTS_SHEET, MM_TRANSACTIONS_SHEET } from '../lib/googleSheets';
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
const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Check for DD/MM/YYYY
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Check for YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
     return new Date(dateStr);
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
                    assetClass: getAssetClass(ticker)
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
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
     return { 
       accounts: [], 
       transactions: [], 
       totalBalance: 0,
       monthlyStats: { income: 0, expense: 0, incomeGrowth: 0, expenseGrowth: 0 },
       categorySpending: [],
       graphData: [],
       upcomingBills: [],
       categories: ['Food', 'Transport', 'Utilities']
     };
  }

  try {
    const { googleSheets } = await getSheetClient();
    
    // 1. Fetch Accounts
    const accResponse = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_ACCOUNTS_SHEET}!A:E`, 
    });

    const accRows = accResponse.data.values || [];
    const accounts: MoneyAccount[] = [];

    for (let i = 1; i < accRows.length; i++) {
      const row = accRows[i];
      if (row[0]) {
        accounts.push({
          name: row[0],
          category: row[1] || 'General',
          logoUrl: row[2] || '',
          initialBalance: parseMoney(row[3]),
          currentBalance: parseMoney(row[4]),
        });
      }
    }
    accounts.sort((a, b) => b.currentBalance - a.currentBalance);

    // 2. Fetch All Transactions
    const txResponse = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MM_TRANSACTIONS_SHEET}!A:G`, 
    });

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
         const formattedDate = formatDateDisplay(dateObj);

         if (category && category !== 'Uncategorized') {
             uniqueCategories.add(category);
         }

         transactions.push({
            id: `mtx-${i}`,
            date: formattedDate,
            type: type as any,
            category,
            amount,
            fromAccount: row[4],
            toAccount: row[5],
            note: row[6]
         });

         if (type === 'Income' || type === 'Expense') {
            const txMonthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
            
            if (txMonthKey === currentMonthKey) {
                if (type === 'Income') currentMonthIncome += amount;
                else {
                    currentMonthExpense += amount;
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

    const categorySpending: CategorySpending[] = Object.keys(categoryTotals).map(cat => {
        const spent = categoryTotals[cat];
        const limit = Math.max(spent * 1.2, 500); 
        return {
            category: cat,
            spent,
            limit,
            percentage: (spent / limit) * 100
        };
    }).sort((a, b) => b.spent - a.spent);

    // Convert Set to Array and Sort
    const sortedCategories = Array.from(uniqueCategories).sort();

    return { 
        accounts, 
        transactions, 
        totalBalance,
        monthlyStats,
        categorySpending,
        graphData,
        upcomingBills,
        categories: sortedCategories.length > 0 ? sortedCategories : ['Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment']
    };

  } catch (error: any) {
    console.error("Money Manager Fetch Error:", error);
    return { 
       accounts: [], 
       transactions: [], 
       totalBalance: 0,
       monthlyStats: { income: 0, expense: 0, incomeGrowth: 0, expenseGrowth: 0 },
       categorySpending: [],
       graphData: [],
       upcomingBills: [],
       categories: ['Food', 'Transport', 'Utilities']
    };
  }
}

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