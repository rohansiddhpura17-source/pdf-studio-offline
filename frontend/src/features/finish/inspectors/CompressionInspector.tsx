import React from 'react';
import {
  TrendingDown,
} from 'lucide-react';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { useFinishStore } from '../../../state/useFinishStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';
import { CompressionPreset } from '../../../types/finish';

export const CompressionInspector: React.FC = () => {
  const { document, addToast } = useDocumentStore();
  const {
    compressionPreset,
    setCompressionPreset,
    dpi,
    setDpi,
    jpegQuality,
    setJpegQuality,
    compressStreams,
    setCompressStreams,
    removeDuplicateObjects,
    setRemoveDuplicateObjects,
    optimizeImages,
    setOptimizeImages,
    preserveMetadata,
    setPreserveMetadata,
    setCompressionResult,
    isProcessing,
    setIsProcessing,
  } = useFinishStore();

  const handleCompress = async () => {
    if (!document) return;
    setIsProcessing(true);
    try {
      const res = await api.compressPdf({
        file_id: document.file_id,
        preset: compressionPreset,
        dpi,
        jpeg_quality: jpegQuality,
        compress_streams: compressStreams,
        remove_duplicate_objects: removeDuplicateObjects,
        optimize_images: optimizeImages,
        preserve_metadata: preserveMetadata,
      });

      setCompressionResult(res);
      addToast({
        type: 'success',
        title: 'Compression Successful',
        message: `Saved ${((res.bytes_saved / (res.original_size_bytes || 1)) * 100).toFixed(
          1
        )}% file size.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Compression Failed',
        message: err.message || 'An error occurred during compression.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const PRESETS: { id: CompressionPreset; label: string; desc: string }[] = [
    { id: 'max_quality', label: 'Max Quality', desc: '300 DPI · Lossless stream deflation' },
    { id: 'balanced', label: 'Balanced', desc: '150 DPI · 85% JPEG · Standard' },
    { id: 'strong', label: 'Strong', desc: '96 DPI · 70% JPEG · Maximum shrink' },
    { id: 'custom', label: 'Custom', desc: 'Configure specific DPI and quality' },
  ];

  return (
    <div className="flex flex-col gap-5 text-xs text-slate-700">
      {/* Preset Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-900 mb-2">
          Optimization Preset
        </label>
        <div className="flex flex-col gap-1.5">
          {PRESETS.map((p) => {
            const isSelected = compressionPreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setCompressionPreset(p.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-studio-primary/10 border-studio-primary text-studio-primary font-semibold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{p.label}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-studio-primary" />}
                </div>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders (DPI & JPEG Quality) */}
      <div className="pt-3 border-t border-slate-100 flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-800">Raster Image DPI</span>
            <span className="font-mono font-bold text-studio-primary">{dpi} DPI</span>
          </div>
          <input
            type="range"
            min="72"
            max="300"
            step="6"
            value={dpi}
            onChange={(e) => setDpi(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-studio-primary"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>72 (Web)</span>
            <span>150 (Desktop)</span>
            <span>300 (Print)</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-800">JPEG Compression Quality</span>
            <span className="font-mono font-bold text-studio-primary">{jpegQuality}%</span>
          </div>
          <input
            type="range"
            min="40"
            max="100"
            step="5"
            value={jpegQuality}
            onChange={(e) => setJpegQuality(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-studio-primary"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>40% (Compact)</span>
            <span>85% (Balanced)</span>
            <span>100% (Lossless)</span>
          </div>
        </div>
      </div>

      {/* Advanced Toggles */}
      <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
        <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
          Advanced Deflation Pipeline
        </span>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-600">Compress Content Streams</span>
          <input
            type="checkbox"
            checked={compressStreams}
            onChange={(e) => setCompressStreams(e.target.checked)}
            className="w-4 h-4 text-studio-primary rounded border-slate-300 focus:ring-studio-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-600">Deduplicate Identical Objects</span>
          <input
            type="checkbox"
            checked={removeDuplicateObjects}
            onChange={(e) => setRemoveDuplicateObjects(e.target.checked)}
            className="w-4 h-4 text-studio-primary rounded border-slate-300 focus:ring-studio-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-600">Resample Raster Images</span>
          <input
            type="checkbox"
            checked={optimizeImages}
            onChange={(e) => setOptimizeImages(e.target.checked)}
            className="w-4 h-4 text-studio-primary rounded border-slate-300 focus:ring-studio-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-600">Retain Metadata Dictionary</span>
          <input
            type="checkbox"
            checked={preserveMetadata}
            onChange={(e) => setPreserveMetadata(e.target.checked)}
            className="w-4 h-4 text-studio-primary rounded border-slate-300 focus:ring-studio-primary"
          />
        </label>
      </div>

      {/* Main Compress Button */}
      <div className="pt-4 border-t border-slate-100">
        <Button
          variant="primary"
          size="lg"
          onClick={handleCompress}
          disabled={isProcessing}
          icon={
            isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )
          }
          className="w-full justify-center bg-studio-primary shadow-subtle py-2.5"
        >
          {isProcessing ? 'Compressing PDF...' : 'Compress PDF'}
        </Button>
      </div>
    </div>
  );
};
