import React from 'react';
import { Scan } from 'lucide-react';

interface HeaderProps {
  catalogCount: number;
}

export const Header: React.FC<HeaderProps> = ({ catalogCount }) => {
  return (
    <header
      className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 select-none transition-all"
      style={{
        paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.85rem), 2.5rem)',
        paddingBottom: '0.85rem',
      }}
      dir="rtl"
    >
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* App Title with Icon */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shrink-0 shadow-md shadow-emerald-500/20">
            <Scan className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-wide truncate">
              فاحص السيراميك الذكي
            </h1>
            <p className="text-[10px] text-slate-400 truncate">
              فحص ومطابقة النقشات فورياً
            </p>
          </div>
        </div>

        {/* Catalog Counter Badge */}
        <div className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-emerald-400 shrink-0 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{catalogCount} صنف</span>
        </div>
      </div>
    </header>
  );
};
