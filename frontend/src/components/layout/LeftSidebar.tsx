import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  Edit3,
  Stamp,
  ArrowLeftRight,
  CheckCircle2,
  Lock,
  FileText,
  Loader2,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useStampConvertStore } from '../../state/useStampConvertStore';
import { useFinishStore } from '../../state/useFinishStore';
import { ToolModule } from '../../types/document';
import { api } from '../../services/api';

interface ModuleItem {
  id: ToolModule;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const MODULES: ModuleItem[] = [
  { id: 'organise', label: 'Organise', icon: <Layers className="w-4 h-4" />, description: 'Merge, split, reorder, rotate & crop pages' },
  { id: 'edit', label: 'Edit', icon: <Edit3 className="w-4 h-4" />, description: 'Text, markup, shapes, redaction & signatures' },
  { id: 'stamp', label: 'Stamp', icon: <Stamp className="w-4 h-4" />, description: 'Watermarks, page numbers & headers' },
  { id: 'convert', label: 'Convert', icon: <ArrowLeftRight className="w-4 h-4" />, description: 'Images, text & format conversions' },
  { id: 'finish', label: 'Finish', icon: <CheckCircle2 className="w-4 h-4" />, description: 'Compression, metadata & PDF comparison' },
];

export const LeftSidebar: React.FC = () => {
  const { activeModule, setActiveModule, recentDocuments, setDocument, addToast, document } = useDocumentStore();
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  // Reopen a recent document for real — same path as DocumentHome.
  const handleOpenRecent = async (fileId: string, filename: string) => {
    if (reopeningId) return;
    if (document?.file_id === fileId) {
      addToast({
        type: 'info',
        title: 'Already Open',
        message: `${filename} is the current document.`,
      });
      return;
    }
    setReopeningId(fileId);
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
      setReopeningId(null);
    }
  };

  return (
    <aside className="w-56 border-r border-studio-border bg-white/80 backdrop-blur flex flex-col justify-between select-none z-10 flex-shrink-0">
      <div className="flex flex-col p-3">
        {/* Workspace navigation heading */}
        <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 py-1.5">
          Workspace
        </span>

        {/* Modules list */}
        <nav className="flex flex-col gap-1 mt-1">
          {MODULES.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'stamp') {
                    useStampConvertStore.getState().setActiveSubTool('watermark');
                  } else if (item.id === 'convert') {
                    useStampConvertStore.getState().setActiveSubTool('images-to-pdf');
                  } else if (item.id === 'finish') {
                    // keep existing subtool or default to compress
                    if (!useFinishStore.getState().activeSubTool) {
                      useFinishStore.getState().setActiveSubTool('compress');
                    }
                  }
                  setActiveModule(item.id);
                }}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'text-studio-primary font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-studio-navy'
                }`}
                title={item.description}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-lg bg-studio-primary/10 shadow-subtle"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className={`relative ${isActive ? 'text-studio-primary' : 'text-slate-500'}`}>
                  {item.icon}
                </span>
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Recent Documents list in sidebar */}
        {recentDocuments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                Recent Documents
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {recentDocuments.slice(0, 3).map((doc) => {
                const isCurrent = document?.file_id === doc.file_id;
                const isLoading = reopeningId === doc.file_id;
                return (
                  <button
                    key={doc.file_id}
                    disabled={isLoading}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-50 text-xs transition-colors group text-left w-full disabled:opacity-60 ${
                      isCurrent ? 'bg-studio-primary/5 text-studio-primary' : 'text-slate-600'
                    }`}
                    onClick={() => handleOpenRecent(doc.file_id, doc.filename)}
                    title={isCurrent ? 'Current document' : `Reopen ${doc.filename}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-studio-primary flex-shrink-0 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 group-hover:text-studio-primary transition-colors" />
                      )}
                      <span className="truncate text-[11px]">{doc.filename}</span>
                    </span>
                    <span className="text-[9px] text-slate-400 flex-shrink-0 ml-2">
                      {isCurrent ? 'open' : `${doc.page_count}p`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Privacy card at bottom of left rail */}
      <div className="p-3 m-3 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50/60 to-blue-50/60 border border-emerald-100 shadow-subtle">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-subtle">
            <Lock className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-slate-800">Your files stay private</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Documents are processed entirely on this device. Nothing is uploaded to any server.
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
          <span className="text-[10px] font-semibold tracking-wide text-emerald-700">100% OFFLINE</span>
        </div>
      </div>
    </aside>
  );
};
