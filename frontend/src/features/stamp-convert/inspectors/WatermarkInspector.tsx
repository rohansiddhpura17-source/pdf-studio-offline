import React, { useRef } from 'react';
import {Stamp, Upload, Type, Image as ImageIcon} from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { PageRangeSelector } from './PageRangeSelector';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';

export const WatermarkInspector: React.FC = () => {
  const store = useStampConvertStore();
  const { document, setDocument, addToast } = useDocumentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select a valid image file (PNG, JPEG, WebP).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      store.setWmImageBase64(b64);
      addToast({
        type: 'success',
        title: 'Image Watermark Loaded',
        message: 'Watermark logo ready for placement.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleApply = async () => {
    if (!document) return;

    if (store.wmType === 'text' && !store.wmText.trim()) {
      addToast({
        type: 'warning',
        title: 'Text Required',
        message: 'Please enter watermark text before applying.',
      });
      return;
    }

    if (store.wmType === 'image' && !store.wmImageBase64) {
      addToast({
        type: 'warning',
        title: 'Image Required',
        message: 'Please upload an image logo before applying watermark.',
      });
      return;
    }

    store.setIsProcessing(true);
    try {
      const updatedDoc = await api.applyWatermark({
        file_id: document.file_id,
        type: store.wmType,
        text: store.wmText,
        font_name: store.wmFontName,
        font_size: store.wmFontSize,
        color: store.wmColor,
        opacity: store.wmOpacity,
        rotation: store.wmRotation,
        placement: store.wmPlacement,
        repeat: store.wmRepeat,
        repeat_density: store.wmRepeatDensity,
        image_base64: store.wmImageBase64,
        image_scale: store.wmImageScale,
        maintain_aspect_ratio: store.wmMaintainAspect,
        page_selection: store.pageRangeOption === 'selection' ? store.selectedPages : undefined,
        page_range: store.pageRangeOption === 'custom' ? store.customPageRange : undefined,
      });

      setDocument(updatedDoc);
      addToast({
        type: 'success',
        title: 'Watermark Applied',
        message: `Successfully applied watermark across document.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Apply Watermark',
        message: err.message || 'An unexpected error occurred.',
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
          Watermark Type
        </label>
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => store.setWmType('text')}
            className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
              store.wmType === 'text'
                ? 'bg-white text-studio-primary shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Text
          </button>
          <button
            type="button"
            onClick={() => store.setWmType('image')}
            className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
              store.wmType === 'image'
                ? 'bg-white text-studio-primary shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Image / Logo
          </button>
        </div>
      </div>

      {/* TEXT MODE */}
      {store.wmType === 'text' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">Watermark Text</label>
            <input
              type="text"
              value={store.wmText}
              onChange={(e) => store.setWmText(e.target.value)}
              placeholder="e.g. CONFIDENTIAL, DRAFT, COPY"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary"
            />
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['CONFIDENTIAL', 'DRAFT', 'COPY', 'APPROVED', 'FINAL'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => store.setWmText(preset)}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Font & Color */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Font</label>
              <select
                value={store.wmFontName}
                onChange={(e: any) => store.setWmFontName(e.target.value)}
                className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-studio-primary bg-white"
              >
                <option value="Helvetica">Helvetica</option>
                <option value="Times-Roman">Times New Roman</option>
                <option value="Courier">Courier</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={store.wmColor}
                  onChange={(e) => store.setWmColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
                />
                <span className="text-xs font-mono text-slate-600">{store.wmColor}</span>
              </div>
            </div>
          </div>

          {/* Size & Opacity */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Font Size</span>
              <span>{store.wmFontSize} pt</span>
            </div>
            <input
              type="range"
              min="16"
              max="96"
              value={store.wmFontSize}
              onChange={(e) => store.setWmFontSize(parseInt(e.target.value, 10))}
              className="accent-studio-primary"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Opacity</span>
              <span>{Math.round(store.wmOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={store.wmOpacity}
              onChange={(e) => store.setWmOpacity(parseFloat(e.target.value))}
              className="accent-studio-primary"
            />
          </div>

          {/* Rotation */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Rotation Angle</span>
              <span>{store.wmRotation}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={store.wmRotation}
              onChange={(e) => store.setWmRotation(parseInt(e.target.value, 10))}
              className="accent-studio-primary"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <button type="button" onClick={() => store.setWmRotation(0)} className="hover:text-slate-800">0° (Horizontal)</button>
              <button type="button" onClick={() => store.setWmRotation(45)} className="hover:text-slate-800">45° (Diagonal)</button>
              <button type="button" onClick={() => store.setWmRotation(90)} className="hover:text-slate-800">90° (Vertical)</button>
            </div>
          </div>

          {/* Layer Placement & Grid Tiling */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Placement Layer</span>
              <select
                value={store.wmPlacement}
                onChange={(e: any) => store.setWmPlacement(e.target.value)}
                className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white"
              >
                <option value="foreground">Foreground (Over Content)</option>
                <option value="background">Background (Underlay)</option>
              </select>
            </div>

            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer pt-1">
              <span>Repeat Tiling Grid</span>
              <input
                type="checkbox"
                checked={store.wmRepeat}
                onChange={(e) => store.setWmRepeat(e.target.checked)}
                className="accent-studio-primary rounded cursor-pointer"
              />
            </label>

            {store.wmRepeat && (
              <div className="flex items-center justify-between text-xs text-slate-600 pl-2">
                <span>Grid Density</span>
                <select
                  value={store.wmRepeatDensity}
                  onChange={(e: any) => store.setWmRepeatDensity(e.target.value)}
                  className="text-xs px-2 py-0.5 border border-slate-200 rounded bg-white"
                >
                  <option value="loose">Loose (2×2)</option>
                  <option value="medium">Medium (2×3)</option>
                  <option value="dense">Dense (3×4)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IMAGE MODE */}
      {store.wmType === 'image' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">Watermark Image</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              {store.wmImageBase64 ? (
                <div className="flex items-center gap-2">
                  <img src={store.wmImageBase64} alt="Thumb" className="w-12 h-12 object-contain rounded border" />
                  <span className="text-xs text-slate-600 font-medium">Change Image</span>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-600">Select PNG / JPEG / WebP</span>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Image Scale</span>
              <span>{Math.round(store.wmImageScale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.05"
              value={store.wmImageScale}
              onChange={(e) => store.setWmImageScale(parseFloat(e.target.value))}
              className="accent-studio-primary"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Opacity</span>
              <span>{Math.round(store.wmOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={store.wmOpacity}
              onChange={(e) => store.setWmOpacity(parseFloat(e.target.value))}
              className="accent-studio-primary"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Rotation</span>
              <span>{store.wmRotation}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={store.wmRotation}
              onChange={(e) => store.setWmRotation(parseInt(e.target.value, 10))}
              className="accent-studio-primary"
            />
          </div>

          <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer pt-1">
            <span>Maintain Aspect Ratio</span>
            <input
              type="checkbox"
              checked={store.wmMaintainAspect}
              onChange={(e) => store.setWmMaintainAspect(e.target.checked)}
              className="accent-studio-primary rounded cursor-pointer"
            />
          </label>
        </div>
      )}

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
          <Stamp className="w-4 h-4" />
          {store.isProcessing ? 'Applying Watermark...' : 'Apply Watermark'}
        </Button>
      </div>
    </div>
  );
};
