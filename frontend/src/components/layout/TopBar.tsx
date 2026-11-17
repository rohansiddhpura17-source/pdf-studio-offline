import React, { useEffect } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Download,
  ShieldCheck,
  Settings,
  ChevronDown,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useEditStore } from '../../state/useEditStore';
import { Button } from '../common/Button';
import { api } from '../../services/api';

export const TopBar: React.FC = () => {
  const {
    document,
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    setZoomMode,
    hasUnsavedChanges,
    setIsSettingsOpen,
    closeDocument,
    addToast,
    activeModule,
    organiseHistory,
    organiseFuture,
    undoOrganise,
    redoOrganise,
    setIsSearchOpen,
  } = useDocumentStore();

  const { history, future, undo, redo } = useEditStore();

  // Undo/redo target the module that actually has history:
  // Edit drafts (annotations) or Organise page operations.
  const canUndo =
    activeModule === 'edit' ? history.length > 0 : activeModule === 'organise' ? organiseHistory.length > 0 : false;
  const canRedo =
    activeModule === 'edit' ? future.length > 0 : activeModule === 'organise' ? organiseFuture.length > 0 : false;

  const handleUndo = () => {
    if (activeModule === 'edit') undo();
    else if (activeModule === 'organise') undoOrganise();
  };

  const handleRedo = () => {
    if (activeModule === 'edit') redo();
    else if (activeModule === 'organise') redoOrganise();
  };

  // ⌘Z / ⌘⇧Z (Ctrl+Z / Ctrl+Shift+Z on Windows/Linux). Ignored while
  // typing in a text field so shortcuts never fight with text editing.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const modKey = e.metaKey || e.ctrlKey;
      if (!modKey || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) {
        if (canRedo) handleRedo();
      } else if (canUndo) {
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, canRedo, activeModule]);

  const handleSave = async () => {
    if (!document) return;
    try {
      await api.downloadDocument(document.file_id, document.filename);
      addToast({
        type: 'success',
        title: 'Document Saved',
        message: `Saved ${document.filename} locally to your Downloads folder.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not export the PDF document.',
      });
    }
  };

  const handleSaveAs = async () => {
    if (!document) return;
    const name = window.prompt('Enter new filename for the document:', `copy_${document.filename}`);
    if (!name) return;
    try {
      const newDoc = await api.saveAs(document.file_id, name);
      await api.downloadDocument(newDoc.file_id, newDoc.filename);
      addToast({
        type: 'success',
        title: 'Document Exported As New Copy',
        message: `Saved ${newDoc.filename} without touching original file.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Save As Failed',
        message: 'Could not export copy.',
      });
    }
  };

  return (
    <header className="h-14 border-b border-studio-border glass-header flex items-center justify-between px-4 z-20 select-none shadow-subtle">
      {/* Left: Brand & File Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={closeDocument}
          className="flex items-center gap-2 text-studio-navy hover:text-studio-primary transition-colors pr-2 group"
          title="Return to Document Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-studio-primary via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-glow-soft group-hover:shadow-glow transition-shadow">
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="font-bold text-sm tracking-tight text-studio-navy">PDF</span>
            <span className="font-light text-sm tracking-tight text-studio-muted ml-0.5">STUDIO</span>
          </div>
        </button>

        <div className="h-5 w-[1px] bg-studio-border mx-1" />

        {/* Back to Home button */}
        <button
          onClick={closeDocument}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-studio-navy transition-colors flex items-center gap-1 text-xs font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>

        {/* Document Name and status */}
        {document && (
          <div className="flex items-center gap-2 pl-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-studio-navy max-w-[220px] truncate" title={document.filename}>
                  {document.filename}
                </span>
                <span className="text-[10px] text-slate-400">
                  {document.page_count} pages
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">
                {hasUnsavedChanges ? '• Unsaved changes' : '• Saved locally'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Middle: Command Search & Quick Zoom */}
      <div className="flex items-center gap-3">
        {/* Search — opens the real ⌘K command palette */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="hidden md:flex items-center gap-2 pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-white border border-studio-border hover:border-studio-primary/50 hover:shadow-glow-soft rounded-lg text-slate-500 w-64 text-left transition-all relative"
          title="Search tools (⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <span className="flex-1 truncate">Search tools or commands…</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </button>

        {/* Local only badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-full text-emerald-700 text-xs font-medium shadow-subtle">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>LOCAL ONLY</span>
        </div>

        {/* Undo / Redo — wired to the active module's real history */}
        <div className="flex items-center gap-0.5 border border-studio-border rounded-lg p-0.5 bg-slate-50/50">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1 rounded text-slate-500 hover:text-studio-navy hover:bg-white disabled:opacity-40 transition-colors active:scale-90"
            title={
              activeModule === 'edit'
                ? 'Undo edit (⌘Z)'
                : activeModule === 'organise'
                ? 'Undo organise change (⌘Z)'
                : 'Undo — no history for this module'
            }
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1 rounded text-slate-500 hover:text-studio-navy hover:bg-white disabled:opacity-40 transition-colors active:scale-90"
            title={
              activeModule === 'edit'
                ? 'Redo edit (⌘⇧Z)'
                : activeModule === 'organise'
                ? 'Redo organise change (⌘⇧Z)'
                : 'Redo — no history for this module'
            }
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-50 border border-studio-border rounded-lg px-1.5 py-0.5 text-xs">
          <button
            onClick={zoomOut}
            className="p-1 hover:bg-white rounded text-slate-600 hover:text-studio-navy transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-11 text-center font-mono font-medium text-slate-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1 hover:bg-white rounded text-slate-600 hover:text-studio-navy transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1.0);
              setZoomMode('fit-page');
            }}
            className="p-1 hover:bg-white rounded text-slate-600 hover:text-studio-navy transition-colors ml-1 border-l border-slate-200 pl-1.5"
            title="Reset Zoom / Fit Page"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-slate-500 hover:text-studio-navy hover:bg-slate-100 rounded-lg transition-colors"
          title="Application Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Save PDF Action */}
        <div className="relative inline-flex rounded-lg shadow-subtle">
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleSave}
            className="rounded-r-none font-semibold text-xs tracking-wide"
          >
            Save PDF
          </Button>
          <button
            onClick={handleSaveAs}
            className="bg-studio-primary-hover hover:bg-blue-800 text-white px-1.5 rounded-r-lg border-l border-blue-500/40 flex items-center justify-center transition-colors"
            title="Save As New Copy..."
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
