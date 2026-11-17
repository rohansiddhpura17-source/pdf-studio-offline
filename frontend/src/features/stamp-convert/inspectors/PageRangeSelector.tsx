import React from 'react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';

export const PageRangeSelector: React.FC = () => {
  const {
    pageRangeOption,
    setPageRangeOption,
    customPageRange,
    setCustomPageRange,
    selectedPages,
  } = useStampConvertStore();

  const { document } = useDocumentStore();
  const totalPages = document?.page_count || 1;

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
        Target Pages
      </span>

      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setPageRangeOption('all')}
          className={`py-1 text-xs font-semibold rounded ${
            pageRangeOption === 'all'
              ? 'bg-white text-studio-primary shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({totalPages})
        </button>
        <button
          type="button"
          onClick={() => setPageRangeOption('selection')}
          className={`py-1 text-xs font-semibold rounded ${
            pageRangeOption === 'selection'
              ? 'bg-white text-studio-primary shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Selected ({selectedPages.length})
        </button>
        <button
          type="button"
          onClick={() => setPageRangeOption('custom')}
          className={`py-1 text-xs font-semibold rounded ${
            pageRangeOption === 'custom'
              ? 'bg-white text-studio-primary shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Custom
        </button>
      </div>

      {pageRangeOption === 'custom' && (
        <div className="flex flex-col gap-1 mt-1">
          <input
            type="text"
            value={customPageRange}
            onChange={(e) => setCustomPageRange(e.target.value)}
            placeholder={`e.g. 1, 3-5 (1 to ${totalPages})`}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-studio-primary bg-white text-slate-800"
          />
          <span className="text-[10px] text-slate-400">
            Comma-separated pages and hyphenated ranges
          </span>
        </div>
      )}

      {pageRangeOption === 'selection' && selectedPages.length === 0 && (
        <span className="text-[10px] text-amber-600 italic">
          No pages selected. Click "Select Page" on canvas to choose pages.
        </span>
      )}
    </div>
  );
};
