import { CashFlowSummary, MoneyManagerData, PortfolioSummary } from '../../types';
import { localISODate } from '../../lib/dates';

export const portfolio: PortfolioSummary = {
  netWorth: 7500, totalCost: 2000, totalPL: 500, totalPLPercent: 25, cashBalance: 5000,
  holdings: [{
    ticker: 'AAPL', quantity: 10, avgCost: 200, currentPrice: 250,
    currentValue: 2500, totalCost: 2000, unrealizedPL: 500, unrealizedPLPercent: 25,
    allocation: 33.333, sector: 'Technology', assetClass: 'Equity',
  }],
};

export const cashFlow: CashFlowSummary = {
  totalDepositedMYR: 30000, totalConvertedMYR: 30000, totalConvertedUSD: 7000,
  avgRate: 4.28, deposits: [], conversions: [],
};

export const money: MoneyManagerData = {
  accounts: [
    { name: 'Bank', category: 'Bank', initialBalance: 1500, currentBalance: 1350, logoUrl: '' },
    { name: 'Wallet', category: 'Wallet', initialBalance: 0, currentBalance: 50, logoUrl: '' },
    { name: 'Card', category: 'Credit Card', initialBalance: 0, currentBalance: -100, logoUrl: '', billingDayOfMonth: 15 },
  ],
  transactions: [
    { id: 'transfer', rowIndex: 2, date: localISODate(), type: 'Transfer', category: 'Transfer', amount: 50, fromAccount: 'Bank', toAccount: 'Wallet', note: 'Wallet top-up' },
    { id: 'expense', rowIndex: 3, date: localISODate(), type: 'Expense', category: 'Bills', amount: 100, fromAccount: 'Bank', note: 'Utilities' },
    { id: 'charge', rowIndex: 4, date: localISODate(), type: 'Expense', category: 'Bills', amount: 100, fromAccount: 'Card', note: 'Card purchase', isCardCharge: true, settlementStatus: 'Unsettled' },
  ],
  totalBalance: 1300,
  monthlyStats: { income: 0, expense: 100, incomeGrowth: 0, expenseGrowth: 0 },
  categorySpending: [], graphData: [], upcomingBills: [], categories: ['Bills', 'Salary'],
  incomeCategories: ['Salary'], expenseCategories: ['Bills'], autoDebitRules: [],
};
