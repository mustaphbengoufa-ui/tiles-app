import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Check,
  RotateCcw,
  Sparkles,
  X,
  FlipHorizontal,
  Eye,
  Sliders,
  Crop,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ZoomIn,
  Grid,
  Layers,
  ArrowRight
} from 'lucide-react';
import { TileQuadCorners, Point2D } from '../types';
import {
  applyPerspectiveCorrection,
  autoDetectTileCorners,
  getDefaultCorners,
} from '../utils/perspectiveTransform';
import { INITIAL_TILES_CATALOG } from '../data/mockTiles';

interface TileScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTileProcessed: (processedDataUrl: string) => void;
  initialImageData?: string | null;
}

type DragCornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft' | null;

export const TileScannerModal: React.FC<TileScannerModalProps> = ({
  isOpen,
  onClose,
  onTileProcessed,
  initialImageData,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Phase: 'live_camera' | 'adjust_perspective'
  const [phase, setPhase] = useState<'live_camera' | 'adjust_perspective'>('live_camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [corners, setCorners] = useState<TileQuadCorners>(getDefaultCorners('square'));
  const [isWarping, setIsWarping] = useState<boolean>(false);
  const [activeCorner, setActiveCorner] = useState<DragCornerKey>(null);
  const [showLoupe, setShowLoupe] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [activePreset, setActivePreset] = useState<'square' | 'wide' | 'tall' | 'custom'>('square');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize live camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('تعذر فتح الكاميرا المباشرة. يمكنك اختيار صورة من المعرض أو تجربة صور سيرام ديكور.');
    }
  }, [facingMode]);

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      return;
    }

    if (initialImageData) {
      setCapturedImage(initialImageData);
      setPhase('adjust_perspective');
      setViewMode('editor');
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const detected = autoDetectTileCorners(img);
        setCorners(detected);
        updateLivePreview(img, detected);
      };
      img.src = initialImageData;
    } else {
      setPhase('live_camera');
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, initialImageData]);

  // Update live preview when corners change (debounced)
  const updateLivePreview = useCallback(async (img: HTMLImageElement, currentCorners: TileQuadCorners) => {
    try {
      const warped = await applyPerspectiveCorrection(img, currentCorners, 320, 320);
      setLivePreviewUrl(warped);
    } catch (e) {
      // ignore preview errors
    }
  }, []);

  useEffect(() => {
    if (phase === 'adjust_perspective' && capturedImage && imageElementRef.current) {
      const timer = setTimeout(() => {
        if (imageElementRef.current) {
          updateLivePreview(imageElementRef.current, corners);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [corners, phase, capturedImage, updateLivePreview]);

  // Capture frame from camera
  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);

    setCapturedImage(dataUrl);

    // Auto detect tile edges on captured frame
    const detected = autoDetectTileCorners(video);
    setCorners(detected);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }

    setPhase('adjust_perspective');
    setViewMode('editor');
  };

  // Perform final 4-point Perspective Transform & Crop
  const handlePerformPerspectiveTransform = async () => {
    if (!capturedImage) return;
    setIsWarping(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = capturedImage;
      });

      const straightened = await applyPerspectiveCorrection(img, corners, 512, 512);
      onTileProcessed(straightened);
      onClose();
    } catch (err) {
      console.error('Perspective transform error:', err);
    } finally {
      setIsWarping(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setLivePreviewUrl(null);
    setPhase('live_camera');
    setViewMode('editor');
    startCamera();
  };

  // Magnifier Loupe Drawer
  const drawLoupe = useCallback((clientX: number, clientY: number, normX: number, normY: number) => {
    if (!loupeCanvasRef.current || !imageElementRef.current) return;
    const canvas = loupeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageElementRef.current;
    if (!ctx) return;

    const size = canvas.width; // e.g. 100
    const zoom = 2.4;
    const srcX = normX * img.naturalWidth;
    const srcY = normY * img.naturalHeight;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    
    // Draw magnified image slice
    ctx.drawImage(
      img,
      srcX - (size / (2 * zoom)),
      srcY - (size / (2 * zoom)),
      size / zoom,
      size / zoom,
      0,
      0,
      size,
      size
    );

    // Crosshair target
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Horizontal
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    // Vertical
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }, []);

  // Handle Touch/Mouse Dragging for 4 Corners
  const handlePointerDown = (cornerKey: DragCornerKey) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveCorner(cornerKey);
    setShowLoupe(true);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentPoint = corners[cornerKey as keyof TileQuadCorners];
      setLoupePos({
        x: Math.max(50, Math.min(rect.width - 50, currentPoint.x * rect.width)),
        y: Math.max(50, currentPoint.y * rect.height - 60),
      });
      drawLoupe(e.clientX, e.clientY, currentPoint.x, currentPoint.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const xNorm = Math.max(0.01, Math.min(0.99, (clientX - rect.left) / rect.width));
    const yNorm = Math.max(0.01, Math.min(0.99, (clientY - rect.top) / rect.height));

    setCorners((prev) => ({
      ...prev,
      [activeCorner]: { x: xNorm, y: yNorm },
    }));

    setLoupePos({
      x: Math.max(55, Math.min(rect.width - 55, xNorm * rect.width)),
      y: Math.max(55, yNorm * rect.height - 65),
    });

    drawLoupe(clientX, clientY, xNorm, yNorm);
  };

  const handlePointerUp = () => {
    setActiveCorner(null);
    setShowLoupe(false);
  };

  // Presets selector
  const applyPreset = (preset: 'square' | 'wide' | 'tall' | 'full') => {
    setActivePreset(preset === 'full' ? 'custom' : preset);
    setCorners(getDefaultCorners(preset));
  };

  // Smart Auto Edge Detect
  const handleAutoSnap = () => {
    if (capturedImage && imageElementRef.current) {
      const detected = autoDetectTileCorners(imageElementRef.current);
      setCorners(detected);
      setActivePreset('custom');
    } else {
      setCorners(getDefaultCorners('square'));
    }
  };

  // Sample testing loader
  const handleLoadSample = (sampleUrl: string) => {
    setCapturedImage(sampleUrl);
    setPhase('adjust_perspective');
    setViewMode('editor');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const detected = autoDetectTileCorners(img);
      setCorners(detected);
      updateLivePreview(img, detected);
    };
    img.src = sampleUrl;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-3 select-none"
      dir="rtl"
      style={{
        paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.75rem), 2.25rem)',
        paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 0.75rem), 1.5rem)',
      }}
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-md flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Crop className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{phase === 'live_camera' ? 'ماسح حواف السيراميك الذكي' : 'عزل البلاطة وتعديل الزوايا'}</span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {phase === 'live_camera'
                ? 'وجّه الكاميرا نحو قطعة السيراميك لعزلها'
                : 'اسحب الزوايا الأربع لتحديد حدود السيراميك بدقة'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Viewfinder Canvas / Area */}
      <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center my-2 relative min-h-[300px]">
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-full aspect-4/3 sm:aspect-square max-h-[58vh] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-2xl touch-none flex items-center justify-center"
        >
          {/* Phase 1: Live Camera Viewfinder */}
          {phase === 'live_camera' && (
            <>
              {cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <p className="text-xs text-amber-400 font-semibold">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {/* Edge Detection Interactive HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full absolute inset-0">
                  <polygon
                    points={`
                      ${corners.topLeft.x * 100}%,${corners.topLeft.y * 100}% 
                      ${corners.topRight.x * 100}%,${corners.topRight.y * 100}% 
                      ${corners.bottomRight.x * 100}%,${corners.bottomRight.y * 100}% 
                      ${corners.bottomLeft.x * 100}%,${corners.bottomLeft.y * 100}%
                    `}
                    fill="rgba(16, 185, 129, 0.18)"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                </svg>

                {/* Laser scan line animation */}
                <div className="absolute left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-bounce top-[30%]" />

                {/* Center Target Indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border border-emerald-400/40 rounded-lg flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                </div>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-700 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 whitespace-nowrap shadow-lg">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>تحديد حواف السيراميك نشط تلقائياً</span>
                </div>
              </div>
            </>
          )}

          {/* Phase 2: Captured Frame with 4 Draggable Interactive Corner Handles & Live Loupe */}
          {phase === 'adjust_perspective' && capturedImage && (
            <>
              {viewMode === 'editor' ? (
                <>
                  <img
                    ref={imageElementRef}
                    src={capturedImage}
                    alt="Captured tile"
                    crossOrigin="anonymous"
                    className="w-full h-full object-contain pointer-events-none select-none"
                  />

                  {/* SVG Polygon Mesh & Out-of-bounds Shading */}
                  <svg className="w-full h-full absolute inset-0 pointer-events-none">
                    <polygon
                      points={`
                        ${corners.topLeft.x * 100}%,${corners.topLeft.y * 100}% 
                        ${corners.topRight.x * 100}%,${corners.topRight.y * 100}% 
                        ${corners.bottomRight.x * 100}%,${corners.bottomRight.y * 100}% 
                        ${corners.bottomLeft.x * 100}%,${corners.bottomLeft.y * 100}%
                      `}
                      fill="rgba(16, 185, 129, 0.22)"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                    {/* Grid lines inside tile to check alignment */}
                    <line
                      x1={`${(corners.topLeft.x + corners.bottomLeft.x) * 50}%`}
                      y1={`${(corners.topLeft.y + corners.bottomLeft.y) * 50}%`}
                      x2={`${(corners.topRight.x + corners.bottomRight.x) * 50}%`}
                      y2={`${(corners.topRight.y + corners.bottomRight.y) * 50}%`}
                      stroke="rgba(16, 185, 129, 0.4)"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={`${(corners.topLeft.x + corners.topRight.x) * 50}%`}
                      y1={`${(corners.topLeft.y + corners.topRight.y) * 50}%`}
                      x2={`${(corners.bottomLeft.x + corners.bottomRight.x) * 50}%`}
                      y2={`${(corners.bottomLeft.y + corners.bottomRight.y) * 50}%`}
                      stroke="rgba(16, 185, 129, 0.4)"
                      strokeDasharray="3 3"
                    />
                  </svg>

                  {/* 4 Interactive Corner Anchors (Touch/Mouse Draggable) */}
                  {[
                    { key: 'topLeft' as const, label: 'أعلى يسار', pt: corners.topLeft },
                    { key: 'topRight' as const, label: 'أعلى يمين', pt: corners.topRight },
                    { key: 'bottomRight' as const, label: 'أسفل يمين', pt: corners.bottomRight },
                    { key: 'bottomLeft' as const, label: 'أسفل يسار', pt: corners.bottomLeft },
                  ].map(({ key, pt }) => (
                    <div
                      key={key}
                      onPointerDown={handlePointerDown(key)}
                      style={{
                        left: `${pt.x * 100}%`,
                        top: `${pt.y * 100}%`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-grab active:cursor-grabbing z-30 touch-none ${
                        activeCorner === key ? 'scale-125' : ''
                      } transition-transform`}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500/40 border-2 border-emerald-400 flex items-center justify-center shadow-xl shadow-black/80">
                        <div className="w-3 h-3 rounded-full bg-white shadow-sm ring-2 ring-emerald-600" />
                      </div>
                    </div>
                  ))}

                  {/* High Precision Magnifying Loupe Window */}
                  {showLoupe && (
                    <div
                      style={{
                        left: `${loupePos.x}px`,
                        top: `${loupePos.y}px`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none rounded-full overflow-hidden border-2 border-emerald-400 shadow-2xl shadow-black bg-slate-950 ring-4 ring-slate-950/60 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <canvas
                        ref={loupeCanvasRef}
                        width={96}
                        height={96}
                        className="w-24 h-24 block"
                      />
                    </div>
                  )}
                </>
              ) : (
                /* Live Rectified Preview Mode */
                <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-slate-950/80">
                  {livePreviewUrl ? (
                    <div className="relative w-full max-w-[280px] aspect-square rounded-xl overflow-hidden border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950">
                      <img
                        src={livePreviewUrl}
                        alt="Rectified flat tile preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-slate-950/90 px-2 py-0.5 rounded-md border border-emerald-500/50 text-[9px] text-emerald-400 font-bold">
                        ناتج العزل والتسوية (512x512)
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs">جاري توليد المعاينة...</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Sample Selector for testing (Ceram Decor catalog tiles) */}
        {phase === 'adjust_perspective' && (
          <div className="w-full mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Layers className="w-3 h-3 text-emerald-400" />
                <span>أو جرّب صور من موقع Ceram Decor:</span>
              </span>
              <span className="text-[9px] text-slate-500">اختر بلاطة لتحديد حوافها فوراً</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {INITIAL_TILES_CATALOG.slice(0, 7).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleLoadSample(item.imageResOrPath)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 whitespace-nowrap cursor-pointer shrink-0 active:scale-95"
                >
                  <img
                    src={item.imageResOrPath}
                    alt={item.name}
                    className="w-4 h-4 rounded object-cover"
                  />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-md space-y-2 px-1">
        {phase === 'live_camera' ? (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={toggleCameraFacing}
              className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 active:scale-95 cursor-pointer shadow-md"
              title="تبديل الكاميرا"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>

            {/* Shutter Capture Button */}
            <button
              onClick={handleCaptureFrame}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-500 active:bg-emerald-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Camera className="w-5 h-5" />
              <span>التقاط وتحديد حواف السيراميك</span>
            </button>

            <button
              onClick={handleAutoSnap}
              className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 active:scale-95 cursor-pointer shadow-md"
              title="إعادة تعيين الحواف"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Aspect Ratio Presets & Mode Selector */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => applyPreset('square')}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                  activePreset === 'square'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                مربع (60×60)
              </button>
              <button
                onClick={() => applyPreset('wide')}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                  activePreset === 'wide'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                عرضي (30×60)
              </button>
              <button
                onClick={() => applyPreset('tall')}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                  activePreset === 'tall'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                طولي (20×90)
              </button>
              <button
                onClick={handleAutoSnap}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activePreset === 'custom'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>اكتشاف ذكي</span>
              </button>
            </div>

            {/* Quick Action Tools Bar */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleRetake}
                className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 flex-1 active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة التقاط</span>
              </button>

              <button
                onClick={() => setViewMode((prev) => (prev === 'editor' ? 'preview' : 'editor'))}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 flex-1 active:scale-95 cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{viewMode === 'editor' ? 'معاينة التسوية' : 'تعديل الحواف'}</span>
              </button>
            </div>

            {/* Primary Submit Button: Perspective Transform & Run Model */}
            <button
              onClick={handlePerformPerspectiveTransform}
              disabled={isWarping}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 active:bg-emerald-600 disabled:opacity-50 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 cursor-pointer transition-all active:scale-[0.98]"
            >
              {isWarping ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>جاري قص وعزل السيراميك وتعديل الزاوية...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>قص وتعديل الزاوية وتمرير للنموذج</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
