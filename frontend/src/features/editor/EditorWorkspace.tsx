import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MousePointer,
  Type,
  Image as ImageIcon,
  Highlighter,
  PenTool,
  Square,
  EyeOff,
  ShieldAlert,
  PenLine,
  FileSpreadsheet,
  Undo2,
  Redo2,
  Trash2,
  Save,
} from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { LeftSidebar } from '../../components/layout/LeftSidebar';
import { PageNavigator } from './PageNavigator';
import { PDFCanvas } from './PDFCanvas';
import { Inspector } from './Inspector';
import { BottomBar } from '../../components/layout/BottomBar';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useEditStore } from '../../state/useEditStore';
import { ActiveTool } from '../../types/document';
import { OrganiseWorkspace } from '../organise/OrganiseWorkspace';
import { StampConvertWorkspace } from '../stamp-convert/StampConvertWorkspace';
import { FinishCompareWorkspace } from '../finish/FinishCompareWorkspace';
import { EditInspector } from '../edit/EditInspector';
import { SignatureDialog } from '../edit/SignatureDialog';
import { RedactionConfirmDialog } from '../edit/RedactionConfirmDialog';
import { api } from '../../services/api';

interface ToolAction {
  id: ActiveTool;
  label: string;
  icon: React.ReactNode;
  isRedact?: boolean;
}

const TOOLS: ToolAction[] = [
  { id: 'select', label: 'Select', icon: <MousePointer className="w-3.5 h-3.5" /> },
  { id: 'text', label: 'Text', icon: <Type className="w-3.5 h-3.5" /> },
  { id: 'image', label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { id: 'highlight', label: 'Highlight', icon: <Highlighter className="w-3.5 h-3.5" /> },
  { id: 'draw', label: 'Draw', icon: <PenTool className="w-3.5 h-3.5" /> },
  { id: 'shapes', label: 'Shapes', icon: <Square className="w-3.5 h-3.5" /> },
  { id: 'whiteout', label: 'Whiteout', icon: <EyeOff className="w-3.5 h-3.5" /> },
  { id: 'redact', label: 'Redact', icon: <ShieldAlert className="w-3.5 h-3.5" />, isRedact: true },
  { id: 'sign', label: 'Sign', icon: <PenLine className="w-3.5 h-3.5" /> },
  { id: 'form', label: 'Form Fill', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
];

export const EditorWorkspace: React.FC = () => {
  const {
    document,
    currentPage,
    activeTool,
    activeModule,
    setActiveTool,
    setDocument,
    addToast,
  } = useDocumentStore();

  const {
    texts,
    images,
    highlights,
    drawings,
    shapes,
    whiteouts,
    redactions,
    signatures,
    formValues,
    flattenForms,
    undo,
    redo,
    history,
    future,
    clearAllEdits,
    isSavingEdits,
    setIsSavingEdits,
    getTotalDraftCount,
    fetchFormFields,
  } = useEditStore();

  // Auto-fetch form fields on document load or module switch (must be called unconditionally before returns)
  useEffect(() => {
    if (document?.file_id) {
      fetchFormFields(document.file_id);
    }
  }, [document?.file_id, fetchFormFields]);

  if (!document) return null;

  if (activeModule === 'organise') {
    return <OrganiseWorkspace />;
  }

  if (activeModule === 'stamp' || activeModule === 'convert') {
    return <StampConvertWorkspace />;
  }

  if (activeModule === 'finish') {
    return <FinishCompareWorkspace />;
  }

  const draftCount = getTotalDraftCount();

  const handleApplyEdits = async () => {
    if (!document) return;
    if (draftCount === 0 && Object.keys(formValues).length === 0) {
      addToast({
        type: 'info',
        title: 'No Edits to Save',
        message: 'Place annotations, drawings, or fill forms first.',
      });
      return;
    }

    setIsSavingEdits(true);
    try {
      const updatedDoc = await api.batchApplyEdits(document.file_id, {
        texts,
        images,
        highlights,
        drawings,
        shapes,
        whiteouts,
        redactions,
        signatures,
        form_fills: Object.keys(formValues).length > 0 ? formValues : undefined,
        flatten_forms: flattenForms,
      });

      setDocument(updatedDoc);
      clearAllEdits();
      addToast({
        type: 'success',
        title: 'Edits Applied Successfully',
        message: 'All edits permanently committed to the document.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Edits Failed',
        message: err.message || 'An error occurred while saving edits.',
      });
    } finally {
      setIsSavingEdits(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-bg select-none">
      {/* 1. Top Document Navigation Bar */}
      <TopBar />

      {/* 2. Secondary Contextual Canvas Toolbar */}
      <div className="h-11 bg-white border-b border-studio-border px-4 sm:px-6 flex items-center justify-between z-10 flex-shrink-0">
        {/* Tools bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id);
                  if (tool.id !== 'select') {
                    addToast({
                      type: tool.isRedact ? 'warning' : 'info',
                      title: `${tool.label} Tool Active`,
                      message: tool.isRedact
                        ? 'Secure Redaction removes underlying text streams permanently upon saving.'
                        : `Selected ${tool.label} tool. Click or drag on the page canvas.`,
                    });
                  }
                }}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? tool.isRedact
                      ? 'text-studio-danger font-semibold'
                      : 'text-studio-primary font-semibold'
                    : tool.isRedact
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-studio-navy'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="edit-tool-pill"
                    className={`absolute inset-0 rounded-lg border shadow-subtle ${
                      tool.isRedact ? 'bg-red-50 border-red-200' : 'bg-studio-primary/10 border-studio-primary/20'
                    }`}
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">{tool.icon}</span>
                <span className="relative">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Edit Action controls: Undo, Redo, Draft Counter, Save Edits */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
          {activeModule === 'edit' && (
            <>
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                <button
                  onClick={undo}
                  disabled={history.length === 0}
                  className="p-1 rounded text-slate-500 hover:text-studio-navy hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Undo edit"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={redo}
                  disabled={future.length === 0}
                  className="p-1 rounded text-slate-500 hover:text-studio-navy hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Redo edit"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {draftCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold bg-blue-50 text-studio-primary px-2 py-0.5 rounded-full border border-blue-200">
                    {draftCount} draft edit{draftCount > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={clearAllEdits}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Clear all draft edits"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleApplyEdits}
                    disabled={isSavingEdits}
                    className="flex items-center gap-1.5 px-3 py-1 bg-studio-primary hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                  >
                    {isSavingEdits ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Edits</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Page status indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-500">
              Page {currentPage} of {document.page_count}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Central Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Module Switcher */}
        <LeftSidebar />

        {/* Page Thumbnails Navigator */}
        <PageNavigator />

        {/* Central PDF Canvas Viewport */}
        <PDFCanvas />

        {/* Right Properties Inspector: Contextual EditInspector or Document Inspector */}
        {activeModule === 'edit' ? <EditInspector /> : <Inspector />}
      </div>

      {/* 4. Bottom Status Bar */}
      <BottomBar />

      {/* Modals */}
      <SignatureDialog />
      <RedactionConfirmDialog />
    </div>
  );
};
