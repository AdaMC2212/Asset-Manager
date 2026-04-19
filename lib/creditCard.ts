import { MoneyAccount, MoneyTransaction } from '../types';

export const DEFAULT_CREDIT_CARD_BILLING_DAY = 15;

const clampBillingDay = (value?: number) => {
  const safe = Math.trunc(Number(value) || DEFAULT_CREDIT_CARD_BILLING_DAY);
  return Math.min(31, Math.max(1, safe));
};

const buildDate = (year: number, monthIndex: number, day: number) => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay), 12, 0, 0, 0);
};

export const getBillingDayOfMonth = (account?: Pick<MoneyAccount, 'billingDayOfMonth'> | null) =>
  clampBillingDay(account?.billingDayOfMonth);

export const getActiveBillingCycle = (billingDayInput?: number, referenceDate: Date = new Date()) => {
  const billingDay = clampBillingDay(billingDayInput);
  const reference = new Date(referenceDate);
  reference.setHours(12, 0, 0, 0);

  const currentMonthStart = buildDate(reference.getFullYear(), reference.getMonth(), billingDay);
  const cycleStart =
    reference.getTime() >= currentMonthStart.getTime()
      ? currentMonthStart
      : buildDate(reference.getFullYear(), reference.getMonth() - 1, billingDay);
  const nextCycleStart = buildDate(cycleStart.getFullYear(), cycleStart.getMonth() + 1, billingDay);
  const cycleEnd = new Date(nextCycleStart);
  cycleEnd.setDate(cycleEnd.getDate() - 1);
  cycleEnd.setHours(12, 0, 0, 0);

  return {
    billingDay,
    startDate: cycleStart,
    endDate: cycleEnd,
    start: cycleStart.toISOString().split('T')[0],
    end: cycleEnd.toISOString().split('T')[0],
    label: `${cycleStart.toLocaleString('default', { day: 'numeric', month: 'short' })} - ${cycleEnd.toLocaleString('default', { day: 'numeric', month: 'short' })}`,
  };
};

export const isTransactionInActiveStatement = (
  transaction: Pick<MoneyTransaction, 'date'>,
  account?: Pick<MoneyAccount, 'billingDayOfMonth'> | null,
  referenceDate?: Date
) => {
  const cycle = getActiveBillingCycle(account?.billingDayOfMonth, referenceDate);
  const txDate = new Date(`${transaction.date}T12:00:00`);
  return txDate.getTime() >= cycle.startDate.getTime() && txDate.getTime() < cycle.endDate.getTime() + 86400000;
};
