import React, { useState } from 'react';
import {PanelTop, Tag} from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { PageRangeSelector } from './PageRangeSelector';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const HeaderFooterInspector: React.FC = () => {
  const store = useStampConvertStore();
  const { document, setDocument, addToast } = useDocumentStore();
  const [lastActiveInput, setLastActiveInput] = useState<
    'hl' | 'hc' | 'hr' | 'fl' | 'fc' | 'fr'
  >('fc');

  const insertTag = (tag: string) => {
    switch (lastActiveInput) {
      case 'hl':
        store.setHfHeaderLeft(store.hfHeaderLeft + tag);
        break;
      case 'hc':
        store.setHfHeaderCenter(store.hfHeaderCenter + tag);
        break;
      case 'hr':
        store.setHfHeaderRight(store.hfHeaderRight + tag);
        break;
      case 'fl':
        store.setHfFooterLeft(store.hfFooterLeft + tag);
        break;
      case 'fc':
        store.setHfFooterCenter(store.hfFooterCenter + tag);
        break;
      case 'fr':
        store.setHfFooterRight(store.hfFooterRight + tag);
        break;
    }
  };

  const handleApply = async () => {
    if (!document) return;

    store.setIsProcessing(true);
    try {
      const updatedDoc = await api.applyHeaderFooter({
        file_id: document.file_id,
        header_left: store.hfHeaderLeft,
        header_center: store.hfHeaderCenter,
        header_right: store.hfHeaderRight,
        footer_left: store.hfFooterLeft,
        footer_center: store.hfFooterCenter,
        footer_right: store.hfFooterRight,
        font_name: store.hfFontName,
        font_size: store.hfFontSize,
        color: store.hfColor,
        divider_line: store.hfDividerLine,
        divider_color: store.hfDividerColor,
        skip_cover: store.hfSkipCover,
        page_selection: store.pageRangeOption === 'selection' ? store.selectedPages : undefined,
        page_range: store.pageRangeOption === 'custom' ? store.customPageRange : undefined,
      });

      setDocument(updatedDoc);
      addToast({
        type: 'success',
        title: 'Headers & Footers Applied',
        message: 'Document stamped with customized 3-column headers and footers.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Apply Headers/Footers',
        message: err.message || 'An error occurred.',
      });
    } finally {
      store.setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dynamic Placeholder Tag Inserter */}
      <div className="flex flex-col gap-1.5 p-2.5 bg-blue-50/60 rounded-lg border border-blue-100">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900">
          <Tag className="w-3.5 h-3.5 text-studio-primary" />
          <span>Insert Dynamic Variables</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {[
            { label: '{title}', desc: 'Document Name' },
            { label: '{page}', desc: 'Page Number' },
            { label: '{total}', desc: 'Total Pages' },
            { label: '{date}', desc: 'Current Date' },
            { label: '{time}', desc: 'Current Time' },
          ].map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => insertTag(tag.label)}
              title={tag.desc}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 transition-colors"
            >
              + {tag.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-blue-600">
          Variables are dynamically calculated per page upon application.
        </span>
      </div>

      {/* Header Fields (3 columns) */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Top Header (3 Columns)
        </label>
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={store.hfHeaderLeft}
            onChange={(e) => store.setHfHeaderLeft(e.target.value)}
            onFocus={() => setLastActiveInput('hl')}
            placeholder="Header Left..."
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
          />
          <input
            type="text"
            value={store.hfHeaderCenter}
            onChange={(e) => store.setHfHeaderCenter(e.target.value)}
            onFocus={() => setLastActiveInput('hc')}
            placeholder="Header Center (e.g. {title})..."
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
          />
          <input
            type="text"
            value={store.hfHeaderRight}
            onChange={(e) => store.setHfHeaderRight(e.target.value)}
            onFocus={() => setLastActiveInput('hr')}
            placeholder="Header Right (e.g. {date})..."
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
          />
        </div>
      </div>

      {/* Footer Fields (3 columns) */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Bottom Footer (3 Columns)
        </label>
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={store.hfFooterLeft}
            onChange={(e) => store.setHfFooterLeft(e.target.value)}
            onFocus={() => setLastActiveInput('fl')}
            placeholder="Footer Left (e.g. Confidential)..."
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
          />
          <input
            type="text"
            value={store.hfFooterCenter}
            onChange={(e) => store.setHfFooterCenter(e.target.value)}
            onFocus={() => setLastActiveInput('fc')}
            placeholder="Footer Center (e.g. Page {page} of {total})..."
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
          />
          <input
            type="text"
            value={store.hfFooterRight}
            onChange={(e) => store.setHfFooterRight(e.target.value)}
            onFocus={() => setLastActiveInput('fr')}
            placeholder="Footer Right..."
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
          />
        </div>
      </div>

      {/* Typography & Divider Line */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Font</label>
          <select
            value={store.hfFontName}
            onChange={(e: any) => store.setHfFontName(e.target.value)}
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
            min="6"
            max="18"
            value={store.hfFontSize}
            onChange={(e) => store.setHfFontSize(parseInt(e.target.value, 10) || 9)}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Color</label>
          <input
            type="color"
            value={store.hfColor}
            onChange={(e) => store.setHfColor(e.target.value)}
            className="w-full h-8 rounded border border-slate-200 cursor-pointer p-0.5"
          />
        </div>
      </div>

      <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer pt-1">
        <span>Draw Subtle Divider Line</span>
        <input
          type="checkbox"
          checked={store.hfDividerLine}
          onChange={(e) => store.setHfDividerLine(e.target.checked)}
          className="accent-studio-primary rounded cursor-pointer"
        />
      </label>

      <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer pt-1">
        <span>Skip Cover Page (Page 1)</span>
        <input
          type="checkbox"
          checked={store.hfSkipCover}
          onChange={(e) => store.setHfSkipCover(e.target.checked)}
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
          <PanelTop className="w-4 h-4" />
          {store.isProcessing ? 'Applying...' : 'Apply Header & Footer'}
        </Button>
      </div>
    </div>
  );
};
