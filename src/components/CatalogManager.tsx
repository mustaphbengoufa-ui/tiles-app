import React, { useState } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Search,
  Eye,
  Upload,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { CeramicItem } from '../types';
import { generateSyntheticEmbedding, extractVisualEmbedding } from '../utils/vectorEngine';

interface CatalogManagerProps {
  catalog: CeramicItem[];
  onAddTile: (tile: CeramicItem) => void;
  onDeleteTile: (id: string) => void;
  onResetCatalog?: () => void;
  onClearCatalog?: () => void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({
  catalog,
  onAddTile,
  onDeleteTile,
  onResetCatalog,
  onClearCatalog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingTile, setInspectingTile] = useState<CeramicItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Add tile form states: ONLY id, name, image path, image file
  const [newId, setNewId] = useState(`CRM-${catalog.length + 1 < 10 ? '0' : ''}${catalog.length + 1}`);
  const [newName, setNewName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imagePathInput, setImagePathInput] = useState(`tiles/CRM-${catalog.length + 1 < 10 ? '0' : ''}${catalog.length + 1}.jpg`);

  const filteredTiles = catalog.filter((tile) => {
    return (
      tile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tile.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tile.imageResOrPath.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTile = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalImagePath = imagePathInput || `tiles/${newId}.jpg`;
    
    // Auto generate vector from image or synthesized from name/id
    const vector = newImageUrl.startsWith('data:')
      ? await extractVisualEmbedding(newImageUrl)
      : generateSyntheticEmbedding(`${newName} ${newId}`);

    const item: CeramicItem = {
      id: newId,
      name: newName,
      imageResOrPath: finalImagePath,
      embedding: vector,
    };

    onAddTile(item);
    setShowAddModal(false);

    // Reset form
    const nextIdx = catalog.length + 2;
    const nextId = `CRM-${nextIdx < 10 ? '0' : ''}${nextIdx}`;
    setNewId(nextId);
    setImagePathInput(`tiles/${nextId}.jpg`);
    setNewName('');
    setNewImageUrl('');
  };

  return (
    <div className="space-y-4 pb-4" dir="rtl">
      {/* Mobile Header Card */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between gap-2 shadow-md">
        <div>
          <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>كتالوج سيرام ديكور (Ceram Decor)</span>
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-bold">
              {catalog.length}
            </span>
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            إدارة وتصفح الأصناف المسجلة
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {catalog.length > 0 && onClearCatalog && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 cursor-pointer active:scale-95 transition-colors"
              title="إفراغ الكتالوج بالكامل"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onResetCatalog && (
            <button
              onClick={onResetCatalog}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 cursor-pointer active:scale-95"
              title="استرجاع كتالوج سيرام ديكور الأصلي (31 صنف)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة صنف</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Catalog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xs w-full text-center space-y-3.5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">إفراغ الكتالوج؟</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف جميع الأصناف المسجلة ({catalog.length} بلاطة)؟
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onClearCatalog?.();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 active:bg-rose-700 text-xs font-bold text-white shadow-md shadow-rose-950 cursor-pointer"
              >
                نعم، إفراغ الكتالوج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="بحث بالاسم أو الكود (CRM-01)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-9 pl-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-sans"
        />
      </div>

      {/* Catalog List */}
      {catalog.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center space-y-4 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">الكتالوج فارغ حالياً (0 أصناف)</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
              يمكنك إضافة بلاطاتك وصورك الخاصة أو استعادة كتالوج سيرام ديكور الجاهز في أي وقت.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صنف جديد</span>
            </button>
            {onResetCatalog && (
              <button
                onClick={onResetCatalog}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استيراد كتالوج سيرام ديكور (31 صنف)</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredTiles.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-center space-y-1.5">
          <p className="text-xs text-slate-300 font-semibold">لم نجد أي نتيجة لبحثك "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-emerald-400 hover:underline cursor-pointer"
          >
            إعادة عرض الكل
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTiles.map((tile) => (
            <div
              key={tile.id}
              className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-2.5 shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center">
                  {tile.imageResOrPath && (tile.imageResOrPath.startsWith('data:') || tile.imageResOrPath.startsWith('http')) ? (
                    <img
                      src={tile.imageResOrPath}
                      alt={tile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400">
                      {tile.id}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {tile.name}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800 shrink-0">
                      {tile.id}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                    {tile.imageResOrPath}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setInspectingTile(tile)}
                  className="p-1.5 text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="عرض التفاصيل"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteTile(tile.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Detail Sheet */}
      {inspectingTile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white">
                تفاصيل البلاطة ({inspectingTile.id})
              </h3>
              <button
                onClick={() => setInspectingTile(null)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">اسم البلاطة (Name):</span>
                <span className="text-slate-200 font-bold mt-0.5 block">{inspectingTile.name}</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">كود الصنف (ID):</span>
                <span className="text-emerald-400 font-bold mt-0.5 block">{inspectingTile.id}</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">مسار ملف الصورة (Image Path):</span>
                <span className="text-slate-300 font-mono text-[11px] mt-0.5 block">{inspectingTile.imageResOrPath}</span>
              </div>
            </div>

            <button
              onClick={() => setInspectingTile(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 active:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Add New Tile Modal / Sheet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>إضافة صنف جديد</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTile} className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-300 text-[11px] font-bold block mb-1">كود الصنف (ID)</label>
                <input
                  type="text"
                  required
                  value={newId}
                  onChange={(e) => {
                    setNewId(e.target.value);
                    setImagePathInput(`tiles/${e.target.value}.jpg`);
                  }}
                  placeholder="CRM-01"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-300 text-[11px] font-bold block mb-1">اسم البلاطة (Name)</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="سيراميك كلكتا رويال"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-300 text-[11px] font-bold block mb-1">مسار ملف الصورة</label>
                <input
                  type="text"
                  required
                  value={imagePathInput}
                  onChange={(e) => setImagePathInput(e.target.value)}
                  placeholder="tiles/CRM-01.jpg"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-300 text-[11px] font-bold block mb-1">
                  صورة البلاطة (اختياري)
                </label>
                <label className="flex items-center justify-center p-2.5 border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl bg-slate-950/60 cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] text-slate-300">اختر صورة من هاتفك</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {newImageUrl && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <img
                      src={newImageUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                    />
                    <span className="text-[10px] text-emerald-400 font-semibold">تم تجهيز الصورة</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
