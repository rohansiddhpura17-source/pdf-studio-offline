import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Layers,
  Scissors,
  ArrowUpDown,
  RotateCw,
  Trash2,
  Copy,
  ExternalLink,
  PlusSquare,
  Crop,
  Upload,
  MoveLeft,
  MoveRight,
  ShieldCheck,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { PageGrid } from './PageGrid';
import { api } from '../../services/api';
import { OrganiseTool, DocumentInfo } from '../../types/document';
import {formatPageDimensions} from '../../utils/format';

interface OrganiseToolItem {
  id: OrganiseTool;
  label: string;
  icon: React.ReactNode;
  desc: string;
}

const TOOLS: OrganiseToolItem[] = [
  { id: 'reorder', label: 'Reorder', icon: <ArrowUpDown className="w-4 h-4" />, desc: 'Drag-and-drop or shift page sequences' },
  { id: 'rotate', label: 'Rotate', icon: <RotateCw className="w-4 h-4" />, desc: 'Rotate pages 90°, 180°, or 270°' },
  { id: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4" />, desc: 'Remove unwanted pages with confirmation' },
  { id: 'duplicate', label: 'Duplicate', icon: <Copy className="w-4 h-4" />, desc: 'Clone selected pages with count options' },
  { id: 'extract', label: 'Extract', icon: <ExternalLink className="w-4 h-4" />, desc: 'Export selected pages as a new PDF' },
  { id: 'insert-blank', label: 'Insert Blank', icon: <PlusSquare className="w-4 h-4" />, desc: 'Add blank A4 or Letter canvas pages' },
  { id: 'crop', label: 'Crop', icon: <Crop className="w-4 h-4" />, desc: 'Trim margins with custom bounds' },
  { id: 'merge', label: 'Merge', icon: <Layers className="w-4 h-4" />, desc: 'Combine multiple PDFs in sequence' },
  { id: 'split', label: 'Split', icon: <Scissors className="w-4 h-4" />, desc: 'Split by pages, ranges, or break points' },
];

export const OrganiseWorkspace: React.FC = () => {
  const {
    document,
    setDocument,
    setActiveModule,
    closeDocument,
    selectedPages,
    setSelectedPages,
    selectAllPages,
    clearPageSelection,
    organiseTool,
    setOrganiseTool,
    organiseHistory,
    organiseFuture,
    pushOrganiseState,
    undoOrganise,
    redoOrganise,
    resetOrganise,
    hasUnsavedChanges,
    addToast,
  } = useDocumentStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Tool 1: Merge State
  const [mergeFiles, setMergeFiles] = useState<{ id: string; name: string; pages: number }[]>([]);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  // Tool 2: Split State
  const [splitMode, setSplitMode] = useState<'all_pages' | 'ranges' | 'after_pages'>('ranges');
  const [splitRangesInput, setSplitRangesInput] = useState('1-2, 3-5');
  const [splitAfterInput, setSplitAfterInput] = useState('2');

  // Tool 4: Rotate State
  const [rotateScope, setRotateScope] = useState<'selected' | 'all'>('selected');

  // Tool 6: Duplicate State
  const [duplicateCount, setDuplicateCount] = useState(1);

  // Tool 8: Insert Blank State
  const [blankPosition, setBlankPosition] = useState<'before' | 'after'>('after');
  const [blankCount, setBlankCount] = useState(1);
  const [blankPaperSize, setBlankPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [blankOrientation, setBlankOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Tool 9: Crop State
  const [cropScope, setCropScope] = useState<'selected' | 'all'>('selected');
  const [cropMargins, setCropMargins] = useState({ left: 20, top: 20, right: 20, bottom: 20 });

  if (!document) return null;

  // Active page info for inspector
  const activePageNum = selectedPages[0] || 1;
  const activePageInfo = document.pages.find((p) => p.page_number === activePageNum) || document.pages[0];

  // Helper for applying API updates
  const applyDocUpdate = (newDoc: DocumentInfo, toastMessage: string) => {
    pushOrganiseState(newDoc);
    addToast({
      type: 'success',
      title: 'Organise Operation Applied',
      message: toastMessage,
    });
  };

  // ================= TOOL HANDLERS =================

  // Tool 1: Merge
  const handleAddMergeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessing(true);
    try {
      const files = Array.from(e.target.files);
      const newItems: { id: string; name: string; pages: number }[] = [];
      for (const f of files) {
        const uploaded = await api.uploadDocument(f);
        newItems.push({ id: uploaded.file_id, name: uploaded.filename, pages: uploaded.page_count });
      }
      setMergeFiles((prev) => [...prev, ...newItems]);
      addToast({
        type: 'info',
        title: 'Documents Added for Merge',
        message: `Added ${files.length} document(s) to merge list.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Upload Failed', message: err.message });
    } finally {
      setIsProcessing(false);
      if (mergeFileInputRef.current) mergeFileInputRef.current.value = '';
    }
  };

  const handleExecuteMerge = async () => {
    if (mergeFiles.length === 0) {
      addToast({
        type: 'warning',
        title: 'Add Files First',
        message: 'Upload at least one additional PDF to merge with the current document.',
      });
      return;
    }
    setIsProcessing(true);
    try {
      const allIds = [document.file_id, ...mergeFiles.map((f) => f.id)];
      const merged = await api.mergePdfs(allIds, `merged_${document.filename}`);
      applyDocUpdate(merged, `Merged ${allIds.length} documents into ${merged.page_count} pages.`);
      setMergeFiles([]);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Merge Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Tool 2: Split
  const handleExecuteSplit = async () => {
    setIsProcessing(true);
    try {
      let rangesList: string[] | undefined = undefined;
      let afterList: number[] | undefined = undefined;

      if (splitMode === 'ranges') {
        rangesList = splitRangesInput.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (splitMode === 'after_pages') {
        afterList = splitAfterInput.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      }

      const res = await api.splitPdf(document.file_id, splitMode, rangesList, afterList);
      addToast({
        type: 'success',
        title: 'Split Completed',
        message: `Created ${res.output_documents.length} separate PDF files.`,
      });
      // Load the first split part into workspace
      if (res.output_documents.length > 0) {
        applyDocUpdate(res.output_documents[0], `Loaded split part 1 (${res.output_documents[0].page_count} pages).`);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Split Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Tool 3: Reorder
  const handleReorder = async (newOrder: number[]) => {
    setIsProcessing(true);
    try {
      const reordered = await api.reorderPages(document.file_id, newOrder);
      applyDocUpdate(reordered, 'Page order updated.');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reorder Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReverseOrder = () => {
    const reversed = [...document.pages.map((p) => p.page_number)].reverse();
    handleReorder(reversed);
  };

  const handleShiftSelected = (direction: 'left' | 'right') => {
    if (selectedPages.length === 0) return;
    const currentOrder = document.pages.map((p) => p.page_number);
    const target = selectedPages[0];
    const idx = currentOrder.indexOf(target);
    if (idx === -1) return;

    const newIdx = direction === 'left' ? Math.max(0, idx - 1) : Math.min(currentOrder.length - 1, idx + 1);
    if (newIdx === idx) return;

    currentOrder.splice(idx, 1);
    currentOrder.splice(newIdx, 0, target);
    handleReorder(currentOrder);
  };

  // Tool 4: Rotate
  const handleRotate = async (angle: 90 | 180 | 270) => {
    setIsProcessing(true);
    try {
      const targets = rotateScope === 'all'
        ? document.pages.map((p) => p.page_number)
        : selectedPages;

      const rotated = await api.rotatePages(document.file_id, targets, angle);
      applyDocUpdate(rotated, `Rotated ${targets.length} page(s) by ${angle}°.`);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Rotation Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Tool 5: Delete
  const handleDeleteConfirm = async () => {
    setDeleteConfirmOpen(false);
    setIsProcessing(true);
    try {
      const deleted = await api.deletePages(document.file_id, selectedPages);
      applyDocUpdate(deleted, `Deleted ${selectedPages.length} page(s). Remaining: ${deleted.page_count} pages.`);
      clearPageSelection();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Deletion Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Tool 6: Duplicate
  const handleDuplicate = async () => {
    setIsProcessing(true);
    try {
      const duplicated = await api.duplicatePages(document.file_id, selectedPages, duplicateCount);
      applyDocUpdate(duplicated, `Duplicated ${selectedPages.length} page(s) (${duplicateCount} copies each).`);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Duplicate Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Tool 7: Extract
  const handleExtract = async () => {
    setIsProcessing(true);
    try {
      const extracted = await api.extractPages(document.file_id, selectedPages, `extracted_${document.filename}`);
      addToast({
        type: 'success',
        title: 'Pages Extracted',
        message: `Extracted ${selectedPages.length} pages into new document (${extracted.filename}).`,
      });
      // Also download extracted file
      await api.downloadDocument(extracted.file_id, extracted.filename);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Extract Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Tool 8: Insert Blank
  const handleInsertBlank = async () => {
    setIsProcessing(true);
    try {
      const target = selectedPages[0] || 1;
      const res = await api.insertBlankPage(
        document.file_id,
        target,
        blankPosition,
        blankCount,
        blankPaperSize,
        blankOrientation
      );
      applyDocUpdate(res, `Inserted ${blankCount} blank ${blankPaperSize} (${blankOrientation}) page(s) ${blankPosition} page ${target}.`);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Insert Blank Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Tool 9: Crop
  const handleCrop = async () => {
    setIsProcessing(true);
    try {
      const targets = cropScope === 'all'
        ? document.pages.map((p) => p.page_number)
        : selectedPages;

      const cropped = await api.cropPages(document.file_id, targets, cropMargins);
      applyDocUpdate(cropped, `Cropped margins on ${targets.length} page(s).`);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Crop Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-bg select-none">
      {/* 1. Top Navigation Bar */}
      <header className="h-14 border-b border-studio-border bg-white flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={closeDocument}
            className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-studio-navy transition-colors text-xs font-medium"
            title="Return to Document Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <div className="h-5 w-[1px] bg-studio-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => setActiveModule('edit')}
          >
            Back to Document
          </Button>

          <div className="h-5 w-[1px] bg-studio-border mx-1" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-studio-navy max-w-[240px] truncate">
              {document.filename}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
              {document.page_count} pages
            </span>
          </div>
        </div>

        {/* Undo / Redo / Reset / Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-studio-border rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={undoOrganise}
              disabled={organiseHistory.length === 0}
              className="p-1.5 rounded text-slate-600 hover:text-studio-navy hover:bg-white disabled:opacity-30 transition-colors"
              title="Undo Organise Action"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redoOrganise}
              disabled={organiseFuture.length === 0}
              className="p-1.5 rounded text-slate-600 hover:text-studio-navy hover:bg-white disabled:opacity-30 transition-colors"
              title="Redo Organise Action"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={resetOrganise}
            disabled={!hasUnsavedChanges && organiseHistory.length === 0}
            title="Reset to Original Document"
          >
            Reset
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => api.downloadDocument(document.file_id, document.filename)}
          >
            Export PDF
          </Button>
        </div>
      </header>

      {/* 2. Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Organise Tools Navigation */}
        <aside className="w-56 border-r border-studio-border bg-white flex flex-col p-3 z-10 flex-shrink-0">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 py-1.5">
            Organise Tools (9)
          </span>

          <nav className="flex flex-col gap-1 mt-1 flex-1 overflow-y-auto">
            {TOOLS.map((t) => {
              const isActive = organiseTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setOrganiseTool(t.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                    isActive
                      ? 'bg-studio-primary text-white font-semibold shadow-subtle'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-studio-navy'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Privacy badge */}
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200/60 mt-auto">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Offline Processing</span>
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              Original file is always preserved on disk.
            </p>
          </div>
        </aside>

        {/* Central Workspace: Selection Bar + PageGrid */}
        <div className="flex-1 flex flex-col overflow-hidden bg-studio-bg">
          {/* Quick Selection & Sequence Bar */}
          <div className="h-11 bg-white border-b border-studio-border px-6 flex items-center justify-between text-xs z-10">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                {selectedPages.length} of {document.page_count} selected
              </span>

              <div className="h-4 w-[1px] bg-studio-border mx-1" />

              <button
                onClick={selectAllPages}
                className="px-2 py-1 rounded text-studio-primary hover:bg-blue-50 font-medium transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearPageSelection}
                className="px-2 py-1 rounded text-slate-500 hover:bg-slate-100 font-medium transition-colors"
              >
                Deselect
              </button>
            </div>

            {/* Shift actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleShiftSelected('left')}
                disabled={selectedPages.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-studio-border rounded-md hover:bg-slate-100 disabled:opacity-40 font-medium text-slate-600 transition-colors"
                title="Shift Selected Page Left"
              >
                <MoveLeft className="w-3 h-3" />
                <span>Move Left</span>
              </button>
              <button
                onClick={() => handleShiftSelected('right')}
                disabled={selectedPages.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-studio-border rounded-md hover:bg-slate-100 disabled:opacity-40 font-medium text-slate-600 transition-colors"
                title="Shift Selected Page Right"
              >
                <span>Move Right</span>
                <MoveRight className="w-3 h-3" />
              </button>
              <button
                onClick={handleReverseOrder}
                className="px-2.5 py-1 bg-slate-50 border border-studio-border rounded-md hover:bg-slate-100 font-medium text-slate-600 transition-colors"
                title="Reverse Complete Page Sequence"
              >
                Reverse Order
              </button>
            </div>
          </div>

          {/* Thumbnail Grid */}
          <PageGrid
            onReorderPages={handleReorder}
            onQuickRotate={(p) => {
              setSelectedPages([p]);
              setOrganiseTool('rotate');
              handleRotate(90);
            }}
            onQuickDuplicate={(p) => {
              setSelectedPages([p]);
              setOrganiseTool('duplicate');
            }}
            onQuickDelete={(p) => {
              setSelectedPages([p]);
              setOrganiseTool('delete');
              setDeleteConfirmOpen(true);
            }}
          />
        </div>

        {/* Right Properties Inspector: Contextual Tool Controls */}
        <aside className="w-72 border-l border-studio-border bg-white flex flex-col justify-between p-5 select-none z-10 flex-shrink-0 overflow-y-auto">
          <div className="space-y-6">
            <div className="border-b border-studio-border pb-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                Tool Controls
              </span>
              <h3 className="text-base font-bold text-studio-navy capitalize mt-0.5">
                {organiseTool.replace('-', ' ')}
              </h3>
            </div>

            {/* ================= PANEL 1: MERGE ================= */}
            {organiseTool === 'merge' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500 leading-relaxed">
                  Combine external PDF documents with the current document in sequential order.
                </p>

                <input
                  type="file"
                  ref={mergeFileInputRef}
                  onChange={handleAddMergeFile}
                  multiple
                  accept="application/pdf"
                  className="hidden"
                />

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Upload className="w-3.5 h-3.5" />}
                  onClick={() => mergeFileInputRef.current?.click()}
                  className="w-full"
                  disabled={isProcessing}
                >
                  Add PDF Documents
                </Button>

                {mergeFiles.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-semibold text-slate-700">Documents to append:</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {mergeFiles.map((f, i) => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="truncate max-w-[140px] font-medium text-slate-800">{f.name}</span>
                          <span className="text-[10px] text-slate-400">{f.pages}p</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="md"
                  icon={<Layers className="w-4 h-4" />}
                  onClick={handleExecuteMerge}
                  disabled={mergeFiles.length === 0 || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? 'Merging...' : `Merge ${mergeFiles.length + 1} Documents`}
                </Button>
              </div>
            )}

            {/* ================= PANEL 2: SPLIT ================= */}
            {organiseTool === 'split' && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Split Mode</label>
                  <select
                    value={splitMode}
                    onChange={(e: any) => setSplitMode(e.target.value)}
                    className="w-full bg-slate-50 border border-studio-border rounded-lg p-2 text-slate-700"
                  >
                    <option value="ranges">Custom Page Ranges</option>
                    <option value="all_pages">Every Page into Separate PDF</option>
                    <option value="after_pages">Split After Page Break</option>
                  </select>
                </div>

                {splitMode === 'ranges' && (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Ranges (comma separated)</label>
                    <input
                      type="text"
                      value={splitRangesInput}
                      onChange={(e) => setSplitRangesInput(e.target.value)}
                      placeholder="e.g. 1-2, 3-5"
                      className="w-full bg-slate-50 border border-studio-border rounded-lg p-2 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Creates separate documents for each range.</p>
                  </div>
                )}

                {splitMode === 'after_pages' && (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Split After Page Number</label>
                    <input
                      type="text"
                      value={splitAfterInput}
                      onChange={(e) => setSplitAfterInput(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full bg-slate-50 border border-studio-border rounded-lg p-2 font-mono"
                    />
                  </div>
                )}

                <Button
                  variant="primary"
                  size="md"
                  icon={<Scissors className="w-4 h-4" />}
                  onClick={handleExecuteSplit}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? 'Splitting...' : 'Execute Split'}
                </Button>
              </div>
            )}

            {/* ================= PANEL 3: REORDER ================= */}
            {organiseTool === 'reorder' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Drag and drop thumbnails in the central grid to reorder, or use the sequence shortcuts below.
                </p>

                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleShiftSelected('left')}
                    className="w-full"
                    disabled={selectedPages.length === 0}
                  >
                    Move Selected Page Earlier
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleShiftSelected('right')}
                    className="w-full"
                    disabled={selectedPages.length === 0}
                  >
                    Move Selected Page Later
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReverseOrder}
                    className="w-full"
                  >
                    Invert Complete Sequence
                  </Button>
                </div>
              </div>
            )}

            {/* ================= PANEL 4: ROTATE ================= */}
            {organiseTool === 'rotate' && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Apply To</label>
                  <select
                    value={rotateScope}
                    onChange={(e: any) => setRotateScope(e.target.value)}
                    className="w-full bg-slate-50 border border-studio-border rounded-lg p-2 text-slate-700"
                  >
                    <option value="selected">Selected Pages ({selectedPages.length})</option>
                    <option value="all">All Pages ({document.page_count})</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCw className="w-3.5 h-3.5" />}
                    onClick={() => handleRotate(90)}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    Rotate 90° Clockwise
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCw className="w-3.5 h-3.5" />}
                    onClick={() => handleRotate(180)}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    Rotate 180° Inverted
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCw className="w-3.5 h-3.5" />}
                    onClick={() => handleRotate(270)}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    Rotate 270° Counter-Clockwise
                  </Button>
                </div>
              </div>
            )}

            {/* ================= PANEL 5: DELETE ================= */}
            {organiseTool === 'delete' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Permanently remove selected pages from this document. Original file remains untouched.
                </p>

                <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-800">
                  <p className="font-semibold">Target Pages for Deletion:</p>
                  <p className="mt-1 font-mono text-[11px]">
                    {selectedPages.length > 0 ? selectedPages.join(', ') : 'None selected'}
                  </p>
                  <p className="text-[10px] mt-1 text-red-600">
                    Remaining after delete: {document.page_count - selectedPages.length} pages
                  </p>
                </div>

                <Button
                  variant="danger"
                  size="md"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={selectedPages.length === 0 || selectedPages.length >= document.page_count}
                  className="w-full"
                >
                  Delete Selected Pages
                </Button>
              </div>
            )}

            {/* ================= PANEL 6: DUPLICATE ================= */}
            {organiseTool === 'duplicate' && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Copies to Create</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={duplicateCount}
                    onChange={(e) => setDuplicateCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-50 border border-studio-border rounded-lg p-2 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Copies will be inserted immediately after source page.</p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Copy className="w-4 h-4" />}
                  onClick={handleDuplicate}
                  disabled={selectedPages.length === 0 || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? 'Duplicating...' : `Duplicate ${selectedPages.length} Page(s)`}
                </Button>
              </div>
            )}

            {/* ================= PANEL 7: EXTRACT ================= */}
            {organiseTool === 'extract' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Export selected pages into a standalone new PDF document without modifying the current file.
                </p>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-900">
                  <span className="font-semibold">Selected Pages to Extract:</span>
                  <p className="font-mono mt-1 text-[11px]">{selectedPages.join(', ')}</p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={<ExternalLink className="w-4 h-4" />}
                  onClick={handleExtract}
                  disabled={selectedPages.length === 0 || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? 'Extracting...' : `Extract & Download ${selectedPages.length} Page(s)`}
                </Button>
              </div>
            )}

            {/* ================= PANEL 8: INSERT BLANK ================= */}
            {organiseTool === 'insert-blank' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Position Relative to Page {activePageNum}</label>
                  <select
                    value={blankPosition}
                    onChange={(e: any) => setBlankPosition(e.target.value)}
                    className="w-full bg-slate-50 border border-studio-border rounded-lg p-1.5"
                  >
                    <option value="after">Insert After Page {activePageNum}</option>
                    <option value="before">Insert Before Page {activePageNum}</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Paper Size</label>
                    <select
                      value={blankPaperSize}
                      onChange={(e: any) => setBlankPaperSize(e.target.value)}
                      className="w-full bg-slate-50 border border-studio-border rounded-lg p-1.5"
                    >
                      <option value="A4">A4 (595x842)</option>
                      <option value="Letter">Letter (612x792)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Orientation</label>
                    <select
                      value={blankOrientation}
                      onChange={(e: any) => setBlankOrientation(e.target.value)}
                      className="w-full bg-slate-50 border border-studio-border rounded-lg p-1.5"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Number of Blank Pages</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={blankCount}
                    onChange={(e) => setBlankCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-50 border border-studio-border rounded-lg p-1.5 font-mono"
                  />
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={<PlusSquare className="w-4 h-4" />}
                  onClick={handleInsertBlank}
                  disabled={isProcessing}
                  className="w-full mt-2"
                >
                  {isProcessing ? 'Inserting...' : 'Insert Blank Canvas'}
                </Button>
              </div>
            )}

            {/* ================= PANEL 9: CROP ================= */}
            {organiseTool === 'crop' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Apply Crop To</label>
                  <select
                    value={cropScope}
                    onChange={(e: any) => setCropScope(e.target.value)}
                    className="w-full bg-slate-50 border border-studio-border rounded-lg p-1.5"
                  >
                    <option value="selected">Selected Pages ({selectedPages.length})</option>
                    <option value="all">All Pages ({document.page_count})</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <label className="text-[10px] text-slate-500 font-sans">Left (pt)</label>
                    <input
                      type="number"
                      min={0}
                      value={cropMargins.left}
                      onChange={(e) => setCropMargins({ ...cropMargins, left: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-slate-50 border border-studio-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-sans">Right (pt)</label>
                    <input
                      type="number"
                      min={0}
                      value={cropMargins.right}
                      onChange={(e) => setCropMargins({ ...cropMargins, right: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-slate-50 border border-studio-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-sans">Top (pt)</label>
                    <input
                      type="number"
                      min={0}
                      value={cropMargins.top}
                      onChange={(e) => setCropMargins({ ...cropMargins, top: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-slate-50 border border-studio-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-sans">Bottom (pt)</label>
                    <input
                      type="number"
                      min={0}
                      value={cropMargins.bottom}
                      onChange={(e) => setCropMargins({ ...cropMargins, bottom: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-slate-50 border border-studio-border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setCropMargins({ left: 20, top: 20, right: 20, bottom: 20 })}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                  >
                    20pt Margin
                  </button>
                  <button
                    onClick={() => setCropMargins({ left: 36, top: 36, right: 36, bottom: 36 })}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                  >
                    0.5" Trim
                  </button>
                  <button
                    onClick={() => setCropMargins({ left: 0, top: 0, right: 0, bottom: 0 })}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700 ml-auto"
                  >
                    Reset
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Crop className="w-4 h-4" />}
                  onClick={handleCrop}
                  disabled={isProcessing}
                  className="w-full mt-2"
                >
                  {isProcessing ? 'Cropping...' : 'Apply Crop Box'}
                </Button>
              </div>
            )}

            {/* Selected Page Metadata Card */}
            <div className="border-t border-studio-border pt-4 text-xs space-y-2 text-slate-500">
              <span className="font-bold text-slate-700 text-xs">Page Properties</span>
              <div className="flex justify-between">
                <span>Page number:</span>
                <span className="font-semibold text-studio-navy">Page {activePageNum}</span>
              </div>
              <div className="flex justify-between">
                <span>Dimensions:</span>
                <span className="font-semibold text-studio-navy">
                  {activePageInfo ? formatPageDimensions(activePageInfo.width, activePageInfo.height) : 'A4'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rotation:</span>
                <span className="font-semibold text-studio-navy">{activePageInfo?.rotation || 0}°</span>
              </div>
            </div>
          </div>

          {/* Bottom Processing Indicator */}
          {isProcessing && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-studio-primary font-semibold">
              <div className="w-4 h-4 border-2 border-studio-primary border-t-transparent rounded-full animate-spin" />
              <span>Processing PDF mutation...</span>
            </div>
          )}
        </aside>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Confirm Page Deletion"
        subtitle="This action removes the selected pages from your working document."
      >
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            Are you sure you want to delete <strong className="text-studio-danger">{selectedPages.length} page(s)</strong> (Pages: {selectedPages.join(', ')})?
          </p>
          <p className="text-xs text-slate-400">
            The original PDF on disk will NOT be overwritten. You can also Undo this action.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete Pages
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
