import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Layers,
  Edit3,
  Stamp,
  ArrowLeftRight,
  Minimize2,
  GitCompare,
  ShieldCheck,
  Settings,
  Sparkles,
  Clock,
  Trash2,
  CloudOff,
  Wrench,
  Loader2,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useFinishStore } from '../../state/useFinishStore';
import { ToolModule } from '../../types/document';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { formatBytes } from '../../utils/format';

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const gridItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

interface QuickTool {
  id: string;
  icon: React.ReactNode;
  tint: string;
  title: string;
  desc: string;
  onClick: () => void;
}

export const DocumentHome: React.FC = () => {
  const {
    setDocument,
    recentDocuments,
    clearRecentDocuments,
    setIsSettingsOpen,
    setActiveModule,
    addToast,
  } = useDocumentStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({
        type: 'error',
        title: 'Unsupported File Format',
        message: 'Please select a valid PDF file.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const docInfo = await api.uploadDocument(file);
      setDocument(docInfo);
      addToast({
        type: 'success',
        title: 'Document Opened',
        message: `Loaded ${docInfo.filename} (${docInfo.page_count} pages).`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Could Not Open PDF',
        message: err.message || 'The PDF file could not be parsed.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = async (pages: number = 50, targetModule?: ToolModule) => {
    setIsLoading(true);
    try {
      const docInfo = await api.createSampleDocument(pages);
      setDocument(docInfo);
      if (targetModule) {
        setActiveModule(targetModule);
      }
      addToast({
        type: 'success',
        title: 'Sample PDF Loaded',
        message: `Loaded synthetic ${docInfo.page_count}-page document for testing.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sample Generation Failed',
        message: err.message || 'Make sure the local Python backend is running.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRecent = async (fileId: string) => {
    setIsLoading(true);
    try {
      const docInfo = await api.getDocumentInfo(fileId);
      setDocument(docInfo);
      addToast({
        type: 'success',
        title: 'Document Reopened',
        message: `Loaded ${docInfo.filename}.`,
      });
    } catch {
      addToast({
        type: 'warning',
        title: 'File Session Expired',
        message: 'This session file is no longer available in the local cache. Please reopen the original PDF.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickTools: QuickTool[] = [
    {
      id: 'organise',
      icon: <Layers className="w-5 h-5" />,
      tint: 'bg-indigo-50 text-indigo-600',
      title: 'Organise Pages',
      desc: 'Merge, split, reorder, rotate, delete, duplicate, and crop pages.',
      onClick: () => handleLoadSample(5, 'organise'),
    },
    {
      id: 'edit',
      icon: <Edit3 className="w-5 h-5" />,
      tint: 'bg-blue-50 text-studio-primary',
      title: 'Edit & Redact',
      desc: 'Add text, images, shapes, freehand drawing, highlights, signatures, whiteout, and secure redaction.',
      onClick: () => handleLoadSample(5, 'edit'),
    },
    {
      id: 'stamp',
      icon: <Stamp className="w-5 h-5" />,
      tint: 'bg-amber-50 text-amber-600',
      title: 'Stamp & Number',
      desc: 'Watermarks, 6-position page numbering, 3-column headers & footers, and official date stamps.',
      onClick: () => handleLoadSample(5, 'stamp'),
    },
    {
      id: 'convert',
      icon: <ArrowLeftRight className="w-5 h-5" />,
      tint: 'bg-cyan-50 text-cyan-600',
      title: 'Convert & Extract',
      desc: 'Images to PDF compilation, high-DPI PDF to PNG/JPEG rasterization, and structured text extraction.',
      onClick: () => handleLoadSample(5, 'convert'),
    },
    {
      id: 'compress',
      icon: <Minimize2 className="w-5 h-5" />,
      tint: 'bg-emerald-50 text-emerald-600',
      title: 'Compress PDF',
      desc: 'Reduce PDF file size with configurable quality levels offline.',
      onClick: () => {
        useFinishStore.getState().setActiveSubTool('compress');
        handleLoadSample(5, 'finish');
      },
    },
    {
      id: 'compare',
      icon: <GitCompare className="w-5 h-5" />,
      tint: 'bg-violet-50 text-violet-600',
      title: 'Compare PDFs',
      desc: 'Inspect differences between two document versions side by side.',
      onClick: () => {
        useFinishStore.getState().setActiveSubTool('compare');
        handleLoadSample(5, 'finish');
      },
    },
  ];

  return (
    <div className="min-h-screen aurora-bg flex flex-col justify-between selection:bg-studio-primary/20 relative overflow-hidden">
      {/* Aurora gradient blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="aurora-blob aurora-blob-1 w-96 h-96 -top-24 -left-16" />
        <div className="aurora-blob aurora-blob-2 w-80 h-80 top-10 right-[-4rem]" />
        <div className="aurora-blob aurora-blob-3 w-72 h-72 bottom-0 left-1/3" />
      </div>

      {/* Top Navbar */}
      <header className="relative h-16 border-b border-studio-border glass-header px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-studio-primary via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-glow-soft">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-studio-navy">PDF</span>
              <span className="font-light text-base tracking-tight text-studio-muted">STUDIO</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Your documents. Your control. Always offline.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Offline local indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-full text-emerald-800 text-xs font-semibold shadow-subtle">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-soft-pulse" />
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% OFFLINE & LOCAL</span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-500 hover:text-studio-navy hover:bg-slate-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative max-w-5xl mx-auto px-6 py-10 w-full flex-1 flex flex-col gap-10 z-10">
        {/* Hero Section */}
        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="text-center max-w-2xl mx-auto relative"
        >
          {/* Floating mini PDF cards */}
          <div
            className="hidden lg:flex absolute -left-44 top-2 w-24 rounded-xl glass-card p-3 animate-float-y"
            style={{ '--float-rot': '-6deg', animationDelay: '0.4s' } as React.CSSProperties}
            aria-hidden="true"
          >
            <div className="w-full">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-studio-primary" />
                <span className="text-[9px] font-semibold text-slate-500">Report.pdf</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 rounded bg-slate-200 w-full" />
                <div className="h-1.5 rounded bg-slate-200 w-4/5" />
                <div className="h-1.5 rounded bg-blue-200 w-3/5" />
              </div>
            </div>
          </div>
          <div
            className="hidden lg:flex absolute -right-44 top-10 w-24 rounded-xl glass-card p-3 animate-float-y"
            style={{ '--float-rot': '5deg', animationDelay: '1.2s' } as React.CSSProperties}
            aria-hidden="true"
          >
            <div className="w-full">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[9px] font-semibold text-slate-500">Signed.pdf</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 rounded bg-slate-200 w-3/4" />
                <div className="h-1.5 rounded bg-emerald-200 w-full" />
                <div className="h-1.5 rounded bg-slate-200 w-2/3" />
              </div>
            </div>
          </div>

          <motion.div variants={heroItem}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-studio-border text-[11px] font-semibold text-studio-primary shadow-subtle">
              <Sparkles className="w-3 h-3" />
              29 professional tools · zero uploads
            </span>
          </motion.div>
          <motion.h1
            variants={heroItem}
            className="mt-4 text-3xl font-extrabold text-studio-navy tracking-tight sm:text-4xl"
          >
            Professional PDF workspace{' '}
            <span className="bg-gradient-to-r from-studio-primary via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              on your device
            </span>
          </motion.h1>
          <motion.p variants={heroItem} className="mt-3 text-sm text-slate-600">
            Open, organise, edit, redact, stamp, convert, compress, and compare PDF files privately. No uploads, no cloud, no internet required.
          </motion.p>

          {/* Stats strip */}
          <motion.div
            variants={heroItem}
            className="mt-5 flex items-center justify-center gap-2 sm:gap-3"
          >
            {[
              { icon: <Wrench className="w-3.5 h-3.5 text-studio-primary" />, label: '29 tools' },
              { icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />, label: '100% offline' },
              { icon: <CloudOff className="w-3.5 h-3.5 text-slate-500" />, label: '0 uploads' },
            ].map((stat) => (
              <span
                key={stat.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs font-semibold text-slate-600"
              >
                {stat.icon}
                {stat.label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Drag and Drop Target */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer glass-card ${
            isDragging
              ? 'border-studio-primary shadow-glow scale-[1.01]'
              : 'border-studio-border hover:border-studio-primary/60 hover:shadow-lift'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            accept="application/pdf"
            className="hidden"
          />

          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-subtle transition-all ${
              isDragging ? 'bg-studio-primary text-white scale-110 rotate-3' : 'bg-blue-50 text-studio-primary'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>

          <h3 className="text-base font-semibold text-studio-navy">
            {isLoading ? 'Processing document locally...' : isDragging ? 'Release to open your PDF' : 'Drop your PDF here, or click to browse'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Supports standard PDF documents up to large multi-page reports.
          </p>

          {/* Loading skeleton while a file processes */}
          {isLoading && (
            <div className="mt-6 max-w-sm mx-auto space-y-2" aria-hidden="true">
              <div className="h-2.5 rounded-full shimmer w-full" />
              <div className="h-2.5 rounded-full shimmer w-4/5 mx-auto" />
              <div className="h-2.5 rounded-full shimmer w-3/5 mx-auto" />
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              icon={<FileText className="w-4 h-4" />}
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Open PDF Document
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={<Sparkles className="w-4 h-4 text-studio-primary" />}
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSample(50);
              }}
            >
              Open 50-Page Sample PDF
            </Button>
          </div>
        </motion.div>

        {/* Quick Tools Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quick PDF Tools
            </h2>
            <span className="text-[11px] text-slate-400">Press ⌘K anywhere to search all 29 tools</span>
          </div>

          <motion.div
            variants={gridContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {quickTools.map((tool) => (
              <motion.div
                key={tool.id}
                variants={gridItem}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={tool.onClick}
                className="p-4 bg-white/90 backdrop-blur rounded-xl border border-studio-border hover:border-studio-primary/60 hover:shadow-lift transition-shadow cursor-pointer group"
              >
                <div
                  className={`w-9 h-9 rounded-lg ${tool.tint} flex items-center justify-center mb-3 shadow-subtle transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                >
                  {tool.icon}
                </div>
                <h3 className="text-sm font-semibold text-studio-navy group-hover:text-studio-primary transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{tool.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Recently Opened Documents */}
        {recentDocuments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white/90 backdrop-blur rounded-xl border border-studio-border p-5 shadow-subtle"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recently Opened Documents
                </h3>
              </div>
              <button
                onClick={clearRecentDocuments}
                className="text-xs text-slate-400 hover:text-studio-danger transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Recent</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentDocuments.map((doc) => (
                <div
                  key={doc.file_id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-studio-primary flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-studio-navy">{doc.filename}</p>
                      <p className="text-xs text-slate-400">
                        {doc.page_count} pages · {formatBytes(doc.size_bytes)} · Last opened {doc.last_opened}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenRecent(doc.file_id)}
                  >
                    Open
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer info */}
      <footer className="relative border-t border-studio-border glass-header py-4 px-8 text-center text-xs text-slate-400 z-10">
        <p>PDF Studio · Project 1 of BSERC GenAI Internship (Week 2) · 100% Offline Local Architecture · v1.0.3</p>
      </footer>
    </div>
  );
};
