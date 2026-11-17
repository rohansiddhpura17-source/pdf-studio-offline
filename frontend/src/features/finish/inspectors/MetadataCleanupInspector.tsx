import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { useFinishStore } from '../../../state/useFinishStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const MetadataCleanupInspector: React.FC = () => {
  const { document, setDocument, addToast } = useDocumentStore();
  const {
    cleanupMode,
    setCleanupMode,
    removeAuthor,
    removeTitle,
    removeSubject,
    removeKeywords,
    removeCreatorProducer,
    removeTimestamps,
    removeCustomEntries,
    removeXmp,
    removeThumbnails,
    verificationReport,
    setVerificationReport,
    isProcessing,
    setIsProcessing,
    loadMetadata,
  } = useFinishStore();

  const handleSanitize = async () => {
    if (!document) return;
    setIsProcessing(true);
    try {
      const res = await api.removeMetadata({
        file_id: document.file_id,
        mode: cleanupMode,
        remove_author: removeAuthor,
        remove_title: removeTitle,
        remove_subject: removeSubject,
        remove_keywords: removeKeywords,
        remove_creator_producer: removeCreatorProducer,
        remove_timestamps: removeTimestamps,
        remove_custom_entries: removeCustomEntries,
        remove_xmp: removeXmp,
        remove_thumbnails: removeThumbnails,
      });

      setDocument(res.document);
      setVerificationReport(res.report);
      await loadMetadata(res.document.file_id);
      addToast({
        type: 'success',
        title: 'Document Sanitized',
        message: `Erased ${res.report.fields_removed.length} metadata fields.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sanitization Failed',
        message: err.message || 'Could not sanitize document.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!document) return;
    const downloadName = document.filename.replace(/\.pdf$/i, '_sanitized.pdf');
    api.downloadDocument(document.file_id, downloadName);
  };

  return (
    <div className="flex flex-col gap-5 text-xs text-slate-700">
      {/* Sanitization Mode */}
      <div>
        <label className="block text-xs font-bold text-slate-900 mb-2">
          Sanitization Level
        </label>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setCleanupMode('standard')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              cleanupMode === 'standard'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>Standard Cleanup</span>
              {cleanupMode === 'standard' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
              Purges /Info fields, preserves structure
            </p>
          </button>

          <button
            onClick={() => setCleanupMode('deep')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              cleanupMode === 'deep'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>Deep Sanitization</span>
              {cleanupMode === 'deep' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
              Full catalog rebuild, strips XMP & thumbnails
            </p>
          </button>
        </div>
      </div>

      {/* Audit verification report mini-badge if present */}
      {verificationReport && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col gap-1 text-[11px] text-emerald-900">
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verification Complete</span>
          </div>
          <p>
            {verificationReport.fields_removed.length} metadata keys wiped clean.
          </p>
          <button
            onClick={handleDownload}
            className="mt-2 text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sanitized Copy</span>
          </button>
        </div>
      )}

      {/* Action Button */}
      <div className="pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSanitize}
          disabled={isProcessing}
          icon={
            isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )
          }
          className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 shadow-subtle py-2.5"
        >
          {isProcessing ? 'Sanitizing Document...' : 'Sanitize & Rebuild PDF'}
        </Button>
      </div>
    </div>
  );
};
