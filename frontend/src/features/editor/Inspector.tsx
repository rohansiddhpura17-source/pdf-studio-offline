import React from 'react';
import {
  Layers,
  Stamp,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { formatBytes, formatPageDimensions } from '../../utils/format';

export const Inspector: React.FC = () => {
  const {
    document,
    currentPage,
    setActiveModule,
    addToast,
  } = useDocumentStore();

  if (!document) return null;

  const activePageInfo = document.pages.find((p) => p.page_number === currentPage) || document.pages[0];

  return (
    <aside className="w-64 border-l border-studio-border bg-white flex flex-col justify-between p-4 select-none z-10 flex-shrink-0 overflow-y-auto">
      <div className="space-y-6">
        {/* Properties Header */}
        <div className="border-b border-studio-border pb-3">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
            Properties
          </span>
          <h3 className="text-sm font-bold text-studio-navy mt-1">Document</h3>
        </div>

        {/* Document Stats Table */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span>File name</span>
            <span className="text-studio-navy font-semibold max-w-[120px] truncate" title={document.filename}>
              {document.filename}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <span>File size</span>
            <span className="text-studio-navy font-mono font-medium">
              {formatBytes(document.size_bytes)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <span>Pages</span>
            <span className="text-studio-navy font-semibold">
              {document.page_count}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <span>Page size</span>
            <span className="text-studio-navy font-medium">
              {activePageInfo ? formatPageDimensions(activePageInfo.width, activePageInfo.height) : 'A4 · Portrait'}
            </span>
          </div>
        </div>

        {/* Page Settings */}
        <div className="border-t border-studio-border pt-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-700">Page settings</h4>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-medium">Rotation</label>
            <select
              value={activePageInfo?.rotation || 0}
              onChange={(e) => {
                addToast({
                  type: 'info',
                  title: 'Page Rotation',
                  message: `Rotating page to ${e.target.value}°. Use the Organise module for permanent page rotation.`,
                });
              }}
              className="w-full text-xs bg-slate-50 border border-studio-border rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-studio-primary"
            >
              <option value={0}>0° (Default)</option>
              <option value={90}>90° (Clockwise)</option>
              <option value={180}>180° (Inverted)</option>
              <option value={270}>270° (Counter-clockwise)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-medium">Page background</label>
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-studio-border rounded-lg text-xs text-slate-600">
              <span className="w-3.5 h-3.5 rounded-sm border border-slate-300 bg-white" />
              <span>White</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-studio-border pt-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-700">Quick actions</h4>

          <button
            onClick={() => setActiveModule('organise')}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-studio-border hover:border-studio-primary/60 hover:bg-slate-50 text-left transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-50 text-studio-primary flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-studio-navy group-hover:text-studio-primary">Organise pages</p>
                <p className="text-[10px] text-slate-400">Reorder, delete or extract</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveModule('stamp')}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-studio-border hover:border-studio-primary/60 hover:bg-slate-50 text-left transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Stamp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-studio-navy group-hover:text-indigo-600">Add watermark</p>
                <p className="text-[10px] text-slate-400">Apply to selected pages</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveModule('convert')}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-studio-border hover:border-studio-primary/60 hover:bg-slate-50 text-left transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-studio-navy group-hover:text-emerald-600">Export as images</p>
                <p className="text-[10px] text-slate-400">PNG or JPEG format</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Offline protection active card */}
      <div className="mt-6 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
        <div className="flex items-center gap-1.5 mb-1 text-emerald-800 font-semibold text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Offline protection active</span>
        </div>
        <p className="text-[10px] text-emerald-700 leading-relaxed">
          This document is being processed on your device only.
        </p>
      </div>
    </aside>
  );
};
