import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Check,
} from 'lucide-react';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { useFinishStore } from '../../../state/useFinishStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const MetadataCleanupView: React.FC = () => {
  const { document, setDocument, addToast } = useDocumentStore();
  const {
    cleanupMode,
    setCleanupMode,
    removeAuthor,
    setRemoveAuthor,
    removeTitle,
    setRemoveTitle,
    removeSubject,
    setRemoveSubject,
    removeKeywords,
    setRemoveKeywords,
    removeCreatorProducer,
    setRemoveCreatorProducer,
    removeTimestamps,
    setRemoveTimestamps,
    removeCustomEntries,
    setRemoveCustomEntries,
    removeXmp,
    setRemoveXmp,
    removeThumbnails,
    setRemoveThumbnails,
    verificationReport,
    setVerificationReport,
    isProcessing,
    setIsProcessing,
    loadMetadata,
  } = useFinishStore();

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500">
        <p>No document loaded for metadata cleanup.</p>
      </div>
    );
  }

  const handleSanitize = async () => {
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
        title: 'Privacy Sanitization Complete',
        message: `Removed ${res.report.fields_removed.length} metadata keys. Document is sanitized.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sanitization Failed',
        message: err.message || 'Could not sanitize document metadata.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSanitized = () => {
    if (!verificationReport) return;
    const downloadName = document.filename.replace(/\.pdf$/i, '_sanitized.pdf');
    api.downloadDocument(document.file_id, downloadName);
    addToast({
      type: 'success',
      title: 'Download Started',
      message: `Downloading ${downloadName}`,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Header Banner */}
        <div className="bg-white border border-studio-border rounded-2xl p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-studio-navy">
                  Privacy Sanitization & Metadata Removal
                </h2>
                <p className="text-xs text-slate-500">
                  Strip author names, software footprints, timestamps, custom dictionary tags, and XMP streams for confidential sharing.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleSanitize}
              disabled={isProcessing}
              icon={<ShieldCheck className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 self-start sm:self-auto"
            >
              {isProcessing ? 'Sanitizing...' : 'Sanitize & Rebuild PDF'}
            </Button>
          </div>
        </div>

        {/* Essential Notice: Metadata Removal vs Redaction */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Important distinction:</strong> Removing metadata purges hidden document headers, authorship tags, and creation dates. It does <em>not</em> erase text on the visual page. To securely redact visible page text or figures, use the <strong>Secure Redaction</strong> tool in the Edit workspace.
          </div>
        </div>

        {/* Verification Report Card (if generated) */}
        {verificationReport && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-6 shadow-card animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Privacy Verification & Audit Report
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-200/60 text-emerald-800 rounded-full">
                Mode: {verificationReport.mode.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-emerald-900/80 mb-4">
              {verificationReport.details}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-white/90 rounded-xl p-3 border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Fields Before Sanitization
                </span>
                <p className="text-base font-bold text-slate-800 mt-1">
                  {verificationReport.fields_before.length} fields detected
                </p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {verificationReport.fields_before.join(', ') || 'None'}
                </p>
              </div>

              <div className="bg-white/90 rounded-xl p-3 border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Fields Stripped & Erased
                </span>
                <p className="text-base font-bold text-emerald-700 mt-1">
                  {verificationReport.fields_removed.length} purged
                </p>
                <p className="text-[10px] text-emerald-600 truncate mt-0.5">
                  {verificationReport.fields_removed.join(', ') || 'None'}
                </p>
              </div>

              <div className="bg-white/90 rounded-xl p-3 border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Sanitization Status
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-base font-bold text-emerald-800">
                    {verificationReport.is_sanitized ? '100% Clean' : 'Residual Present'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {verificationReport.fields_remaining.length === 0
                    ? 'Zero personal traces'
                    : `Remaining: ${verificationReport.fields_remaining.join(', ')}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadSanitized}
                icon={<Download className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Download Sanitized PDF
              </Button>
            </div>
          </div>
        )}

        {/* Sanitization Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setCleanupMode('standard')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
              cleanupMode === 'standard'
                ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-card'
                : 'border-studio-border hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">Standard Sanitization</span>
              </div>
              {cleanupMode === 'standard' && (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Clears personal authorship attributes (author, title, keywords, software, timestamps) while maintaining existing document bookmark hierarchies and structure trees.
            </p>
          </div>

          <div
            onClick={() => setCleanupMode('deep')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
              cleanupMode === 'deep'
                ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-card'
                : 'border-studio-border hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">Deep Sanitization (Clean Rebuild)</span>
              </div>
              {cleanupMode === 'deep' && (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Performs a clean reconstruction of the PDF object catalog. Strips the entire `/Info` dictionary, completely removes XML XMP metadata streams, and purges embedded thumbnail caches.
            </p>
          </div>
        </div>

        {/* Granular Removal Toggles */}
        <div className="bg-white border border-studio-border rounded-2xl p-6 shadow-subtle">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Granular Privacy Attributes To Purge
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={removeAuthor}
                onChange={(e) => setRemoveAuthor(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Author & Creator</p>
                <p className="text-[10px] text-slate-500">Strips user & author identity</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={removeTitle}
                onChange={(e) => setRemoveTitle(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Document Title</p>
                <p className="text-[10px] text-slate-500">Erases internal document name</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={removeSubject}
                onChange={(e) => setRemoveSubject(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Subject Description</p>
                <p className="text-[10px] text-slate-500">Removes topic synopsis</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={removeKeywords}
                onChange={(e) => setRemoveKeywords(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Keywords & Tags</p>
                <p className="text-[10px] text-slate-500">Purges search indexing tags</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={removeCreatorProducer}
                onChange={(e) => setRemoveCreatorProducer(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Software Footprints</p>
                <p className="text-[10px] text-slate-500">Strips creator app & producer</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={removeTimestamps}
                onChange={(e) => setRemoveTimestamps(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Creation Timestamps</p>
                <p className="text-[10px] text-slate-500">Erases creation & mod dates</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={removeCustomEntries}
                onChange={(e) => setRemoveCustomEntries(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Custom Keys</p>
                <p className="text-[10px] text-slate-500">Deletes custom dictionary fields</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={removeXmp}
                onChange={(e) => setRemoveXmp(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">XMP Metadata Stream</p>
                <p className="text-[10px] text-slate-500">Removes embedded XML metadata</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={removeThumbnails}
                onChange={(e) => setRemoveThumbnails(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Embedded Thumbnails</p>
                <p className="text-[10px] text-slate-500">Cleans embedded page previews</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
