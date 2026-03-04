export type AppModule = 'manager' | 'investment';
export type InvestmentTab = 'dashboard' | 'funding';

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
