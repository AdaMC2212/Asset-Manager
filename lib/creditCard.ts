import { MoneyAccount, MoneyTransaction } from '../types';

export const DEFAULT_CREDIT_CARD_BILLING_DAY = 15;
export const CREDIT_CARD_GRACE_DAYS = 20;

const clampBillingDay = (value?: number) => {
  const safe = Math.trunc(Number(value) || DEFAULT_CREDIT_CARD_BILLING_DAY);
  return Math.min(31, Math.max(1, safe));
};

const buildDate = (year: number, monthIndex: number, day: number) => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay), 12, 0, 0, 0);
};

const formatISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getBillingDayOfMonth = (account?: Pick<MoneyAccount, 'billingDayOfMonth'> | null) =>
  clampBillingDay(account?.billingDayOfMonth);

// Most recent statement close on or before referenceDate, plus the period it covers
// and the still-open cycle that follows it.
export const getStatementCycle = (billingDayInput?: number, referenceDate: Date = new Date()) => {
  const billingDay = clampBillingDay(billingDayInput);
  const reference = new Date(referenceDate);
  reference.setHours(12, 0, 0, 0);

  // closeDate = latest day-D <= reference
  const currentMonthClose = buildDate(reference.getFullYear(), reference.getMonth(), billingDay);
  const closeDate =
    reference.getTime() >= currentMonthClose.getTime()
      ? currentMonthClose
      : buildDate(reference.getFullYear(), reference.getMonth() - 1, billingDay);

  // prevCloseDate = day-D one month before closeDate
  const prevCloseDate = buildDate(closeDate.getFullYear(), closeDate.getMonth() - 1, billingDay);

  // periodStart = prevCloseDate + 1 day  (statement period = (prevClose, close])
  const periodStart = new Date(prevCloseDate.getTime());
  periodStart.setDate(periodStart.getDate() + 1);
  periodStart.setHours(12, 0, 0, 0);

  // nextCloseDate = day-D one month after closeDate
  const nextCloseDate = buildDate(closeDate.getFullYear(), closeDate.getMonth() + 1, billingDay);

  // openStart = closeDate + 1 day  (unbilled window = (close, nextClose])
  const openStart = new Date(closeDate.getTime());
  openStart.setDate(openStart.getDate() + 1);
  openStart.setHours(12, 0, 0, 0);

  // dueDate = closeDate + CREDIT_CARD_GRACE_DAYS
  const dueDate = new Date(closeDate.getTime());
  dueDate.setDate(dueDate.getDate() + CREDIT_CARD_GRACE_DAYS);
  dueDate.setHours(12, 0, 0, 0);

  const fmt = (d: Date) => d.toLocaleString('default', { day: 'numeric', month: 'short' });

  return {
    billingDay,
    closeDate,
    prevCloseDate,
    periodStart,
    nextCloseDate,
    openStart,
    dueDate,
    close: formatISODate(closeDate),
    statementLabel: `${fmt(periodStart)} – ${fmt(closeDate)}`,
    openCycleLabel: `${fmt(openStart)} – ${fmt(nextCloseDate)}`,
    dueLabel: fmt(dueDate),
  };
};

// txDate <= closeDate — carry-forward-inclusive (deliberately not >= periodStart)
export const isChargeOnStatement = (
  transaction: Pick<MoneyTransaction, 'date'>,
  account?: Pick<MoneyAccount, 'billingDayOfMonth'> | null,
  referenceDate?: Date
) => {
  const cycle = getStatementCycle(account?.billingDayOfMonth, referenceDate);
  const txDate = new Date(`${transaction.date}T12:00:00`);
  return txDate.getTime() <= cycle.closeDate.getTime();
};

// txDate > closeDate
export const isChargeUnbilled = (
  transaction: Pick<MoneyTransaction, 'date'>,
  account?: Pick<MoneyAccount, 'billingDayOfMonth'> | null,
  referenceDate?: Date
) => {
  const cycle = getStatementCycle(account?.billingDayOfMonth, referenceDate);
  const txDate = new Date(`${transaction.date}T12:00:00`);
  return txDate.getTime() > cycle.closeDate.getTime();
};
