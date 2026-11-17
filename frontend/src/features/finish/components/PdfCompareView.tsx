import React, { useRef, useState } from 'react';
import {
  GitCompare,
  Upload,
  Split,
  Layers,
  Flame,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { useFinishStore } from '../../../state/useFinishStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const PdfCompareView: React.FC = () => {
  const { document, addToast } = useDocumentStore();
  const {
    originalFileId,
    revisedFileId,
    originalFilename,
    revisedFilename,
    compareMode,
    visualDiffMode,
    overlayOpacity,
    sensitivityThreshold,
    compareResult,
    activeDiffPage,
    isComparing,
    setOriginalFile,
    setRevisedFile,
    setVisualDiffMode,
    setOverlayOpacity,
    setCompareResult,
    setActiveDiffPage,
    setIsComparing,
  } = useFinishStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'text'>('visual');

  // Auto-set original document if empty
  React.useEffect(() => {
    if (document && (!originalFileId || originalFileId !== document.file_id)) {
      setOriginalFile(document.file_id, document.filename);
    }
  }, [document?.file_id]);

  const handleUploadRevised = async (file: File) => {
    try {
      const doc = await api.uploadDocument(file);
      setRevisedFile(doc.file_id, doc.filename);
      addToast({
        type: 'success',
        title: 'Revised Document Loaded',
        message: `Loaded ${doc.filename} (${doc.page_count} pages). Click "Run Comparison" to analyze.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not load revised document.',
      });
    }
  };

  const handleCreateSampleRevision = async () => {
    if (!document) return;
    try {
      setIsComparing(true);
      // Create a sample revision
      const revDoc = await api.createSampleDocument(document.page_count || 5);
      setRevisedFile(revDoc.file_id, `Revised_${revDoc.filename}`);

      // Immediately run comparison for instant side-by-side results
      const res = await api.comparePdfs({
        original_file_id: originalFileId || document.file_id,
        revised_file_id: revDoc.file_id,
        mode: compareMode,
        sensitivity_threshold: sensitivityThreshold,
      });

      setCompareResult(res);
      setActiveDiffPage(1);
      addToast({
        type: 'success',
        title: 'Sample Revision Compared',
        message: `Comparison completed. ${res.total_text_differences} differences analyzed.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Comparison Failed',
        message: err.message || 'Could not compare sample revision.',
      });
    } finally {
      setIsComparing(false);
    }
  };

  const handleRunComparison = async () => {
    const origId = originalFileId || document?.file_id;
    if (!origId || !revisedFileId) {
      addToast({
        type: 'warning',
        title: 'Select Two Documents',
        message: 'Please provide both an Original and a Revised document.',
      });
      return;
    }

    setIsComparing(true);
    try {
      const res = await api.comparePdfs({
        original_file_id: origId,
        revised_file_id: revisedFileId,
        mode: compareMode,
        sensitivity_threshold: sensitivityThreshold,
      });

      setCompareResult(res);
      setActiveDiffPage(1);
      addToast({
        type: 'success',
        title: 'Comparison Completed',
        message: `Found ${res.total_text_differences} textual changes across ${res.orig_page_count} pages.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Comparison Failed',
        message: err.message || 'An error occurred during comparison.',
      });
    } finally {
      setIsComparing(false);
    }
  };

  const handleExportHtmlReport = () => {
    if (!compareResult) return;
    const reportUrl = api.getComparisonReportUrl(compareResult.comparison_id, 'html');
    window.open(reportUrl, '_blank');
  };

  const currentVisualDiff = compareResult?.visual_diffs.find(
    (v) => v.page_number === activeDiffPage
  );

  const totalPages = compareResult
    ? Math.max(compareResult.orig_page_count, compareResult.rev_page_count)
    : document?.page_count || 1;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 p-6 sm:p-8">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
        {/* Header Banner */}
        <div className="bg-white border border-studio-border rounded-2xl p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg">
                <GitCompare className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-studio-navy">
                  PDF Dual-Document Comparison
                </h2>
                <p className="text-xs text-slate-500">
                  Inspect text modifications, layout shifts, additions, deletions, and visual pixel differences side by side.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {compareResult && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportHtmlReport}
                  icon={<ExternalLink className="w-4 h-4 text-studio-primary" />}
                >
                  Export Audit Report
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={handleRunComparison}
                disabled={isComparing || !revisedFileId}
                icon={<GitCompare className="w-4 h-4" />}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {isComparing ? 'Comparing...' : 'Run Comparison'}
              </Button>
            </div>
          </div>
        </div>

        {/* Dual Document Selector Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document A: Original */}
          <div className="bg-white rounded-2xl p-5 border border-studio-border shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Document A (Original / Baseline)
                </span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {originalFilename || document?.filename || 'No document loaded'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Baseline version used for text alignment and visual delta calculation.
              </p>
            </div>
          </div>

          {/* Document B: Revised */}
          <div className="bg-white rounded-2xl p-5 border border-studio-border shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Document B (Revised / Modified)
                </span>
                {revisedFileId && (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    Selected
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {revisedFilename || 'No revised document chosen yet'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                New version to compare against the baseline.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadRevised(e.target.files[0]);
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload className="w-3.5 h-3.5" />}
              >
                Upload Revised PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateSampleRevision}
                icon={<Sparkles className="w-3.5 h-3.5 text-studio-primary" />}
                className="text-xs text-slate-600"
              >
                Use Sample Revision
              </Button>
            </div>
          </div>
        </div>

        {/* Comparison Results & Viewer */}
        {compareResult ? (
          <div className="bg-white border border-studio-border rounded-2xl shadow-card overflow-hidden flex flex-col">
            {/* Comparison Overview Bar */}
            <div className="p-4 bg-slate-50/80 border-b border-studio-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs">
                  <button
                    onClick={() => setActiveTab('visual')}
                    className={`px-3 py-1 rounded font-semibold transition-all ${
                      activeTab === 'visual'
                        ? 'bg-violet-50 text-violet-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Visual Diff
                  </button>
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`px-3 py-1 rounded font-semibold transition-all ${
                      activeTab === 'text'
                        ? 'bg-violet-50 text-violet-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Text Diff ({compareResult.text_diffs.length})
                  </button>
                </div>

                {activeTab === 'visual' && (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
                    <button
                      onClick={() => setVisualDiffMode('side-by-side')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all ${
                        visualDiffMode === 'side-by-side'
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Side-by-Side View"
                    >
                      <Split className="w-3.5 h-3.5" />
                      <span>Side-by-Side</span>
                    </button>
                    <button
                      onClick={() => setVisualDiffMode('overlay')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all ${
                        visualDiffMode === 'overlay'
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Overlay Blend"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Overlay</span>
                    </button>
                    <button
                      onClick={() => setVisualDiffMode('diff')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all ${
                        visualDiffMode === 'diff'
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Difference Heatmap"
                    >
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      <span>Heatmap</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Page Navigator */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  Page <strong className="text-slate-800">{activeDiffPage}</strong> of{' '}
                  <strong className="text-slate-800">{totalPages}</strong>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveDiffPage(Math.max(1, activeDiffPage - 1))}
                    disabled={activeDiffPage <= 1}
                    className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveDiffPage(Math.min(totalPages, activeDiffPage + 1))}
                    disabled={activeDiffPage >= totalPages}
                    className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Viewport Content */}
            <div className="p-6">
              {activeTab === 'visual' ? (
                <div>
                  {/* Overlay Opacity Slider (only when overlay mode is active) */}
                  {visualDiffMode === 'overlay' && (
                    <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4 max-w-md mx-auto">
                      <span className="text-xs font-semibold text-slate-700">
                        Overlay Blend:
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={overlayOpacity}
                        onChange={(e) => setOverlayOpacity(parseInt(e.target.value, 10))}
                        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                      />
                      <span className="text-xs font-mono font-bold text-slate-800 w-12 text-right">
                        {overlayOpacity}%
                      </span>
                    </div>
                  )}

                  {/* Visual Render Container */}
                  {currentVisualDiff ? (
                    <div>
                      {visualDiffMode === 'side-by-side' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Original Side */}
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-700 mb-2">
                              Original Page {activeDiffPage}
                            </span>
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-subtle bg-white max-h-[550px] flex items-center justify-center p-2">
                              {currentVisualDiff.orig_page_image_b64 ? (
                                <img
                                  src={`data:image/png;base64,${currentVisualDiff.orig_page_image_b64}`}
                                  alt={`Original page ${activeDiffPage}`}
                                  className="max-h-[530px] object-contain rounded"
                                />
                              ) : (
                                <div className="p-12 text-center text-slate-400 text-xs">
                                  No corresponding page in original
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Revised Side */}
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-700 mb-2">
                              Revised Page {activeDiffPage}
                            </span>
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-subtle bg-white max-h-[550px] flex items-center justify-center p-2">
                              {currentVisualDiff.rev_page_image_b64 ? (
                                <img
                                  src={`data:image/png;base64,${currentVisualDiff.rev_page_image_b64}`}
                                  alt={`Revised page ${activeDiffPage}`}
                                  className="max-h-[530px] object-contain rounded"
                                />
                              ) : (
                                <div className="p-12 text-center text-slate-400 text-xs">
                                  Page removed in revised version
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {visualDiffMode === 'overlay' && (
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-700 mb-2">
                            Interactive Overlay (Blend: {overlayOpacity}%)
                          </span>
                          <div className="relative border border-slate-200 rounded-xl overflow-hidden shadow-subtle bg-white max-h-[600px] flex items-center justify-center p-2">
                            {currentVisualDiff.orig_page_image_b64 && (
                              <img
                                src={`data:image/png;base64,${currentVisualDiff.orig_page_image_b64}`}
                                alt="Original base"
                                className="max-h-[560px] object-contain rounded"
                              />
                            )}
                            {currentVisualDiff.rev_page_image_b64 && (
                              <img
                                src={`data:image/png;base64,${currentVisualDiff.rev_page_image_b64}`}
                                alt="Revised overlay"
                                style={{ opacity: overlayOpacity / 100 }}
                                className="absolute inset-2 max-h-[560px] object-contain m-auto transition-opacity duration-150 pointer-events-none rounded"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {visualDiffMode === 'diff' && (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold text-slate-700">
                              Pixel Variance Heatmap
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              {currentVisualDiff.diff_percentage.toFixed(2)}% pixel variance
                            </span>
                          </div>
                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-subtle bg-white max-h-[600px] flex items-center justify-center p-2">
                            {currentVisualDiff.diff_heatmap_b64 ? (
                              <img
                                src={`data:image/png;base64,${currentVisualDiff.diff_heatmap_b64}`}
                                alt={`Heatmap diff page ${activeDiffPage}`}
                                className="max-h-[560px] object-contain rounded"
                              />
                            ) : (
                              <div className="p-12 text-center text-slate-400 text-xs">
                                Identical visual layout on this page.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No visual diff available for page {activeDiffPage}.
                    </div>
                  )}
                </div>
              ) : (
                /* Textual Changes Diff List */
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700">
                      Discovered Textual Differences ({compareResult.text_diffs.length})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Word-level unified diffing
                    </span>
                  </div>

                  {compareResult.text_diffs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No textual differences found between the documents.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
                      {compareResult.text_diffs.map((diff, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs font-mono leading-relaxed ${
                            diff.type === 'added'
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                              : diff.type === 'removed'
                              ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                              : 'bg-amber-50/60 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500">
                            <span>Page {diff.page_number}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                diff.type === 'added'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : diff.type === 'removed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {diff.type.toUpperCase()}
                            </span>
                          </div>

                          {diff.type === 'modified' ? (
                            <div className="flex flex-col gap-1">
                              <p className="line-through text-rose-700 bg-rose-100/50 p-1 rounded">
                                - {diff.old_text}
                              </p>
                              <p className="text-emerald-700 bg-emerald-100/50 p-1 rounded">
                                + {diff.new_text}
                              </p>
                            </div>
                          ) : (
                            <p>{diff.text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state prompt */
          <div className="bg-white border-2 border-dashed border-studio-border rounded-2xl p-12 text-center shadow-subtle">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 mx-auto flex items-center justify-center mb-4">
              <GitCompare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-studio-navy">
              Ready to Compare PDF Documents
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Select or generate a revised PDF document on the right to perform high-resolution visual pixel diffing and text delta detection.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleCreateSampleRevision}
                icon={<Sparkles className="w-4 h-4" />}
                className="bg-violet-600 hover:bg-violet-700"
              >
                Create Sample Revision & Compare
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
