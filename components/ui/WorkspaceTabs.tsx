'use client';

import React from 'react';

interface WorkspaceTabsProps<T extends string> {
  id: string;
  label: string;
  value: T;
  items: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function WorkspaceTabs<T extends string>({ id, label, value, items, onChange }: WorkspaceTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="workspace-tabs">
      {items.map((item, index) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          id={`${id}-tab-${item.value}`}
          aria-controls={`${id}-panel-${item.value}`}
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            const next = event.key === 'ArrowRight' ? (index + 1) % items.length
              : event.key === 'ArrowLeft' ? (index + items.length - 1) % items.length
              : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault();
            onChange(items[next].value);
            (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
          }}
        >{item.label}</button>
      ))}
    </div>
  );
}
