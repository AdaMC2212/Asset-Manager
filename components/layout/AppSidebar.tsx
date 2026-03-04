'use client';

import React from 'react';
import { Beaker, Landmark, LayoutDashboard, LineChart, Wallet, X } from 'lucide-react';
import { AppModule, InvestmentTab, NavigationItem } from '../../types/ui';

interface AppSidebarProps {
  activeModule: AppModule;
  activeInvTab: InvestmentTab;
  onSelectModule: (module: AppModule) => void;
  onSelectInvTab: (tab: InvestmentTab) => void;
  isDemo?: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems: NavigationItem[] = [
  {
    id: 'manager',
    label: 'Money Manager',
    module: 'manager',
    hint: 'Accounts and transactions',
  },
  {
    id: 'investment',
    label: 'Investments',
    module: 'investment',
    hint: 'Holdings and performance',
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeModule,
  activeInvTab,
  onSelectModule,
  onSelectInvTab,
  isDemo,
  mobileOpen,
  onCloseMobile,
}) => {
  const sidebarBody = (
    <div className="flex h-full flex-col border-r border-[var(--border-soft)] bg-[var(--bg-surface)]/90 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="brand-orb flex h-10 w-10 items-center justify-center rounded-xl">
            <LineChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">AssetManager</p>
            <p className="text-xs text-[var(--text-muted)]">Control Center</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-white/5 hover:text-[var(--text-primary)] lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-5">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeModule === item.module;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectModule(item.module);
                  onCloseMobile();
                }}
                className={`group w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                  isActive
                    ? 'border-[var(--border-strong)] bg-white/10 shadow-[var(--shadow-soft)]'
                    : 'border-transparent hover:border-[var(--border-soft)] hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-xl p-2 transition ${
                      isActive
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-black/20 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.module === 'manager' ? <Wallet className="h-4 w-4" /> : <LineChart className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.hint}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeModule === 'investment' && (
        <div className="mx-4 rounded-2xl border border-[var(--border-soft)] bg-black/20 p-2">
          <button
            type="button"
            onClick={() => onSelectInvTab('dashboard')}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
              activeInvTab === 'dashboard'
                ? 'bg-white/10 text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => onSelectInvTab('funding')}
            className={`mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
              activeInvTab === 'funding'
                ? 'bg-white/10 text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            <Landmark className="h-4 w-4" />
            Cash Flow
          </button>
        </div>
      )}

      <div className="mt-auto space-y-3 p-4">
        {isDemo && (
          <div className="chip flex items-center gap-2 text-amber-300">
            <Beaker className="h-3.5 w-3.5" />
            Demo Mode
          </div>
        )}
        <div className="rounded-2xl border border-[var(--border-soft)] bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Quick Tip</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Use <span className="font-semibold text-[var(--text-primary)]">Ctrl/Cmd + K</span> to jump between modules, assets, and actions.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-[290px] shrink-0 lg:block">{sidebarBody}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="relative z-[91] h-full w-[290px] max-w-[86vw] motion-slide-in">{sidebarBody}</aside>
        </div>
      )}
    </>
  );
};
