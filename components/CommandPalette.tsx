'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Command, LineChart, Plus, RefreshCw, Search, Wallet } from 'lucide-react';
import { AppModule, CommandSearchItem, InvestmentTab, QuickActionType } from '../types/ui';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (module: AppModule) => void;
  onSelectInvestmentTab?: (tab: InvestmentTab) => void;
  onRunAction?: (action?: QuickActionType) => void;
  searchItems: CommandSearchItem[];
}

type PaletteRow = CommandSearchItem & { groupLabel: string };

const GROUP_ORDER = ['Actions', 'Modules', 'Assets'] as const;

const getGroupLabel = (item: CommandSearchItem): string => {
  if (item.type === 'action') return 'Actions';
  if (item.type === 'module') return 'Modules';
  return 'Assets';
};

const getIcon = (item: CommandSearchItem) => {
  if (item.type === 'action') {
    if (item.action === 'refresh') return <RefreshCw className="h-4 w-4" />;
    return <Plus className="h-4 w-4" />;
  }
  if (item.module === 'manager') return <Wallet className="h-4 w-4" />;
  return <LineChart className="h-4 w-4" />;
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectModule,
  onSelectInvestmentTab,
  onRunAction,
  searchItems,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const filtered = useMemo<PaletteRow[]>(() => {
    const q = query.trim().toLowerCase();
    const rows = searchItems
      .filter((item) => {
        if (!q) return true;
        if (item.name.toLowerCase().includes(q)) return true;
        return (item.keywords || []).some((keyword) => keyword.toLowerCase().includes(q));
      })
      .slice(0, 20)
      .map((item) => ({ ...item, groupLabel: getGroupLabel(item) }));

    return rows.sort((a, b) => GROUP_ORDER.indexOf(a.groupLabel as (typeof GROUP_ORDER)[number]) - GROUP_ORDER.indexOf(b.groupLabel as (typeof GROUP_ORDER)[number]));
  }, [query, searchItems]);

  useEffect(() => {
    if (!filtered.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((index) => Math.min(index, filtered.length - 1));
  }, [filtered]);

  const executeItem = (item: CommandSearchItem) => {
    if (item.module) {
      onSelectModule(item.module);
      if (item.id === 'module-funding') {
        onSelectInvestmentTab?.('funding');
      }
      if (item.id === 'module-investment') {
        onSelectInvestmentTab?.('dashboard');
      }
    }
    if (item.action) {
      onRunAction?.(item.action);
    }
    onClose();
  };

  const groupedRows = useMemo(() => {
    const groups = new Map<string, PaletteRow[]>();
    for (const row of filtered) {
      if (!groups.has(row.groupLabel)) {
        groups.set(row.groupLabel, []);
      }
      groups.get(row.groupLabel)?.push(row);
    }
    return groups;
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm">
      <div className="panel-elevated motion-zoom-in w-full max-w-2xl overflow-hidden rounded-3xl">
        <div className="flex items-center border-b border-[var(--border-soft)] px-4 py-3">
          <Search className="mr-3 h-5 w-5 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search modules, assets, and actions..."
            className="w-full bg-transparent text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (!filtered.length) return;
                setActiveIndex((index) => (index + 1) % filtered.length);
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (!filtered.length) return;
                setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length);
                return;
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                if (!filtered[activeIndex]) return;
                executeItem(filtered[activeIndex]);
              }
            }}
          />
          <span className="rounded-md border border-[var(--border-soft)] bg-black/20 px-2 py-1 text-[10px] font-bold text-[var(--text-muted)]">
            ESC
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--text-muted)]">No command found for "{query}".</div>
          ) : (
            Array.from(groupedRows.entries()).map(([groupLabel, items]) => (
              <div key={groupLabel} className="mb-2">
                <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{groupLabel}</p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const itemIndex = filtered.findIndex((row) => row.id === item.id);
                    const isActive = activeIndex === itemIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => executeItem(item)}
                        className={`focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                          isActive ? 'bg-white/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="rounded-lg border border-[var(--border-soft)] bg-black/20 p-2 text-[var(--text-secondary)]">{getIcon(item)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
                          <p className="truncate text-xs text-[var(--text-muted)]">
                            {item.type.toUpperCase()}
                            {item.module ? ` in ${item.module}` : ''}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-soft)] bg-black/20 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span>Up/Down to navigate</span>
            <span>Enter to select</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Command className="h-3 w-3" />
            Command Palette
          </div>
        </div>
      </div>
      <button type="button" className="absolute inset-0 -z-10 cursor-default" onClick={onClose} aria-label="Close command palette" />
    </div>
  );
};
