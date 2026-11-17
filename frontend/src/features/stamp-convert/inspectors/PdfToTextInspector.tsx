import React from 'react';
import { FileText, AlignLeft, LayoutTemplate } from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { PageRangeSelector } from './PageRangeSelector';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const PdfToTextInspector: React.FC = () => {
  const store = useStampConvertStore();
  const { document, addToast } = useDocumentStore();

  const handleExtract = async () => {
    if (!document) return;

    store.setIsProcessing(true);
    try {
      const res = await api.convertPdfToText({
        file_id: document.file_id,
        mode: store.p2tMode,
        preserve_page_breaks: store.p2tPreservePageBreaks,
        page_selection: store.pageRangeOption === 'selection' ? store.selectedPages : undefined,
        page_range: store.pageRangeOption === 'custom' ? store.customPageRange : undefined,
      });

      store.setP2tExtractedResult(res);
      addToast({
        type: 'success',
        title: 'Text Extraction Complete',
        message: `Extracted ${res.total_characters} characters across ${res.pages.length} pages.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Extraction Failed',
        message: err.message || 'Failed to extract text from PDF.',
      });
    } finally {
      store.setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Switcher */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Extraction Mode
        </label>
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => store.setP2tMode('plain')}
            className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
              store.p2tMode === 'plain'
                ? 'bg-white text-studio-primary shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            Plain Text
          </button>
          <button
            type="button"
            onClick={() => store.setP2tMode('layout')}
            className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
              store.p2tMode === 'layout'
                ? 'bg-white text-studio-primary shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            Preserve Layout
          </button>
        </div>
      </div>

      {/* Preserve Page Breaks Toggle */}
      <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer pt-1">
        <div>
          <span>Preserve Page Breaks</span>
          <span className="block text-[10px] text-slate-400 font-normal">
            Insert clear page headers between sheets
          </span>
        </div>
        <input
          type="checkbox"
          checked={store.p2tPreservePageBreaks}
          onChange={(e) => store.setP2tPreservePageBreaks(e.target.checked)}
          className="accent-studio-primary rounded cursor-pointer"
        />
      </label>

      {/* Target Pages */}
      <PageRangeSelector />

      {/* Action Button */}
      <div className="pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleExtract}
          disabled={store.isProcessing}
          className="w-full text-xs flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {store.isProcessing ? 'Extracting Text...' : 'Extract Text'}
        </Button>
      </div>
    </div>
  );
};
