import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Eye,
} from 'lucide-react';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { api } from '../../../services/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const StampLiveCanvas: React.FC = () => {
  const { document, currentPage, setCurrentPage } = useDocumentStore();
  const stampState = useStampConvertStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState<number>(1.0);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 595, height: 842 });
  const [showLivePreview, setShowLivePreview] = useState<boolean>(true);

  // Load PDF doc
  useEffect(() => {
    if (!document) return;
    let cancelled = false;

    const docUrl = api.getDocumentDownloadUrl(document.file_id);
    const loadingTask = pdfjsLib.getDocument({
      url: docUrl,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
    });

    loadingTask.promise
      .then((loadedDoc) => {
        if (!cancelled) setPdfDocProxy(loadedDoc);
      })
      .catch((err) => {
        console.error('Failed loading PDF proxy:', err);
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [document?.file_id]);

  // Render Page
  useEffect(() => {
    if (!pdfDocProxy || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      try {
        const page = await pdfDocProxy.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        setPageSize({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render error:', err);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [pdfDocProxy, currentPage, scale]);

  const totalPages = document?.page_count || 1;

  // Evaluate dynamic placeholders for headers/footers
  const evaluatePlaceholder = (template: string) => {
    if (!template) return '';
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const docTitle = document?.filename?.replace('.pdf', '') || 'Document';

    return template
      .replace(/\{title\}/gi, docTitle)
      .replace(/\{page\}/gi, String(currentPage))
      .replace(/\{total\}/gi, String(totalPages))
      .replace(/\{date\}/gi, dateStr)
      .replace(/\{time\}/gi, timeStr);
  };

  // Convert current page to formatted string for page number tool
  const getFormattedPageNumber = () => {
    let num = currentPage + stampState.pnStartNumber - 1;
    let numStr = String(num);
    if (stampState.pnFormat === 'padded') {
      numStr = String(num).padStart(2, '0');
    } else if (stampState.pnFormat === 'roman_lower') {
      const romans: [number, string][] = [
        [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
        [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
        [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
      ];
      let r = '';
      let n = num;
      for (const [val, sym] of romans) {
        while (n >= val) { r += sym; n -= val; }
      }
      numStr = r || 'i';
    } else if (stampState.pnFormat === 'roman_upper') {
      const romans: [number, string][] = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
      ];
      let r = '';
      let n = num;
      for (const [val, sym] of romans) {
        while (n >= val) { r += sym; n -= val; }
      }
      numStr = r || 'I';
    }

    let result = stampState.pnPrefix + numStr;
    if (stampState.pnIncludeTotal) {
      result += stampState.pnSeparator + String(totalPages);
    }
    result += stampState.pnSuffix;
    return result;
  };

  const shouldRenderStampOnCurrentPage = () => {
    if (stampState.pageRangeOption === 'all') return true;
    if (stampState.pageRangeOption === 'selection') {
      return stampState.selectedPages.includes(currentPage);
    }
    // custom
    if (!stampState.customPageRange.trim()) return true;
    // Basic range parsing
    const parts = stampState.customPageRange.split(',').map((s) => s.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
        if (currentPage >= start && currentPage <= end) return true;
      } else {
        if (parseInt(part, 10) === currentPage) return true;
      }
    }
    return false;
  };

  const isCurrentPageEligible = shouldRenderStampOnCurrentPage();

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/70 select-none overflow-hidden">
      {/* Top Viewport Navigation Bar */}
      <div className="h-11 border-b border-studio-border bg-white px-4 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-slate-600">
            Page <span className="font-semibold text-slate-900">{currentPage}</span> of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Page Selection Pill */}
          <button
            onClick={() => stampState.togglePageSelection(currentPage)}
            className={`ml-3 px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1.5 transition-colors ${
              stampState.selectedPages.includes(currentPage)
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                stampState.selectedPages.includes(currentPage) ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            />
            {stampState.selectedPages.includes(currentPage) ? 'Page Selected' : 'Select Page'}
          </button>
        </div>

        {/* Live Preview Toggle & Zoom */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <Eye className="w-3.5 h-3.5 text-studio-primary" />
            <span>Live Stamp Preview</span>
            <input
              type="checkbox"
              checked={showLivePreview}
              onChange={(e) => setShowLivePreview(e.target.checked)}
              className="accent-studio-primary rounded cursor-pointer ml-1"
            />
          </label>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-700 min-w-[44px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(Math.min(2.5, scale + 0.1))}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScale(1.0)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Scroll Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex items-center justify-center relative"
      >
        <div
          className="relative bg-white shadow-xl rounded border border-slate-200/80 transition-all duration-150"
          style={{
            width: pageSize.width || 595,
            height: pageSize.height || 842,
          }}
        >
          {/* Base PDF Canvas */}
          <canvas ref={canvasRef} className="block w-full h-full rounded" />

          {/* Interactive Live Stamp Layer */}
          {showLivePreview && isCurrentPageEligible && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded">
              {/* Tool 1: Watermark Preview */}
              {stampState.activeSubTool === 'watermark' && (
                <>
                  {stampState.wmType === 'text' && stampState.wmText && (
                    <>
                      {stampState.wmRepeat ? (
                        <div
                          className="absolute inset-0 grid place-items-center"
                          style={{
                            gridTemplateColumns:
                              stampState.wmRepeatDensity === 'dense'
                                ? 'repeat(3, 1fr)'
                                : stampState.wmRepeatDensity === 'medium'
                                ? 'repeat(2, 1fr)'
                                : 'repeat(2, 1fr)',
                            gridTemplateRows:
                              stampState.wmRepeatDensity === 'dense'
                                ? 'repeat(4, 1fr)'
                                : stampState.wmRepeatDensity === 'medium'
                                ? 'repeat(3, 1fr)'
                                : 'repeat(2, 1fr)',
                          }}
                        >
                          {Array.from({
                            length:
                              stampState.wmRepeatDensity === 'dense'
                                ? 12
                                : stampState.wmRepeatDensity === 'medium'
                                ? 6
                                : 4,
                          }).map((_, idx) => (
                            <div
                              key={idx}
                              className="font-bold select-none text-center"
                              style={{
                                color: stampState.wmColor,
                                opacity: stampState.wmOpacity,
                                fontSize: `${(stampState.wmFontSize * scale) * 0.65}px`,
                                fontFamily: stampState.wmFontName,
                                transform: `rotate(${stampState.wmRotation}deg)`,
                              }}
                            >
                              {stampState.wmText}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold whitespace-nowrap select-none text-center pointer-events-none"
                          style={{
                            color: stampState.wmColor,
                            opacity: stampState.wmOpacity,
                            fontSize: `${stampState.wmFontSize * scale}px`,
                            fontFamily: stampState.wmFontName,
                            transform: `translate(-50%, -50%) rotate(${stampState.wmRotation}deg)`,
                            letterSpacing: '0.08em',
                          }}
                        >
                          {stampState.wmText}
                        </div>
                      )}
                    </>
                  )}

                  {stampState.wmType === 'image' && stampState.wmImageBase64 && (
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${stampState.wmRotation}deg)`,
                        opacity: stampState.wmOpacity,
                      }}
                    >
                      <img
                        src={stampState.wmImageBase64}
                        alt="Watermark Preview"
                        style={{
                          maxWidth: `${pageSize.width * stampState.wmImageScale}px`,
                          maxHeight: `${pageSize.height * stampState.wmImageScale}px`,
                          objectFit: stampState.wmMaintainAspect ? 'contain' : 'fill',
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Tool 2: Page Numbers Preview */}
              {stampState.activeSubTool === 'page-numbers' && !(stampState.pnSkipCover && currentPage === 1) && (
                <div
                  className={`absolute px-6 py-4 flex items-center text-xs font-semibold ${
                    stampState.pnPosition.includes('top') ? 'top-0' : 'bottom-0'
                  } ${
                    stampState.pnPosition.includes('left')
                      ? 'left-0 justify-start'
                      : stampState.pnPosition.includes('right')
                      ? 'right-0 justify-end'
                      : 'left-0 right-0 justify-center'
                  }`}
                  style={{
                    color: stampState.pnColor,
                    fontSize: `${stampState.pnFontSize * scale}px`,
                    fontFamily: stampState.pnFontName,
                  }}
                >
                  <span className="bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded shadow-2xs border border-slate-200/60">
                    {getFormattedPageNumber()}
                  </span>
                </div>
              )}

              {/* Tool 3: Headers & Footers Preview */}
              {stampState.activeSubTool === 'header-footer' && !(stampState.hfSkipCover && currentPage === 1) && (
                <>
                  {/* Header */}
                  <div
                    className="absolute top-0 left-0 right-0 px-8 pt-4 pb-2 text-[10px]"
                    style={{
                      color: stampState.hfColor,
                      fontSize: `${stampState.hfFontSize * scale}px`,
                      fontFamily: stampState.hfFontName,
                      borderBottom: stampState.hfDividerLine ? `1px solid ${stampState.hfDividerColor}` : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[30%]">{evaluatePlaceholder(stampState.hfHeaderLeft)}</span>
                      <span className="truncate max-w-[40%] text-center font-medium">
                        {evaluatePlaceholder(stampState.hfHeaderCenter)}
                      </span>
                      <span className="truncate max-w-[30%] text-right">{evaluatePlaceholder(stampState.hfHeaderRight)}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    className="absolute bottom-0 left-0 right-0 px-8 pb-4 pt-2 text-[10px]"
                    style={{
                      color: stampState.hfColor,
                      fontSize: `${stampState.hfFontSize * scale}px`,
                      fontFamily: stampState.hfFontName,
                      borderTop: stampState.hfDividerLine ? `1px solid ${stampState.hfDividerColor}` : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[30%]">{evaluatePlaceholder(stampState.hfFooterLeft)}</span>
                      <span className="truncate max-w-[40%] text-center font-medium">
                        {evaluatePlaceholder(stampState.hfFooterCenter)}
                      </span>
                      <span className="truncate max-w-[30%] text-right">{evaluatePlaceholder(stampState.hfFooterRight)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Tool 4: Date Stamp Preview */}
              {stampState.activeSubTool === 'date-stamp' && (
                <div
                  className={`absolute p-6 flex ${
                    stampState.dsPosition === 'center'
                      ? 'inset-0 items-center justify-center'
                      : stampState.dsPosition.includes('top')
                      ? 'top-0'
                      : 'bottom-0'
                  } ${
                    stampState.dsPosition === 'center'
                      ? ''
                      : stampState.dsPosition.includes('left')
                      ? 'left-0'
                      : 'right-0'
                  }`}
                >
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border shadow-xs select-none"
                    style={{
                      color: stampState.dsColor,
                      borderColor: stampState.dsColor,
                      opacity: stampState.dsOpacity,
                      fontSize: `${stampState.dsFontSize * scale}px`,
                      fontFamily: stampState.dsFontName,
                      transform: `rotate(${stampState.dsRotation}deg)`,
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    <span className="font-bold tracking-wide">
                      {stampState.dsCustomDate.trim()
                        ? stampState.dsCustomDate
                        : stampState.dsDateFormat === 'full'
                        ? new Date().toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : stampState.dsDateFormat === 'MM/DD/YYYY'
                        ? new Date().toLocaleDateString('en-US')
                        : stampState.dsDateFormat === 'YYYY-MM-DD'
                        ? new Date().toISOString().split('T')[0]
                        : new Date().toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
