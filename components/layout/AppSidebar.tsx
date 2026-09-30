'use client';

import React from 'react';
import { ArrowLeftRight, ArrowUpRight, LayoutGrid, Wallet } from 'lucide-react';
import { AppModule, InvestmentTab } from '../../types/ui';

interface AppSidebarProps {
  activeModule: AppModule;
  activeInvTab: InvestmentTab;
  onSelectModule: (module: AppModule) => void;
  onSelectInvTab: (tab: InvestmentTab) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeModule, activeInvTab, onSelectModule, onSelectInvTab,
}) => {
  const items = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, module: 'overview' as const },
    { id: 'manager', label: 'Money', icon: Wallet, module: 'manager' as const },
    { id: 'dashboard', label: 'Invest', icon: ArrowUpRight, module: 'investment' as const, tab: 'dashboard' as const },
    { id: 'funding', label: 'Funding', icon: ArrowLeftRight, module: 'investment' as const, tab: 'funding' as const },
  ];

  return (
    <nav className="workspace-navigation" aria-label="Primary navigation">
      <button type="button" className="workspace-mark focus-ring" onClick={() => onSelectModule('overview')} aria-label="AssetManager home" title="AssetManager home">A</button>
      <div className="workspace-nav-items">
        {items.map(({ id, label, icon: Icon, module, tab }) => {
          const active = activeModule === module && (!tab || activeInvTab === tab);
          return (
            <button
              key={id}
              type="button"
              className={`workspace-nav-item focus-ring${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              title={label}
              onClick={() => {
                if (tab) onSelectInvTab(tab);
                onSelectModule(module);
              }}
            >
              <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
