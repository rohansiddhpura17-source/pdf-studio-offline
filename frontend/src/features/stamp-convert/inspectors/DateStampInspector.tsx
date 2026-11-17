import React from 'react';
import {Calendar, ShieldAlert} from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { PageRangeSelector } from './PageRangeSelector';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const DateStampInspector: React.FC = () => {
  const store = useStampConvertStore();
  const { document, setDocument, addToast } = useDocumentStore();

  const handleApply = async () => {
    if (!document) return;

    store.setIsProcessing(true);
    try {
      const updatedDoc = await api.applyDateStamp({
        file_id: document.file_id,
        date_format: store.dsDateFormat,
        custom_date: store.dsCustomDate.trim() || undefined,
        position: store.dsPosition,
        font_name: store.dsFontName,
        font_size: store.dsFontSize,
        color: store.dsColor,
        opacity: store.dsOpacity,
        rotation: store.dsRotation,
        page_selection: store.pageRangeOption === 'selection' ? store.selectedPages : undefined,
        page_range: store.pageRangeOption === 'custom' ? store.customPageRange : undefined,
      });

      setDocument(updatedDoc);
      addToast({
        type: 'success',
        title: 'Date Stamp Applied',
        message: 'Visual date stamp burned into document pages.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Apply Date Stamp',
        message: err.message || 'An error occurred.',
      });
    } finally {
      store.setIsProcessing(false);
    }
  };

  const positions = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'center', label: 'Center' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {/* Visual Stamp Notice Callout */}
      <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/80 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-amber-900 leading-snug">
          <strong className="block text-amber-950">Visual Stamp Notice</strong>
          This creates a visual document timestamp. It does not provide cryptographic PKI digital signatures.
        </div>
      </div>

      {/* Date Format Selection */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700">Date Preset Format</label>
        <select
          value={store.dsDateFormat}
          onChange={(e: any) => store.setDsDateFormat(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary bg-white"
        >
          <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 07/11/2026)</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/07/2026)</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
          <option value="full">Full Text (e.g. 07 November 2026)</option>
        </select>
      </div>

      {/* Custom Text Override */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700">
          Custom Date / Label (Optional)
        </label>
        <input
          type="text"
          value={store.dsCustomDate}
          onChange={(e) => store.setDsCustomDate(e.target.value)}
          placeholder="e.g. RECEIVED ON 07/11/2026"
          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
        />
      </div>

      {/* Position Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Position Alignment
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-lg border border-slate-200/80">
          {positions.map((pos) => {
            const isSelected = store.dsPosition === pos.id;
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => store.setDsPosition(pos.id)}
                className={`py-1.5 px-1 text-[11px] font-semibold rounded text-center transition-all ${
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

      {/* Typography & Color */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Font</label>
          <select
            value={store.dsFontName}
            onChange={(e: any) => store.setDsFontName(e.target.value)}
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
            max="32"
            value={store.dsFontSize}
            onChange={(e) => store.setDsFontSize(parseInt(e.target.value, 10) || 11)}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700">Color</label>
          <input
            type="color"
            value={store.dsColor}
            onChange={(e) => store.setDsColor(e.target.value)}
            className="w-full h-8 rounded border border-slate-200 cursor-pointer p-0.5"
          />
        </div>
      </div>

      {/* Opacity & Rotation */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Opacity</span>
          <span>{Math.round(store.dsOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={store.dsOpacity}
          onChange={(e) => store.setDsOpacity(parseFloat(e.target.value))}
          className="accent-studio-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Rotation</span>
          <span>{store.dsRotation}°</span>
        </div>
        <input
          type="range"
          min="-45"
          max="45"
          step="5"
          value={store.dsRotation}
          onChange={(e) => store.setDsRotation(parseInt(e.target.value, 10))}
          className="accent-studio-primary"
        />
      </div>

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
          <Calendar className="w-4 h-4" />
          {store.isProcessing ? 'Stamping Date...' : 'Apply Date Stamp'}
        </Button>
      </div>
    </div>
  );
};
