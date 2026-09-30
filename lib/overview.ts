import { CashFlowSummary, MoneyManagerData, PortfolioSummary } from '../types';
import { getStatementCycle } from './creditCard';
import { localISODate } from './dates';
import { getRecognitionDate, isRecognizedExpense } from './money';

export const getOverviewSummary = (
  money: MoneyManagerData | null,
  portfolio: PortfolioSummary | null,
  cashFlow: CashFlowSummary | null,
  date: Date = new Date(),
) => {
  const month = localISODate(date).slice(0, 7);
  const cashAccounts = money?.accounts.filter((account) => account.category.trim().toLowerCase() !== 'credit card') ?? [];
  const cards = money?.creditCardAccounts ??
    money?.accounts.filter((account) => account.category.trim().toLowerCase() === 'credit card') ?? [];
  const closeDates = new Map(cards.map((account) => [account.name, getStatementCycle(account.billingDayOfMonth, date).close]));
  let income = 0;
  let expense = 0;
  let outstanding = 0;
  let statement = 0;

  for (const transaction of money?.transactions ?? []) {
    if (getRecognitionDate(transaction).slice(0, 7) === month) {
      if (transaction.type === 'Income') income += transaction.amount;
      else if (isRecognizedExpense(transaction)) expense += transaction.amount;
    }
    if (transaction.type === 'Expense' && transaction.isCardCharge && transaction.settlementStatus !== 'Settled') {
      outstanding += transaction.amount;
      const close = closeDates.get(transaction.fromAccount ?? '');
      if (close && transaction.date <= close) statement += transaction.amount;
    }
  }

  // Open-holding returns exclude brokerage cash and realized gains.
  const investedCost = portfolio?.holdings.reduce((sum, holding) => sum + holding.totalCost, 0) ?? 0;
  const unrealizedPL = portfolio?.holdings.reduce((sum, holding) => sum + holding.unrealizedPL, 0) ?? 0;
  const net = income - expense;
  const splitTotal = Math.max(income, expense, 0);

  return {
    cashAccounts,
    cashBalance: cashAccounts.reduce((sum, account) => sum + account.currentBalance, 0),
    income, expense, net, outstanding, statement, unrealizedPL,
    unrealizedPercent: investedCost > 0 ? (unrealizedPL / investedCost) * 100 : 0,
    expenseShare: splitTotal > 0 ? expense / splitTotal : 0,
    remainingShare: splitTotal > 0 ? Math.max(net, 0) / splitTotal : 0,
    recentTransactions: [...(money?.transactions ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    latestConversion: [...(cashFlow?.conversions ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
  };
};
