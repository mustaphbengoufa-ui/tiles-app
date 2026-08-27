import React from 'react';
import {
  BookOpen,
  Camera,
  Sparkles,
  Database
} from 'lucide-react';

export const UserGuide: React.FC = () => {
  return (
    <div className="space-y-4 pb-4 select-none" dir="rtl">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-1.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
            دليل الاستخدام
          </span>
        </div>
        <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 pt-1">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>كيفية فحص السيراميك والتعرف عليه</span>
        </h2>
      </div>

      {/* Step 1 */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs flex items-center justify-center">
            1
          </div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>تصوير البلاطة</span>
          </h3>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed pr-8">
          افتح شاشة <strong>فحص وبحث</strong>، ثم صوّر أي بلاطة في المعرض أو اختر صورتها من ألبوم الصور في هاتفك.
        </p>
      </div>

      {/* Step 2 (KEPT EXACTLY AS REQUESTED) */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs flex items-center justify-center">
            2
          </div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>مطابقة فورية بدون إنترنت</span>
          </h3>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed pr-8">
          يقوم التطبيق فوراً بمقارنة مظهر ونقوش البلاطة مع الأصناف المحفوظة، ويعرض لك أعلى الأصناف المطابقة ونسبة التطابق لكل صنف.
        </p>
      </div>

      {/* Step 3 */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs flex items-center justify-center">
            3
          </div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>إضافة وتعديل الكتالوج</span>
          </h3>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed pr-8">
          من تبويب <strong>الكتالوج</strong> بالأسفل، يمكنك إضافة أصنافك الخاصة مع كود ومسار صورة كل بلاطة بكل سهولة.
        </p>
      </div>
    </div>
  );
};
