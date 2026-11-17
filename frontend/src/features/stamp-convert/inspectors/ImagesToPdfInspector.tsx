import React from 'react';
import {ImagePlus} from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const ImagesToPdfInspector: React.FC = () => {
  const store = useStampConvertStore();
  const { setDocument, addToast, setActiveModule } = useDocumentStore();

  const handleCompile = async () => {
    if (store.imgQueue.length === 0) {
      addToast({
        type: 'warning',
        title: 'Empty Queue',
        message: 'Please add at least one image to compile into a PDF.',
      });
      return;
    }

    store.setIsProcessing(true);
    try {
      const newDoc = await api.convertImagesToPdf({
        images: store.imgQueue,
        output_filename: store.imgOutputFilename.trim() || 'Converted_Images.pdf',
        page_size: store.imgPageSize,
        orientation: store.imgOrientation,
        fit_mode: store.imgFitMode,
        margin_pt: store.imgMarginPt,
        bg_color: store.imgBgColor,
      });

      setDocument(newDoc);
      addToast({
        type: 'success',
        title: 'PDF Compiled Successfully',
        message: `Compiled ${store.imgQueue.length} images into ${newDoc.page_count} PDF pages.`,
      });
      store.clearImageQueue();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Compilation Failed',
        message: err.message || 'Failed to convert images to PDF.',
      });
    } finally {
      store.setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Output Filename */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700">Output PDF Name</label>
        <input
          type="text"
          value={store.imgOutputFilename}
          onChange={(e) => store.setImgOutputFilename(e.target.value)}
          placeholder="Converted_Images.pdf"
          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
        />
      </div>

      {/* Target Page Size */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700">Target Page Size</label>
        <select
          value={store.imgPageSize}
          onChange={(e: any) => store.setImgPageSize(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary bg-white"
        >
          <option value="A4">A4 (210 × 297 mm)</option>
          <option value="Letter">US Letter (8.5 × 11 in)</option>
          <option value="A3">A3 (297 × 420 mm)</option>
          <option value="A5">A5 (148 × 210 mm)</option>
          <option value="Legal">US Legal (8.5 × 14 in)</option>
          <option value="Original">Original (Match Image Dimensions)</option>
        </select>
      </div>

      {/* Orientation & Fit Mode */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Orientation</label>
          <select
            value={store.imgOrientation}
            onChange={(e: any) => store.setImgOrientation(e.target.value)}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
          >
            <option value="auto">Auto (Smart)</option>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Image Fit</label>
          <select
            value={store.imgFitMode}
            onChange={(e: any) => store.setImgFitMode(e.target.value)}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
          >
            <option value="fit">Fit (Contain)</option>
            <option value="fill">Fill (Crop to Page)</option>
            <option value="stretch">Stretch to Bounds</option>
          </select>
        </div>
      </div>

      {/* Margins */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Page Margin</span>
          <span>{store.imgMarginPt} pt</span>
        </div>
        <input
          type="range"
          min="0"
          max="72"
          step="6"
          value={store.imgMarginPt}
          onChange={(e) => store.setImgMarginPt(parseInt(e.target.value, 10))}
          className="accent-studio-primary"
        />
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>None (0pt)</span>
          <span>Normal (18pt)</span>
          <span>Wide (36pt)</span>
        </div>
      </div>

      {/* Background Color */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pt-1">
        <span>Canvas Background</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={store.imgBgColor}
            onChange={(e) => store.setImgBgColor(e.target.value)}
            className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
          />
          <span className="font-mono text-[11px] text-slate-500">{store.imgBgColor}</span>
        </div>
      </div>

      {/* Queue Summary */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
        <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
          <span>Queue Status</span>
          <span className="text-studio-primary">{store.imgQueue.length} Ready</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Images will be compiled into the PDF in top-to-bottom sequence.
        </p>
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleCompile}
          disabled={store.isProcessing || store.imgQueue.length === 0}
          className="w-full text-xs flex items-center justify-center gap-2"
        >
          <ImagePlus className="w-4 h-4" />
          {store.isProcessing ? 'Compiling PDF...' : 'Compile to PDF'}
        </Button>
      </div>
    </div>
  );
};
