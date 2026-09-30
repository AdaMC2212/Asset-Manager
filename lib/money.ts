import { MoneyAccount, MoneyTransaction } from '../types';

export const isRecognizedExpense = (tx: MoneyTransaction) =>
  tx.type === 'Expense' && (!tx.isCardCharge || tx.settlementStatus === 'Settled');

export const getRecognitionDate = (tx: MoneyTransaction) =>
  tx.isCardCharge && tx.settlementStatus === 'Settled' && tx.settledAt ? tx.settledAt : tx.date;

export const isSettlementLocked = (tx: MoneyTransaction) =>
  Boolean(tx.settlementId) ||
  (tx.isCardCharge && tx.settlementStatus === 'Settled') ||
  (tx.type === 'Transfer' && tx.category === 'Credit Card Settlement');

export const getExpenseAccounts = (accounts: MoneyAccount[], originalAccount?: string) =>
  accounts.filter((account) => {
    const category = account.category.trim().toLowerCase();
    return account.name === originalAccount ||
      category.includes('bank') || category.includes('wallet') || category.includes('cash') ||
      category === 'debit card' || category === 'credit card';
  });
