

export enum TradeAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface Transaction {
  id: string;
  date: string;
  ticker: string;
  action: TradeAction;
  quantity: number;
  price: number;
  fees: number;
  assetClass: string;
  sector: string;
}

export interface Holding {
  ticker: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  allocation: number; // Percentage of total portfolio
  sector: string;
  assetClass: string;
}

export interface PortfolioSummary {
  netWorth: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  cashBalance: number; // This is "Net Spend" if not linked to deposits
  holdings: Holding[];
}

export interface PieChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface Deposit {
  date: string;
  amountMYR: number;
  reason?: string;
}

export interface Conversion {
  date: string;
  amountMYR: number;
  amountUSD: number;
  rate: number;
}

export interface CashFlowSummary {
  totalDepositedMYR: number;
  totalConvertedMYR: number;
  totalConvertedUSD: number;
  avgRate: number;
  deposits: Deposit[];
  conversions: Conversion[];
}

// --- Money Manager Types ---

export type MoneyTransactionType = 'Income' | 'Expense' | 'Transfer';

export interface MoneyAccount {
  name: string;
  category: string;
  logoUrl: string;
  initialBalance: number;
  currentBalance: number;
}

export interface MoneyTransaction {
  id: string;
  rowIndex?: number; // Added for Edit/Delete operations
  date: string;
  type: MoneyTransactionType;
  category: string;
  amount: number;
  fromAccount?: string;
  toAccount?: string;
  note?: string;
}

export interface CategorySpending {
  category: string;
  spent: number;
  limit: number; // Mock limit for UI
  percentage: number;
}

export interface MonthlyStats {
  income: number;
  expense: number;
  incomeGrowth: number; 
  expenseGrowth: number; 
}

export interface GraphDataPoint {
  name: string;
  income: number;
  expense: number;
}

export interface Bill {
  id: string;
  name: string;
  date: string;
  amount: number;
  isPaid: boolean;
}

export interface MoneyManagerData {
  accounts: MoneyAccount[];
  transactions: MoneyTransaction[];
  totalBalance: number;
  monthlyStats: MonthlyStats;
  categorySpending: CategorySpending[];
  graphData: GraphDataPoint[];
  upcomingBills: Bill[];
  categories: string[]; // Legacy/Derived combined
  incomeCategories?: string[];
  expenseCategories?: string[];
}