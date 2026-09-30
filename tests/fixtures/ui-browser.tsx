import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from '../../app/page';
import DemoPage from '../../app/demo/page';
import { AppContent } from '../../components/layout/AppContent';
import { WorkspaceModeProvider } from '../../components/WorkspaceMode';
import { AutoDebitModal } from '../../components/MoneyManager/AutoDebitModal';
import { AddMoneyModal } from '../../components/MoneyManager/AddMoneyModal';
import { SettleCreditCardModal } from '../../components/MoneyManager/SettleCreditCardModal';
import { AddTradeModal } from '../../components/AddTradeModal';
import { AddFundingModal } from '../../components/FundingStats/AddFundingModal';
import { money } from './ui-data';
import { OverviewBrowser } from './overview-browser';

const kind = new URLSearchParams(location.search).get('form');
const overview = new URLSearchParams(location.search).get('overview');
const props = {
  isOpen: true, accounts: money.accounts, onClose: () => location.assign('/'),
  onSuccess: () => { throw new Error('Test forms must not submit.'); },
};
const forms: Record<string, React.ReactNode> = {
  auto: <AutoDebitModal {...props} expenseCategories={['Bills']} />,
  money: <AddMoneyModal {...props} expenseCategories={['Bills']} incomeCategories={['Salary']} />,
  settlement: <SettleCreditCardModal {...props} cardAccount={money.accounts[2]} initialScope="outstanding" outstandingAmount={100} statementAmount={50} />,
  trade: <AddTradeModal {...props} />,
  funding: <AddFundingModal {...props} />,
};

createRoot(document.getElementById('root')!).render(
  overview ? <OverviewBrowser variant={overview} /> : kind ? (
    <WorkspaceModeProvider value={false}>
      <AppContent><div style={{ height: 1800 }}>Background content</div>{forms[kind]}</AppContent>
    </WorkspaceModeProvider>
  ) : location.pathname === '/demo' ? <DemoPage /> : <Home />
);
