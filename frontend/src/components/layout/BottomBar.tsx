import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';

export const BottomBar: React.FC = () => {
  const {
    document,
    currentPage,
    setCurrentPage,
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    setZoomMode,
  } = useDocumentStore();

  const [inputVal, setInputVal] = useState('');

  if (!document) return null;

  const totalPages = document.page_count;

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(inputVal, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
      setInputVal('');
    }
  };

  return (
    <footer className="h-10 border-t border-studio-border bg-white px-4 flex items-center justify-between text-xs text-slate-600 select-none z-10">
      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5 font-medium">
          <span>Page</span>
          <input
            type="text"
            value={inputVal !== '' ? inputVal : currentPage}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={() => setInputVal('')}
            className="w-9 text-center py-0.5 border border-studio-border rounded text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-studio-primary font-mono"
          />
          <span className="text-slate-400">of {totalPages}</span>
        </form>

        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Offline protection active */}
      <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/60 rounded-full">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-[11px] font-medium text-slate-700">
          Offline protection active · This document is being processed on your device only
        </span>
      </div>

      {/* Right: Zoom status and presets */}
      <div className="flex items-center gap-2">
        <button
          onClick={zoomOut}
          className="p-1 rounded hover:bg-slate-100 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono font-medium text-slate-700 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="p-1 rounded hover:bg-slate-100 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setZoomMode('fit-page');
          }}
          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-medium text-slate-700 transition-colors"
        >
          Fit page
        </button>
      </div>
    </footer>
  );
};
