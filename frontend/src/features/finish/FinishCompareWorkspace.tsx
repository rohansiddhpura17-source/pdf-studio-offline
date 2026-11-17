import React from 'react';
import {
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useFinishStore } from '../../state/useFinishStore';
import { Button } from '../../components/common/Button';
import { FinishSidebar } from './components/FinishSidebar';
import { CompressionView } from './components/CompressionView';
import { MetadataEditorView } from './components/MetadataEditorView';
import { MetadataCleanupView } from './components/MetadataCleanupView';
import { PdfCompareView } from './components/PdfCompareView';
import { CompressionInspector } from './inspectors/CompressionInspector';
import { MetadataInspector } from './inspectors/MetadataInspector';
import { MetadataCleanupInspector } from './inspectors/MetadataCleanupInspector';
import { CompareInspector } from './inspectors/CompareInspector';
import { formatBytes } from '../../utils/format';

export const FinishCompareWorkspace: React.FC = () => {
  const { document, setActiveModule, closeDocument } = useDocumentStore();
  const {
    activeSubTool,
    resetFinishState,
    isProcessing,
  } = useFinishStore();

  const getToolTitle = () => {
    switch (activeSubTool) {
      case 'compress':
        return {
          name: 'PDF Compression',
          desc: 'Lossless stream deflation & adaptive raster resampling',
        };
      case 'edit-metadata':
        return {
          name: 'Edit Document Metadata',
          desc: 'Manage standard /Info tags & custom dictionary keys',
        };
      case 'remove-metadata':
        return {
          name: 'Remove Metadata & Sanitize',
          desc: 'Purge author identity, timestamps, XMP & background traces',
        };
      case 'compare':
        return {
          name: 'Compare Two PDFs',
          desc: 'Dual document side-by-side, overlay blend & visual heatmap diffs',
        };
    }
  };

  const toolMeta = getToolTitle();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-bg select-none">
      {/* 1. Top Navigation Bar */}
      <header className="h-14 border-b border-studio-border bg-white px-4 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={closeDocument}
            className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-studio-navy transition-colors text-xs font-medium"
            title="Return to Document Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveModule('edit')}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Document</span>
          </Button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-50 text-studio-primary">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-800">
              Finish & Compare Workspace
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-600 font-medium truncate max-w-xs">
              {document?.filename || 'Untitled Document'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFinishState}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
            title="Reset tool options to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Offline Local Sandbox</span>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area: Left Sidebar | Central Workspace | Right Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Subtool Sidebar */}
        <FinishSidebar />

        {/* Central Workspace View */}
        <main className="flex-1 flex overflow-hidden">
          {activeSubTool === 'compress' && <CompressionView />}
          {activeSubTool === 'edit-metadata' && <MetadataEditorView />}
          {activeSubTool === 'remove-metadata' && <MetadataCleanupView />}
          {activeSubTool === 'compare' && <PdfCompareView />}
        </main>

        {/* Right Properties Inspector */}
        <aside className="w-80 border-l border-studio-border bg-white flex flex-col justify-between select-none z-10 flex-shrink-0">
          <div className="p-4 border-b border-slate-100 flex-shrink-0">
            <h3 className="text-sm font-bold text-slate-900">{toolMeta.name}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{toolMeta.desc}</p>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {activeSubTool === 'compress' && <CompressionInspector />}
            {activeSubTool === 'edit-metadata' && <MetadataInspector />}
            {activeSubTool === 'remove-metadata' && <MetadataCleanupInspector />}
            {activeSubTool === 'compare' && <CompareInspector />}
          </div>
        </aside>
      </div>

      {/* 3. Bottom Status Bar */}
      <footer className="h-8 border-t border-studio-border bg-white px-4 flex items-center justify-between text-[11px] text-slate-500 z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>
            Document Pages: <strong className="text-slate-700">{document?.page_count || 0}</strong>
          </span>
          <span>•</span>
          <span>
            Document Size:{' '}
            <strong className="text-slate-700">
              {document?.size_bytes ? formatBytes(document.size_bytes) : '0 B'}
            </strong>
          </span>
          <span>•</span>
          <span>
            Tool: <strong className="text-slate-700">{toolMeta.name}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 text-blue-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>Processing Local Operation...</span>
            </div>
          ) : (
            <span className="text-slate-400">Ready</span>
          )}
          <span>•</span>
          <span className="font-medium text-slate-600">PDF Studio Phase 5</span>
        </div>
      </footer>
    </div>
  );
};
