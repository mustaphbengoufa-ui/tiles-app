import React from 'react';
import { Scan, Database, BookOpen } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  catalogCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  catalogCount,
}) => {
  const tabs = [
    {
      id: 'simulator' as ActiveTab,
      label: 'فحص وبحث',
      icon: Scan,
    },
    {
      id: 'catalog' as ActiveTab,
      label: 'الكتالوج',
      icon: Database,
      badge: catalogCount,
    },
    {
      id: 'userguide' as ActiveTab,
      label: 'الدليل',
      icon: BookOpen,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5" dir="rtl">
      <div className="max-w-md mx-auto grid grid-cols-3 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative cursor-pointer ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-emerald-500/15' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400 stroke-[2.3]' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] mt-0.5 whitespace-nowrap">
                {tab.label}
              </span>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute top-1 right-1/4 -translate-y-1 translate-x-2 bg-emerald-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shadow-xs">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
