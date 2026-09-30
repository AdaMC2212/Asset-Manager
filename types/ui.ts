import type { MoneyTransaction } from '../types';

export type AppModule = 'overview' | 'manager' | 'investment';
export type InvestmentTab = 'dashboard' | 'funding';

export type MoneyViewRequest =
  | { kind: 'cards' }
  | { kind: 'history' }
  | { kind: 'transaction'; transaction: MoneyTransaction };

export type QuickActionType =
  | 'open_module'
  | 'open_asset'
  | 'add_trade'
  | 'add_transaction'
  | 'refresh';

export interface CommandSearchItem {
  id: string;
  name: string;
  type: 'module' | 'asset' | 'action';
  module?: AppModule;
  keywords?: string[];
  action?: QuickActionType;
}

export interface NavigationItem {
  id: string;
  label: string;
  module: AppModule;
  hint?: string;
}

export interface TopbarAction {
  id: string;
  label: string;
  shortcut?: string;
}

export interface AppShellViewState {
  title: string;
  subtitle: string;
  breadcrumbs: string[];
}
