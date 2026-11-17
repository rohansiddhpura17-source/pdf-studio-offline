import React from 'react';
import {Images} from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { PageRangeSelector } from './PageRangeSelector';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const PdfToImagesInspector: React.FC = () => {
  const store = useStampConvertStore();
  const { document, addToast } = useDocumentStore();

  const handleRender = async () => {
    if (!document) return;

    store.setIsProcessing(true);
    try {
      const res = await api.convertPdfToImages({
        file_id: document.file_id,
        format: store.p2iFormat,
        dpi: store.p2iDpi,
        quality: store.p2iFormat === 'jpeg' ? store.p2iQuality : undefined,
        page_selection: store.pageRangeOption === 'selection' ? store.selectedPages : undefined,
        page_range: store.pageRangeOption === 'custom' ? store.customPageRange : undefined,
      });

      store.setP2iRenderedResult(res);
      addToast({
        type: 'success',
        title: 'Rendering Complete',
        message: `Successfully rendered ${res.total_pages_rendered} page(s) at ${res.dpi} DPI.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Rendering Failed',
        message: err.message || 'Failed to render PDF to images.',
      });
    } finally {
      store.setIsProcessing(false);
    }
  };

  const dpiPresets = [
    { label: '72 DPI', val: 72, desc: 'Web' },
    { label: '96 DPI', val: 96, desc: 'Screen' },
    { label: '150 DPI', val: 150, desc: 'Balanced' },
    { label: '200 DPI', val: 200, desc: 'High-Res' },
    { label: '300 DPI', val: 300, desc: 'Print' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Output Format */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Export Image Format
        </label>
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => store.setP2iFormat('png')}
            className={`py-1.5 text-xs font-semibold rounded transition-colors ${
              store.p2iFormat === 'png'
                ? 'bg-white text-studio-primary shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PNG (Lossless)
          </button>
          <button
            type="button"
            onClick={() => store.setP2iFormat('jpeg')}
            className={`py-1.5 text-xs font-semibold rounded transition-colors ${
              store.p2iFormat === 'jpeg'
                ? 'bg-white text-studio-primary shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            JPEG (Compressed)
          </button>
        </div>
      </div>

      {/* Resolution Presets */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Resolution</span>
          <span className="text-studio-primary font-bold">{store.p2iDpi} DPI</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {dpiPresets.map((preset) => (
            <button
              key={preset.val}
              type="button"
              onClick={() => store.setP2iDpi(preset.val)}
              className={`py-1.5 text-[10px] font-semibold rounded flex flex-col items-center transition-all ${
                store.p2iDpi === preset.val
                  ? 'bg-studio-primary text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{preset.val}</span>
              <span className="text-[8px] opacity-80">{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* JPEG Quality Slider (if JPEG) */}
      {store.p2iFormat === 'jpeg' && (
        <div className="flex flex-col gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>JPEG Quality</span>
            <span>{store.p2iQuality}%</span>
          </div>
          <input
            type="range"
            min="30"
            max="100"
            value={store.p2iQuality}
            onChange={(e) => store.setP2iQuality(parseInt(e.target.value, 10))}
            className="accent-studio-primary"
          />
        </div>
      )}

      {/* Target Pages */}
      <PageRangeSelector />

      {/* Action Button */}
      <div className="pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleRender}
          disabled={store.isProcessing}
          className="w-full text-xs flex items-center justify-center gap-2"
        >
          <Images className="w-4 h-4" />
          {store.isProcessing ? 'Rasterizing Pages...' : 'Render Images & Export'}
        </Button>
      </div>
    </div>
  );
};
