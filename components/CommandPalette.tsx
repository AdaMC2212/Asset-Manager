'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, X, ArrowRight, LineChart, Wallet, Plus } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (module: 'manager' | 'investment') => void;
  onAddTrade: () => void;
  searchItems: { name: string; type: string; module: string }[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  onSelectModule, 
  onAddTrade,
  searchItems 
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = query === '' 
    ? [] 
    : searchItems.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/5">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search assets, modules, or commands..."
            className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-slate-500 text-lg"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
                if (e.key === 'Escape') onClose();
            }}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-white/5 text-[10px] text-slate-400 font-bold">
            ESC
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {query === '' ? (
            <div className="p-2 space-y-1">
              <h3 className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Actions</h3>
              <button 
                onClick={() => { onSelectModule('manager'); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-white">Go to Money Manager</div>
                  <div className="text-xs text-slate-500">Manage wallets and daily expenses</div>
                </div>
              </button>
              <button 
                onClick={() => { onSelectModule('investment'); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <LineChart className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-white">Go to Investments</div>
                  <div className="text-xs text-slate-500">Portfolio analysis and holdings</div>
                </div>
              </button>
              <button 
                onClick={() => { onAddTrade(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-white">Add New Trade</div>
                  <div className="text-xs text-slate-500">Record a new buy/sell order</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredItems.map((item, idx) => (
                <button 
                    key={idx}
                    onClick={() => {
                        onSelectModule(item.module as any);
                        onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                    <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-white transition-all">
                        {item.type === 'Asset' ? <LineChart className="w-4 h-4" /> : <Command className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">{item.type} in {item.module}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                    No results for "{query}"
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-950/50 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">↑↓</span> to navigate
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">↵</span> to select
                </div>
            </div>
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                NovaTrack Search
            </div>
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
};
