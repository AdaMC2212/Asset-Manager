import { portfolio, cashFlow, money } from './ui-data';

export const checkDatabaseStatus = async () => ({ configured: true, initialized: true, isDemo: false });
export const getPortfolioData = async () => portfolio;
export const getCashFlowData = async () => cashFlow;
export const getMoneyManagerData = async () => money;
const rejectWrite = async () => { throw new Error('Financial writes are disabled in browser tests.'); };
export {
  rejectWrite as addTrade,
  rejectWrite as addDeposit,
  rejectWrite as addConversion,
  rejectWrite as addMoneyTransaction,
  rejectWrite as updateMoneyTransaction,
  rejectWrite as deleteMoneyTransaction,
  rejectWrite as settleCreditCardBill,
  rejectWrite as updateCreditCardBillingDay,
  rejectWrite as addAutoDebitRule,
  rejectWrite as updateAutoDebitRule,
  rejectWrite as toggleAutoDebitRule,
  rejectWrite as deleteAutoDebitRule,
  rejectWrite as syncAutoDebitRuleFromTransaction,
  rejectWrite as deactivateAutoDebitRuleById,
};
