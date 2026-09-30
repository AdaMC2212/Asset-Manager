'use client';

import React from 'react';
import { Eye, EyeOff, Plus, Search } from 'lucide-react';
import { useReadOnly } from '../WorkspaceMode';

interface AppTopbarProps {
  title: string;
  hideValues: boolean;
  loading: boolean;
  primaryActionLabel: string;
  primaryActionDisabled?: boolean;
  periodLabel: string;
  syncLabel: string;
  syncFailed?: boolean;
  overview?: boolean;
  onOpenSearch: () => void;
  onRefresh: () => void;
  onTogglePrivacy: () => void;
  onPrimaryAction: () => void;
}

export const AppTopbar: React.FC<AppTopbarProps> = ({
  title, hideValues, loading, primaryActionLabel, primaryActionDisabled, periodLabel, syncLabel,
  syncFailed, overview, onOpenSearch, onRefresh, onTogglePrivacy, onPrimaryAction,
}) => {
  const readOnly = useReadOnly();
  return (
    <header className={`workspace-topbar${overview ? ' is-overview' : ''}`}>
      <span className="workspace-mobile-brand">AssetManager</span>
      <div className="workspace-heading">
        <h1><span className="workspace-desktop-brand">AssetManager / </span>{title}</h1>
        <p>
          {periodLabel}
          <span className="workspace-mobile-sync"> / <button type="button" onClick={onRefresh} disabled={loading} title="Refresh data">{syncLabel}</button></span>
        </p>
      </div>
      <div className="workspace-tools">
        <button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh data" title="Refresh data" className={`workspace-sync focus-ring${syncFailed ? ' has-error' : ''}`}>{syncLabel}</button>
        <button type="button" onClick={onTogglePrivacy} className="workspace-icon-button focus-ring" aria-label={hideValues ? 'Show values' : 'Hide values'} title={hideValues ? 'Show values' : 'Hide values'}>
          {hideValues ? <EyeOff size={20} strokeWidth={1.6} /> : <Eye size={20} strokeWidth={1.6} />}
        </button>
        <button type="button" onClick={onOpenSearch} className="workspace-icon-button focus-ring" aria-label="Search" title="Search">
          <Search size={20} strokeWidth={1.6} />
        </button>
      </div>
      <button
        type="button"
        onClick={onPrimaryAction}
        disabled={readOnly || loading || primaryActionDisabled}
        title={readOnly ? 'Demo is read-only' : primaryActionLabel}
        className="workspace-primary-action workspace-header-action focus-ring"
      >
        <Plus size={16} aria-hidden="true" />
        {primaryActionLabel}
      </button>
    </header>
  );
};
