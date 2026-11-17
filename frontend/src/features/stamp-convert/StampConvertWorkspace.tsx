import React from 'react';
import {
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useStampConvertStore } from '../../state/useStampConvertStore';
import { Button } from '../../components/common/Button';
import { StampSidebar } from './components/StampSidebar';
import { StampLiveCanvas } from './components/StampLiveCanvas';
import { ImagesToPdfView } from './components/ImagesToPdfView';
import { PdfToImagesView } from './components/PdfToImagesView';
import { PdfToTextView } from './components/PdfToTextView';
import { WatermarkInspector } from './inspectors/WatermarkInspector';
import { PageNumberInspector } from './inspectors/PageNumberInspector';
import { HeaderFooterInspector } from './inspectors/HeaderFooterInspector';
import { DateStampInspector } from './inspectors/DateStampInspector';
import { ImagesToPdfInspector } from './inspectors/ImagesToPdfInspector';
import { PdfToImagesInspector } from './inspectors/PdfToImagesInspector';
import { PdfToTextInspector } from './inspectors/PdfToTextInspector';

export const StampConvertWorkspace: React.FC = () => {
  const { document, setActiveModule, closeDocument } = useDocumentStore();
  const {
    activeSubTool,
    resetToolState,
    isProcessing,
    selectedPages,
  } = useStampConvertStore();

  const getToolTitle = () => {
    switch (activeSubTool) {
      case 'watermark':
        return { name: 'Watermark', desc: 'Overlay text or image logos across document' };
      case 'page-numbers':
        return { name: 'Page Numbers', desc: 'Configure numbering alignment, formats & ranges' };
      case 'header-footer':
        return { name: 'Headers & Footers', desc: 'Three-column layout with dynamic template tags' };
      case 'date-stamp':
        return { name: 'Date Stamp', desc: 'Visual date stamp annotation for official review' };
      case 'images-to-pdf':
        return { name: 'Images to PDF', desc: 'Batch assemble raster images into a clean PDF' };
      case 'pdf-to-images':
        return { name: 'PDF to Images', desc: 'Rasterize PDF pages into high-resolution images' };
      case 'pdf-to-text':
        return { name: 'PDF to Text', desc: 'Extract readable text and detect scanned pages' };
    }
  };

  const toolMeta = getToolTitle();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-bg select-none">
      {/* Top Navigation Bar */}
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
              {activeSubTool.includes('pdf') || activeSubTool.includes('images') ? (
                <ArrowLeftRight className="w-4 h-4" />
              ) : (
                <Layers className="w-4 h-4" />
              )}
            </span>
            <span className="text-xs font-bold text-slate-800">
              Stamp & Convert Workspace
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
            onClick={resetToolState}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
            title="Reset options to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Offline Sandbox</span>
          </div>
        </div>
      </header>

      {/* Main Content Area: Sidebar | Center Canvas/View | Right Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <StampSidebar />

        {/* Central Workspace Canvas / Views */}
        <main className="flex-1 flex overflow-hidden">
          {activeSubTool === 'images-to-pdf' ? (
            <ImagesToPdfView />
          ) : activeSubTool === 'pdf-to-images' ? (
            <PdfToImagesView />
          ) : activeSubTool === 'pdf-to-text' ? (
            <PdfToTextView />
          ) : (
            <StampLiveCanvas />
          )}
        </main>

        {/* Right Properties Inspector */}
        <aside className="w-80 border-l border-studio-border bg-white flex flex-col justify-between select-none z-10 flex-shrink-0">
          <div className="p-4 border-b border-slate-100 flex-shrink-0">
            <h3 className="text-sm font-bold text-slate-900">{toolMeta.name}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{toolMeta.desc}</p>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {activeSubTool === 'watermark' && <WatermarkInspector />}
            {activeSubTool === 'page-numbers' && <PageNumberInspector />}
            {activeSubTool === 'header-footer' && <HeaderFooterInspector />}
            {activeSubTool === 'date-stamp' && <DateStampInspector />}
            {activeSubTool === 'images-to-pdf' && <ImagesToPdfInspector />}
            {activeSubTool === 'pdf-to-images' && <PdfToImagesInspector />}
            {activeSubTool === 'pdf-to-text' && <PdfToTextInspector />}
          </div>
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-8 border-t border-studio-border bg-white px-4 flex items-center justify-between text-[11px] text-slate-500 z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>
            Document Pages: <strong className="text-slate-700">{document?.page_count || 0}</strong>
          </span>
          <span>•</span>
          <span>
            Selected Pages:{' '}
            <strong className="text-slate-700">
              {selectedPages.length > 0 ? selectedPages.join(', ') : 'All'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 text-blue-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>Processing Operation...</span>
            </div>
          ) : (
            <span className="text-slate-400">Ready</span>
          )}
          <span>•</span>
          <span className="font-medium text-slate-600">PDF Studio Phase 4</span>
        </div>
      </footer>
    </div>
  );
};
