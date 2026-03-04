'use client';

import React, { useState } from 'react';
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
  headerSlot,
  children,
  onSelectModule,
  onSelectInvTab,
  onOpenSearch,
  onRefresh,
  onTogglePrivacy,
  onPrimaryAction,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="ambient-bg relative min-h-screen text-[var(--text-primary)]">
      <div className="relative z-10 flex min-h-screen">
        <AppSidebar
          activeModule={activeModule}
          activeInvTab={activeInvTab}
          onSelectModule={onSelectModule}
          onSelectInvTab={onSelectInvTab}
          isDemo={isDemo}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar
            title={viewState.title}
            subtitle={viewState.subtitle}
            breadcrumbs={viewState.breadcrumbs}
            hideValues={hideValues}
            loading={loading}
            primaryActionLabel={primaryActionLabel}
            onToggleSidebar={() => setMobileOpen(true)}
            onOpenSearch={onOpenSearch}
            onRefresh={onRefresh}
            onTogglePrivacy={onTogglePrivacy}
            onPrimaryAction={onPrimaryAction}
          />
          <AppContent headerSlot={headerSlot}>{children}</AppContent>
        </div>
      </div>
    </div>
  );
};
