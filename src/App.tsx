/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AndroidSimulator } from './components/AndroidSimulator';
import { CatalogManager } from './components/CatalogManager';
import { UserGuide } from './components/UserGuide';
import { INITIAL_TILES_CATALOG } from './data/mockTiles';
import { CeramicItem, ActiveTab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [catalog, setCatalog] = useState<CeramicItem[]>(() => {
    const saved = localStorage.getItem('tilelens_catalog_ceramdecor_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        return INITIAL_TILES_CATALOG;
      }
    }
    return INITIAL_TILES_CATALOG;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('tilelens_catalog_ceramdecor_v1', JSON.stringify(catalog));
  }, [catalog]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddTile = (tile: CeramicItem) => {
    setCatalog((prev) => [tile, ...prev]);
    showToast(`تمت إضافة ${tile.name} (${tile.id})`);
  };

  const handleDeleteTile = (id: string) => {
    setCatalog((prev) => prev.filter((t) => t.id !== id));
    showToast(`تم حذف ${id}`);
  };

  const handleResetCatalog = () => {
    setCatalog(INITIAL_TILES_CATALOG);
    showToast(`تم تحميل كتالوج سيرام ديكور (${INITIAL_TILES_CATALOG.length} صنف)`);
  };

  const handleClearCatalog = () => {
    setCatalog([]);
    showToast('تم إفراغ الكتالوج بالكامل');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950" dir="rtl">
      {/* Mobile Sticky Top Header */}
      <Header catalogCount={catalog.length} />

      {/* Main Mobile App Canvas (max-w-md for smartphone ergonomics) */}
      <main className="flex-1 w-full max-w-md mx-auto px-3.5 pt-3.5 pb-20">
        {activeTab === 'simulator' && (
          <AndroidSimulator
            catalog={catalog}
            onNavigateToCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogManager
            catalog={catalog}
            onAddTile={handleAddTile}
            onDeleteTile={handleDeleteTile}
            onResetCatalog={handleResetCatalog}
            onClearCatalog={handleClearCatalog}
          />
        )}

        {activeTab === 'userguide' && (
          <UserGuide />
        )}
      </main>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-slate-100 px-4 py-2 rounded-xl border border-slate-700 shadow-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn whitespace-nowrap" dir="rtl">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        catalogCount={catalog.length}
      />
    </div>
  );
}
