import React from 'react';
import {Hash} from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { PageRangeSelector } from './PageRangeSelector';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const PageNumberInspector: React.FC = () => {
  const store = useStampConvertStore();
  const { document, setDocument, addToast } = useDocumentStore();

  const handleApply = async () => {
    if (!document) return;

    store.setIsProcessing(true);
    try {
      const updatedDoc = await api.applyPageNumbers({
        file_id: document.file_id,
        position: store.pnPosition,
        format: store.pnFormat,
        start_number: store.pnStartNumber,
        prefix: store.pnPrefix,
        suffix: store.pnSuffix,
        separator: store.pnSeparator,
        include_total: store.pnIncludeTotal,
        font_name: store.pnFontName,
        font_size: store.pnFontSize,
        color: store.pnColor,
        skip_cover: store.pnSkipCover,
        page_selection: store.pageRangeOption === 'selection' ? store.selectedPages : undefined,
        page_range: store.pageRangeOption === 'custom' ? store.customPageRange : undefined,
      });

      setDocument(updatedDoc);
      addToast({
        type: 'success',
        title: 'Page Numbers Added',
        message: 'Successfully stamped page numbering across document.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Add Page Numbers',
        message: err.message || 'An error occurred.',
      });
    } finally {
      store.setIsProcessing(false);
    }
  };

  const positions = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {/* Position Selector (6 positions) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Position Alignment
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-100 rounded-lg border border-slate-200/80">
          {positions.map((pos) => {
            const isSelected = store.pnPosition === pos.id;
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => store.setPnPosition(pos.id)}
                className={`py-2 px-1 text-[11px] font-semibold rounded text-center transition-all ${
                  isSelected
                    ? 'bg-studio-primary text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/60'
                }`}
              >
                {pos.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Numbering Format */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700">Numbering Format</label>
        <select
          value={store.pnFormat}
          onChange={(e: any) => store.setPnFormat(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary bg-white"
        >
          <option value="arabic">1, 2, 3 (Arabic Standard)</option>
          <option value="padded">01, 02, 03 (Two-Digit Padded)</option>
          <option value="roman_lower">i, ii, iii (Lowercase Roman)</option>
          <option value="roman_upper">I, II, III (Uppercase Roman)</option>
        </select>
      </div>

      {/* Prefix, Suffix & Start Number */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Prefix</label>
          <input
            type="text"
            value={store.pnPrefix}
            onChange={(e) => store.setPnPrefix(e.target.value)}
            placeholder="e.g. Page "
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Suffix</label>
          <input
            type="text"
            value={store.pnSuffix}
            onChange={(e) => store.setPnSuffix(e.target.value)}
            placeholder="e.g.  - Conf."
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
          />
        </div>
      </div>

      {/* Start Number & Total Page Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Start Number</label>
          <input
            type="number"
            min="1"
            value={store.pnStartNumber}
            onChange={(e) => store.setPnStartNumber(parseInt(e.target.value, 10) || 1)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={store.pnIncludeTotal}
              onChange={(e) => store.setPnIncludeTotal(e.target.checked)}
              className="accent-studio-primary rounded cursor-pointer"
            />
            <span>Include Total ("Page X of Y")</span>
          </label>
        </div>
      </div>

      {/* Typography & Color */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Font</label>
          <select
            value={store.pnFontName}
            onChange={(e: any) => store.setPnFontName(e.target.value)}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
          >
            <option value="Helvetica">Helvetica</option>
            <option value="Times-Roman">Times</option>
            <option value="Courier">Courier</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Size</label>
          <input
            type="number"
            min="8"
            max="24"
            value={store.pnFontSize}
            onChange={(e) => store.setPnFontSize(parseInt(e.target.value, 10) || 10)}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Color</label>
          <input
            type="color"
            value={store.pnColor}
            onChange={(e) => store.setPnColor(e.target.value)}
            className="w-full h-8 rounded border border-slate-200 cursor-pointer p-0.5"
          />
        </div>
      </div>

      {/* Skip Cover Page Toggle */}
      <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer pt-2 border-t border-slate-100">
        <div>
          <span>Skip Cover Page</span>
          <span className="block text-[10px] text-slate-400 font-normal">
            Do not stamp numbering on Page 1
          </span>
        </div>
        <input
          type="checkbox"
          checked={store.pnSkipCover}
          onChange={(e) => store.setPnSkipCover(e.target.checked)}
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
          onClick={handleApply}
          disabled={store.isProcessing}
          className="w-full text-xs flex items-center justify-center gap-2"
        >
          <Hash className="w-4 h-4" />
          {store.isProcessing ? 'Applying Numbers...' : 'Apply Page Numbers'}
        </Button>
      </div>
    </div>
  );
};
