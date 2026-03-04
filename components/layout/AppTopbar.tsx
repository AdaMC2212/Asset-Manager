'use client';

import React from 'react';
import { Eye, EyeOff, Menu, Plus, RefreshCw, Search } from 'lucide-react';

interface AppTopbarProps {
  title: string;
  subtitle: string;
  breadcrumbs: string[];
  hideValues: boolean;
  loading: boolean;
  primaryActionLabel: string;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onRefresh: () => void;
  onTogglePrivacy: () => void;
  onPrimaryAction: () => void;
}

export const AppTopbar: React.FC<AppTopbarProps> = ({
  title,
  subtitle,
  breadcrumbs,
  hideValues,
  loading,
  primaryActionLabel,
  onToggleSidebar,
  onOpenSearch,
  onRefresh,
  onTogglePrivacy,
  onPrimaryAction,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--bg-base)]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb}>
                {index > 0 && <span>/</span>}
                <span>{crumb}</span>
              </React.Fragment>
            ))}
          </div>
          <h1 className="truncate text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">{title}</h1>
          <p className="text-xs text-[var(--text-secondary)] sm:text-sm">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="focus-ring inline-flex rounded-xl border border-[var(--border-soft)] bg-white/[0.03] p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            className="focus-ring inline-flex rounded-xl border border-[var(--border-soft)] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] sm:text-sm"
          >
            <Search className="mr-2 h-4 w-4" />
            Search
            <span className="ml-2 hidden rounded-md border border-[var(--border-soft)] bg-black/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)] lg:inline-flex">
              Ctrl/Cmd+K
            </span>
          </button>
          <button
            type="button"
            onClick={onTogglePrivacy}
            className="focus-ring inline-flex rounded-xl border border-[var(--border-soft)] bg-white/[0.03] p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label={hideValues ? 'Show values' : 'Hide values'}
          >
            {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="focus-ring inline-flex rounded-xl border border-[var(--border-soft)] bg-white/[0.03] p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onPrimaryAction}
            className="focus-ring hidden items-center rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--accent-secondary)] sm:inline-flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            {primaryActionLabel}
          </button>
        </div>
      </div>
      <div className="px-4 pb-4 sm:hidden">
        <button
          type="button"
          onClick={onPrimaryAction}
          className="focus-ring inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--accent-secondary)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          {primaryActionLabel}
        </button>
      </div>
    </header>
  );
};
