import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Layers,
  Edit3,
  Stamp,
  ArrowLeftRight,
  CheckCircle2,
  CornerUpLeft,
  Scissors,
  ArrowUpDown,
  RotateCw,
  Trash2,
  FileOutput,
  Copy,
  FilePlus2,
  Crop,
  Type,
  Image as ImageIcon,
  Highlighter,
  PenTool,
  Square,
  EyeOff,
  ShieldAlert,
  PenLine,
  FileSpreadsheet,
  Hash,
  PanelTop,
  CalendarDays,
  Images,
  ImageDown,
  FileText,
  Minimize2,
  Tags,
  Eraser,
  GitCompare,
  Combine,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useStampConvertStore, StampConvertTool } from '../../state/useStampConvertStore';
import { useFinishStore } from '../../state/useFinishStore';
import { ActiveTool, OrganiseTool, ToolModule } from '../../types/document';
import { FinishSubTool } from '../../types/finish';

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  keywords: string;
  module: ToolModule;
  icon: React.ReactNode;
  editTool?: ActiveTool;
  organiseTool?: OrganiseTool;
  stampConvertTool?: StampConvertTool;
  finishTool?: FinishSubTool;
}

interface PaletteGroup {
  module: ToolModule;
  label: string;
  icon: React.ReactNode;
  items: PaletteItem[];
}

const iconCls = 'w-4 h-4';

const GROUPS: PaletteGroup[] = [
  {
    module: 'organise',
    label: 'Organise',
    icon: <Layers className={iconCls} />,
    items: [
      { id: 'merge', label: 'Merge PDFs', description: 'Combine multiple PDFs into one document', keywords: 'merge combine join append', module: 'organise', icon: <Combine className={iconCls} />, organiseTool: 'merge' },
      { id: 'split', label: 'Split PDF', description: 'Split a PDF into separate documents', keywords: 'split divide separate', module: 'organise', icon: <Scissors className={iconCls} />, organiseTool: 'split' },
      { id: 'reorder', label: 'Reorder Pages', description: 'Drag pages into a new order', keywords: 'reorder rearrange move pages', module: 'organise', icon: <ArrowUpDown className={iconCls} />, organiseTool: 'reorder' },
      { id: 'rotate', label: 'Rotate Pages', description: 'Rotate pages 90° clockwise or counter-clockwise', keywords: 'rotate turn orientation', module: 'organise', icon: <RotateCw className={iconCls} />, organiseTool: 'rotate' },
      { id: 'delete', label: 'Delete Pages', description: 'Remove selected pages permanently', keywords: 'delete remove pages', module: 'organise', icon: <Trash2 className={iconCls} />, organiseTool: 'delete' },
      { id: 'extract', label: 'Extract Pages', description: 'Save selected pages as a new PDF', keywords: 'extract pull out pages', module: 'organise', icon: <FileOutput className={iconCls} />, organiseTool: 'extract' },
      { id: 'duplicate', label: 'Duplicate Pages', description: 'Copy selected pages inside the document', keywords: 'duplicate copy clone pages', module: 'organise', icon: <Copy className={iconCls} />, organiseTool: 'duplicate' },
      { id: 'insert-blank', label: 'Insert Blank Pages', description: 'Add empty pages anywhere in the document', keywords: 'insert blank empty add pages', module: 'organise', icon: <FilePlus2 className={iconCls} />, organiseTool: 'insert-blank' },
      { id: 'crop', label: 'Crop Pages', description: 'Trim page margins and visible area', keywords: 'crop trim margins', module: 'organise', icon: <Crop className={iconCls} />, organiseTool: 'crop' },
    ],
  },
  {
    module: 'edit',
    label: 'Edit',
    icon: <Edit3 className={iconCls} />,
    items: [
      { id: 'text', label: 'Add Text', description: 'Place editable text on any page', keywords: 'text type write annotate', module: 'edit', icon: <Type className={iconCls} />, editTool: 'text' },
      { id: 'image', label: 'Add Images', description: 'Insert images onto pages', keywords: 'image picture photo insert', module: 'edit', icon: <ImageIcon className={iconCls} />, editTool: 'image' },
      { id: 'highlight', label: 'Highlight', description: 'Highlight text with a marker colour', keywords: 'highlight marker', module: 'edit', icon: <Highlighter className={iconCls} />, editTool: 'highlight' },
      { id: 'draw', label: 'Freehand Draw', description: 'Draw freehand strokes on the page', keywords: 'draw freehand pen sketch', module: 'edit', icon: <PenTool className={iconCls} />, editTool: 'draw' },
      { id: 'shapes', label: 'Geometric Shapes', description: 'Rectangles, circles, lines and arrows', keywords: 'shapes rectangle circle line', module: 'edit', icon: <Square className={iconCls} />, editTool: 'shapes' },
      { id: 'whiteout', label: 'Whiteout / Mask', description: 'Cover content with an opaque mask', keywords: 'whiteout mask cover hide', module: 'edit', icon: <EyeOff className={iconCls} />, editTool: 'whiteout' },
      { id: 'redact', label: 'Secure Redaction', description: 'Permanently remove text and content', keywords: 'redact remove black out sensitive', module: 'edit', icon: <ShieldAlert className={iconCls} />, editTool: 'redact' },
      { id: 'sign', label: 'Digital Signatures', description: 'Draw or place a signature', keywords: 'sign signature', module: 'edit', icon: <PenLine className={iconCls} />, editTool: 'sign' },
      { id: 'form', label: 'PDF Form Filling', description: 'Fill in interactive form fields', keywords: 'form fill fields', module: 'edit', icon: <FileSpreadsheet className={iconCls} />, editTool: 'form' },
    ],
  },
  {
    module: 'stamp',
    label: 'Stamp',
    icon: <Stamp className={iconCls} />,
    items: [
      { id: 'watermark', label: 'Watermarks', description: 'Text or image watermark on every page', keywords: 'watermark stamp confidential draft', module: 'stamp', icon: <Stamp className={iconCls} />, stampConvertTool: 'watermark' },
      { id: 'page-numbers', label: 'Page Numbers', description: 'Number pages in 6 positions, 4 formats', keywords: 'page numbers pagination', module: 'stamp', icon: <Hash className={iconCls} />, stampConvertTool: 'page-numbers' },
      { id: 'header-footer', label: 'Headers & Footers', description: '3-column headers and footers', keywords: 'header footer', module: 'stamp', icon: <PanelTop className={iconCls} />, stampConvertTool: 'header-footer' },
      { id: 'date-stamp', label: 'Date Stamps', description: 'Stamp the current or a custom date', keywords: 'date stamp time', module: 'stamp', icon: <CalendarDays className={iconCls} />, stampConvertTool: 'date-stamp' },
    ],
  },
  {
    module: 'convert',
    label: 'Convert',
    icon: <ArrowLeftRight className={iconCls} />,
    items: [
      { id: 'images-to-pdf', label: 'Images to PDF', description: 'Compile images into a PDF document', keywords: 'images to pdf jpg png compile', module: 'convert', icon: <Images className={iconCls} />, stampConvertTool: 'images-to-pdf' },
      { id: 'pdf-to-images', label: 'PDF to Images', description: 'Rasterize pages to PNG or JPEG', keywords: 'pdf to images png jpeg export', module: 'convert', icon: <ImageDown className={iconCls} />, stampConvertTool: 'pdf-to-images' },
      { id: 'pdf-to-text', label: 'PDF to Text', description: 'Extract structured text from the PDF', keywords: 'pdf to text extract words', module: 'convert', icon: <FileText className={iconCls} />, stampConvertTool: 'pdf-to-text' },
    ],
  },
  {
    module: 'finish',
    label: 'Finish',
    icon: <CheckCircle2 className={iconCls} />,
    items: [
      { id: 'compress', label: 'PDF Compression', description: 'Reduce file size with quality presets', keywords: 'compress shrink size optimize', module: 'finish', icon: <Minimize2 className={iconCls} />, finishTool: 'compress' },
      { id: 'edit-metadata', label: 'Edit Metadata', description: 'Edit title, author, subject and more', keywords: 'metadata edit title author properties', module: 'finish', icon: <Tags className={iconCls} />, finishTool: 'edit-metadata' },
      { id: 'remove-metadata', label: 'Remove Metadata', description: 'Deep-clean metadata for privacy', keywords: 'remove metadata clean privacy purge', module: 'finish', icon: <Eraser className={iconCls} />, finishTool: 'remove-metadata' },
      { id: 'compare', label: 'Compare PDFs', description: 'Inspect differences between two versions', keywords: 'compare diff versions changes', module: 'finish', icon: <GitCompare className={iconCls} />, finishTool: 'compare' },
    ],
  },
];

const MODULE_TINT: Record<ToolModule, string> = {
  organise: 'bg-indigo-50 text-indigo-600',
  edit: 'bg-blue-50 text-studio-primary',
  stamp: 'bg-amber-50 text-amber-600',
  convert: 'bg-cyan-50 text-cyan-600',
  finish: 'bg-emerald-50 text-emerald-600',
};

export const CommandPalette: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery, document, setActiveModule, setActiveTool, setOrganiseTool, addToast } =
    useDocumentStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.keywords.toLowerCase().includes(q) ||
          g.label.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [searchQuery]);

  const flatItems = useMemo(() => filteredGroups.flatMap((g) => g.items), [filteredGroups]);

  // Keep the highlighted row in range when the filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  // Global ⌘K / Ctrl+K toggle + Esc to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(!useDocumentStore.getState().isSearchOpen);
      } else if (e.key === 'Escape' && useDocumentStore.getState().isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setIsSearchOpen]);

  // Focus the input whenever the palette opens; clear the query on close
  useEffect(() => {
    if (isSearchOpen) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
    setSearchQuery('');
    setActiveIndex(0);
  }, [isSearchOpen, setSearchQuery]);

  // Scroll the highlighted row into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-palette-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const runItem = (item: PaletteItem) => {
    if (!document) {
      addToast({
        type: 'info',
        title: 'Open a PDF First',
        message: 'Tools need an open document. Drop a PDF on the home screen or open the sample.',
      });
      setIsSearchOpen(false);
      return;
    }
    if (item.module === 'organise' && item.organiseTool) {
      setOrganiseTool(item.organiseTool);
      setActiveModule('organise');
    } else if (item.module === 'edit' && item.editTool) {
      setActiveTool(item.editTool);
      setActiveModule('edit');
    } else if ((item.module === 'stamp' || item.module === 'convert') && item.stampConvertTool) {
      useStampConvertStore.getState().setActiveSubTool(item.stampConvertTool);
      setActiveModule(item.module);
    } else if (item.module === 'finish' && item.finishTool) {
      useFinishStore.getState().setActiveSubTool(item.finishTool);
      setActiveModule('finish');
    }
    setIsSearchOpen(false);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) runItem(item);
    }
  };

  // Flat index counter across groups, for highlight + scroll
  let runningIndex = -1;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-studio-navy/40 backdrop-blur-[2px]"
            onClick={() => setIsSearchOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search tools and commands"
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-popover border border-studio-border overflow-hidden"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-studio-border">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search 29 tools… (try “compress”, “redact”, “watermark”)"
                className="flex-1 text-sm text-studio-navy placeholder:text-slate-400 bg-transparent focus:outline-none"
                aria-label="Search tools"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2" role="listbox" aria-label="Tools">
              {!document && (
                <p className="px-4 pt-2 pb-1 text-[11px] text-amber-700 bg-amber-50/70 mx-3 mt-1 rounded-md">
                  No document open yet — picking a tool will ask you to open a PDF first.
                </p>
              )}
              {flatItems.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-studio-navy">No tools match “{searchQuery}”</p>
                  <p className="text-xs text-slate-400 mt-1">Try “merge”, “sign”, “compress” or “compare”.</p>
                </div>
              )}
              {filteredGroups.map((group) => (
                <div key={group.module}>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center ${MODULE_TINT[group.module]}`}>
                      {group.icon}
                    </span>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                      {group.label} · {group.items.length}
                    </span>
                  </div>
                  {group.items.map((item) => {
                    runningIndex += 1;
                    const idx = runningIndex;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        role="option"
                        aria-selected={isActive}
                        data-palette-index={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => runItem(item)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                          isActive ? 'bg-studio-primary/10' : 'bg-transparent'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isActive ? 'bg-white text-studio-primary shadow-subtle' : MODULE_TINT[item.module]
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-studio-navy truncate">{item.label}</span>
                          <span className="block text-xs text-slate-400 truncate">{item.description}</span>
                        </span>
                        {isActive && (
                          <CornerUpLeft className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer hints */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-studio-border bg-slate-50/70 text-[11px] text-slate-400">
              <span>29 tools · 5 modules · all offline</span>
              <span className="flex items-center gap-3">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
                <span>esc close</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
