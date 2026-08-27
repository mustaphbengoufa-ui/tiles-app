import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  Clock,
  Search,
  Database,
  Crop,
  Sparkles
} from 'lucide-react';
import { CeramicItem, MatchResult, InferenceStats } from '../types';
import { extractVisualEmbedding, findTopMatches } from '../utils/vectorEngine';
import { TileScannerModal } from './TileScannerModal';

interface AndroidSimulatorProps {
  catalog: CeramicItem[];
  onNavigateToCatalog?: () => void;
}

export const AndroidSimulator: React.FC<AndroidSimulatorProps> = ({
  catalog,
  onNavigateToCatalog,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [stats, setStats] = useState<InferenceStats | null>(null);
  const [selectedTileDetail, setSelectedTileDetail] = useState<CeramicItem | null>(null);
  const [minMatchThreshold, setMinMatchThreshold] = useState<number>(30);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerInitialImage, setScannerInitialImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Target function to run AI model on the perspective-corrected & cropped tile image
  const runModel = async (processedDataUrl: string) => {
    setSelectedImage(processedDataUrl);
    setIsProcessing(true);
    setSelectedTileDetail(null);

    const startTime = performance.now();
    // 1. Extract visual embedding (512-D vector)
    const queryVector = await extractVisualEmbedding(processedDataUrl);
    const preprocessTime = performance.now() - startTime;

    // 2. Search against catalog (Cosine similarity search)
    const searchStartTime = performance.now();
    const topMatches = findTopMatches(queryVector, catalog, 5);
    const searchTime = performance.now() - searchStartTime;

    const filtered = topMatches.filter((m) => m.percentage >= minMatchThreshold);
    setMatches(filtered);

    setStats({
      preprocessTimeMs: Math.round(preprocessTime),
      inferenceTimeMs: Math.round(preprocessTime * 0.8),
      similaritySearchTimeMs: Math.round(searchTime * 10) / 10,
      totalTimeMs: Math.round(preprocessTime + searchTime),
      vectorDimensions: 512,
      catalogSize: catalog.length,
    });

    setIsProcessing(false);
  };

  const handleOpenLiveScanner = () => {
    setScannerInitialImage(null);
    setIsScannerOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const rawDataUrl = event.target.result as string;
          // Open scanner modal to allow edge detection & perspective correction on uploaded image
          setScannerInitialImage(rawDataUrl);
          setIsScannerOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setMatches([]);
    setStats(null);
    setSelectedTileDetail(null);
  };

  return (
    <div className="space-y-4 pb-4" dir="rtl">
      {/* 3-Line Instructions Card */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>طريقة استخدام ماسح وفاحص السيراميك:</span>
          </h2>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
          <p className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
            <span>افتح الماسح الضوئي لتحديد حواف البلاطة تلقائياً بالكاميرا.</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
            <span>يتم قص البلاطة وتعديل زواياها وميلانها لعزلها عن الخلفية تماماً.</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
            <span>يقوم الذكاء الاصطناعي بمطابقة نقشات البلاطة المستقيمة فورياً مع الكتالوج.</span>
          </p>
        </div>
      </div>

      {/* Camera / Upload Section */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>صورة البلاطة المقتطعة والمعدلة</span>
          </h3>
          {selectedImage && (
            <button
              onClick={handleReset}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>إعادة فحص</span>
            </button>
          )}
        </div>

        {/* Image Preview / Viewfinder */}
        <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-3 text-center">
          {selectedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
              <img
                src={selectedImage}
                alt="Perspective Corrected Tile"
                className="w-full h-full object-contain rounded-lg shadow-lg"
              />
              <div className="absolute top-2 right-2 bg-slate-950/85 backdrop-blur-xs px-2 py-1 rounded-md border border-emerald-500/40 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                <Crop className="w-2.5 h-2.5" />
                <span>معدلة ومستقيمة (Perspective Corrected)</span>
              </div>
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
                  <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
                  <span className="text-xs font-bold">جاري الفحص والمطابقة بالذكاء الاصطناعي...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Crop className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  افتح الماسح الضوئي لكشف الحواف
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  يكتشف حواف البلاطة ويعدل ميلانها أوتوماتيكياً
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Big Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleOpenLiveScanner}
            className="py-3 px-2 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>فتح ماسح الكاميرا</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-3 px-2 rounded-xl bg-slate-800 active:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>من ألبوم الصور</span>
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onClick={(e) => {
              (e.target as HTMLInputElement).value = '';
            }}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Sensitivity slider */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>الحد الأدنى لنسبة التطابق:</span>
            <span className="font-bold text-emerald-400">{minMatchThreshold}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={minMatchThreshold}
            onChange={(e) => setMinMatchThreshold(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Search className="w-4 h-4 text-emerald-400" />
            <span>نتائج البحث والمطابقة</span>
          </h3>
          {stats && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3" />
              <span>{stats.totalTimeMs} مللي ثانية</span>
            </span>
          )}
        </div>

        {/* Results List or Empty state */}
        {catalog.length === 0 ? (
          <div className="p-6 text-center space-y-2.5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-white">الكتالوج فارغ حالياً</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              لم يتم تسجيل أي بلاطات بعد. يمكنك إضافة بلاطاتك من تبويب <strong>الكتالوج</strong> بالأسفل.
            </p>
          </div>
        ) : !selectedImage ? (
          <div className="p-6 text-center space-y-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <p className="text-xs text-slate-400">
              صوّر أو اختر صورة لعرض النتائج هنا
            </p>
            <p className="text-[10px] text-slate-500">
              الكتالوج يحتوي على {catalog.length} صنف جاهز
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="p-5 text-center space-y-1 bg-slate-950 rounded-xl border border-slate-800">
            <p className="text-xs text-amber-400 font-bold">
              لم يتم العثور على تطابق أعلى من {minMatchThreshold}%.
            </p>
            <p className="text-[10px] text-slate-500">
              جرب خفض نسبة التطابق أو تصوير البلاطة بوضوح.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((match, idx) => {
              const tile = match.tile;
              const isTop = idx === 0;
              return (
                <div
                  key={tile.id}
                  onClick={() => setSelectedTileDetail(tile)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.98] ${
                    isTop
                      ? 'bg-slate-950 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center">
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

                    {/* Tile Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {tile.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                          {tile.id}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                        {tile.imageResOrPath}
                      </p>
                    </div>
                  </div>

                  {/* Percentage */}
                  <div className="text-left shrink-0">
                    <div className="text-sm font-extrabold text-emerald-400">
                      {match.percentage}%
                    </div>
                    <span className="text-[9px] text-slate-500 block">
                      {isTop ? 'أعلى تطابق' : `#${match.rank}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Tile Mobile Modal / Sheet */}
      {selectedTileDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>تفاصيل الصنف</span>
              </h4>
              <button
                onClick={() => setSelectedTileDetail(null)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">كود الصنف (ID):</span>
                <span className="font-bold text-emerald-400">{selectedTileDetail.id}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">اسم البلاطة:</span>
                <span className="font-semibold text-slate-200 truncate block">{selectedTileDetail.name}</span>
              </div>
            </div>

            <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 block">مسار ملف الصورة:</span>
              <p className="text-slate-300 font-mono text-[11px] truncate">
                {selectedTileDetail.imageResOrPath}
              </p>
            </div>

            <button
              onClick={() => setSelectedTileDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 active:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Edge Detection & Perspective Correction Modal Scanner */}
      <TileScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onTileProcessed={(straightenedImage) => {
          // Immediately pass to our visual AI model pipeline!
          runModel(straightenedImage);
        }}
        initialImageData={scannerInitialImage}
      />
    </div>
  );
};

