'use client';

import React from 'react';
import { AppContent } from './AppContent';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { AppModule, AppShellViewState, InvestmentTab } from '../../types/ui';

interface AppShellProps {
  activeModule: AppModule;
  activeInvTab: InvestmentTab;
  viewState: AppShellViewState;
  hideValues: boolean;
  loading: boolean;
  isDemo?: boolean;
  primaryActionLabel: string;
  primaryActionDisabled?: boolean;
  periodLabel: string;
  syncLabel: string;
  syncFailed?: boolean;
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
  onSelectModule: (module: AppModule) => void;
  onSelectInvTab: (tab: InvestmentTab) => void;
  onOpenSearch: () => void;
  onRefresh: () => void;
  onTogglePrivacy: () => void;
  onPrimaryAction: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeModule,
  activeInvTab,
  viewState,
  hideValues,
  loading,
  isDemo,
  primaryActionLabel,
  primaryActionDisabled,
  periodLabel,
  syncLabel,
  syncFailed,
  headerSlot,
  children,
  onSelectModule,
  onSelectInvTab,
  onOpenSearch,
  onRefresh,
  onTogglePrivacy,
  onPrimaryAction,
}) => {
  return (
    <div className="app-workspace">
        <AppSidebar
          activeModule={activeModule}
          activeInvTab={activeInvTab}
          onSelectModule={onSelectModule}
          onSelectInvTab={onSelectInvTab}
        />

        <div className="workspace-main">
          <AppTopbar
            title={viewState.title}
            hideValues={hideValues}
            loading={loading}
            primaryActionLabel={primaryActionLabel}
            primaryActionDisabled={primaryActionDisabled}
            periodLabel={periodLabel}
            syncLabel={syncLabel}
            syncFailed={syncFailed}
            overview={activeModule === 'overview'}
            onOpenSearch={onOpenSearch}
            onRefresh={onRefresh}
            onTogglePrivacy={onTogglePrivacy}
            onPrimaryAction={onPrimaryAction}
          />
          <AppContent headerSlot={headerSlot} overview={activeModule === 'overview'}>{children}</AppContent>
        </div>
    </div>
  );
};
