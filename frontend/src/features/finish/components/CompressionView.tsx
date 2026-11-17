import React from 'react';
import {
  TrendingDown,
  CheckCircle2,
  Download,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { useFinishStore } from '../../../state/useFinishStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';
import { formatBytes } from '../../../utils/format';

export const CompressionView: React.FC = () => {
  const { document, setDocument, addToast } = useDocumentStore();
  const {
    compressionPreset,
    setCompressionPreset,
    compressionResult,
    setCompressionResult,
    isProcessing,
  } = useFinishStore();

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500">
        <p>No document loaded for compression.</p>
      </div>
    );
  }

  const handleApplyAsActive = async () => {
    if (!compressionResult) return;
    try {
      const updatedDoc = await api.getDocumentInfo(compressionResult.file_id);
      setDocument(updatedDoc);
      addToast({
        type: 'success',
        title: 'Active Document Updated',
        message: `Switched active editor document to compressed version (${formatBytes(
          compressionResult.compressed_size_bytes
        )}).`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to Switch Document',
        message: 'Could not load compressed document info.',
      });
    }
  };

  const handleDownload = () => {
    if (!compressionResult) return;
    const downloadName = compressionResult.original_filename.replace(
      /\.pdf$/i,
      '_compressed.pdf'
    );
    api.downloadDocument(compressionResult.file_id, downloadName);
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
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-studio-primary flex items-center justify-center font-bold text-lg">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-studio-navy">
                  PDF Size Optimization & Compression
                </h2>
                <p className="text-xs text-slate-500">
                  Lossless stream deflation, duplicate font/object consolidation, and adaptive raster downsampling.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                Current Size: <strong className="text-slate-800">{formatBytes(document.size_bytes)}</strong>
              </span>
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                {document.page_count} Pages
              </span>
            </div>
          </div>
        </div>

        {/* Compression Result Banner (if run) */}
        {compressionResult && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-6 shadow-card animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Compression Completed Successfully</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Duration: {compressionResult.duration_ms} ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-4">
              <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-emerald-100 shadow-2xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Original Size
                </span>
                <p className="text-lg font-bold text-slate-700 mt-1">
                  {formatBytes(compressionResult.original_size_bytes)}
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-emerald-100 shadow-2xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Compressed Size
                </span>
                <p className="text-lg font-bold text-emerald-700 mt-1">
                  {formatBytes(compressionResult.compressed_size_bytes)}
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-emerald-100 shadow-2xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Space Saved
                </span>
                <p className="text-lg font-bold text-studio-primary mt-1">
                  {formatBytes(compressionResult.bytes_saved)}
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-emerald-100 shadow-2xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Reduction Ratio
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-emerald-600">
                    {compressionResult.percent_reduction.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-500">less</span>
                </div>
              </div>
            </div>

            {/* Progress bar visual */}
            <div className="mt-4 pt-3 border-t border-emerald-100">
              <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
                <span>Space Optimization</span>
                <span>
                  {compressionResult.bytes_saved > 0
                    ? `${compressionResult.percent_reduction.toFixed(1)}% Smaller`
                    : 'Already Maximum Deflation'}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      5,
                      100 - compressionResult.percent_reduction
                    )}%`,
                  }}
                  title="New File Size"
                />
                <div
                  className="bg-blue-300 h-full opacity-60"
                  style={{
                    width: `${compressionResult.percent_reduction}%`,
                  }}
                  title="Bytes Saved"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>Compressed ({formatBytes(compressionResult.compressed_size_bytes)})</span>
                <span>Saved ({formatBytes(compressionResult.bytes_saved)})</span>
              </div>
            </div>

            {/* Actions for compressed result */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleDownload}
                icon={<Download className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Download Compressed PDF
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={handleApplyAsActive}
                icon={<Sparkles className="w-4 h-4 text-studio-primary" />}
              >
                Replace Active Editor Document
              </Button>

              <Button
                variant="ghost"
                size="md"
                onClick={() => setCompressionResult(null)}
                icon={<RotateCcw className="w-4 h-4" />}
                className="text-slate-500"
              >
                Clear Result
              </Button>
            </div>
          </div>
        )}

        {/* Compression Preset Explanation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setCompressionPreset('max_quality')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
              compressionPreset === 'max_quality'
                ? 'border-studio-primary ring-2 ring-studio-primary/20 shadow-card'
                : 'border-studio-border hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900">Maximum Quality</span>
              {compressionPreset === 'max_quality' && (
                <div className="w-5 h-5 rounded-full bg-studio-primary text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Maintains 300 DPI high-resolution graphics and 92% JPEG quality. Applies lossless content stream deflation and duplicate object deduplication without downsampling graphics.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500">
              <span>Target: Printing & Archives</span>
              <span className="font-semibold text-slate-700">~10-25% reduction</span>
            </div>
          </div>

          <div
            onClick={() => setCompressionPreset('balanced')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
              compressionPreset === 'balanced'
                ? 'border-studio-primary ring-2 ring-studio-primary/20 shadow-card'
                : 'border-studio-border hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900">Balanced (Recommended)</span>
              {compressionPreset === 'balanced' && (
                <div className="w-5 h-5 rounded-full bg-studio-primary text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Standard desktop and distribution preset. Downsamples photos to 150 DPI at 85% JPEG quality. Flattens unused object tables and preserves full metadata tags.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500">
              <span>Target: Everyday Sharing</span>
              <span className="font-semibold text-emerald-600">~35-60% reduction</span>
            </div>
          </div>

          <div
            onClick={() => setCompressionPreset('strong')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
              compressionPreset === 'strong'
                ? 'border-studio-primary ring-2 ring-studio-primary/20 shadow-card'
                : 'border-studio-border hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900">Strong Compression</span>
              {compressionPreset === 'strong' && (
                <div className="w-5 h-5 rounded-full bg-studio-primary text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Maximum space saving. Re-encodes raster images at 96 DPI and 70% quality, compresses all text streams, removes orphaned references, and strips auxiliary metadata.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500">
              <span>Target: Email Attachments</span>
              <span className="font-semibold text-emerald-700">~60-80% reduction</span>
            </div>
          </div>
        </div>

        {/* Technical How it works explanation */}
        <div className="bg-white border border-studio-border rounded-2xl p-6 shadow-subtle">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Offline Compression Pipeline Architecture
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">1. Flate Stream Deflation</span>
              <p className="text-slate-500 leading-relaxed">
                Applies standard zlib/deflate compression across all uncompressed PDF content streams, text runs, and page description operators.
              </p>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">2. Object Deduplication</span>
              <p className="text-slate-500 leading-relaxed">
                Scans the PDF xref table for identical embedded font subsets, forms, and color profiles, consolidating them into unified reference pointers.
              </p>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">3. Raster Image Resampling</span>
              <p className="text-slate-500 leading-relaxed">
                Iterates embedded XObject images with Pillow, re-sampling high-resolution images down to target DPI and applying adaptive DCT JPEG compression.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
