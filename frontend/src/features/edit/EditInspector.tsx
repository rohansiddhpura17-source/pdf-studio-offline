import React from 'react';
import {
  EyeOff,
  ShieldAlert,
  PenLine,
  Trash2,
  Bold,
  Italic,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useEditStore } from '../../state/useEditStore';
import { ShapeType } from '../../types/edit';
import { Button } from '../../components/common/Button';

export const EditInspector: React.FC = () => {
  const { activeTool, currentPage, document, addToast } = useDocumentStore();
  const {
    selectedId,
    selectedType,
    deleteSelected,
    fontFamily,
    fontSize,
    textColor,
    bold,
    italic,
    textAlign,
    textOpacity,
    shapeType,
    strokeColor,
    strokeWidth,
    fillColor,
    shapeOpacity,
    shapeRadius,
    highlightColor,
    highlightOpacity,
    drawColor,
    drawWidth,
    drawOpacity,
    redactFillColor,
    redactTextColor,
    redactOverlayText,
    redactTargetText,
    redactMode,
    signerName,
    includeTimestamp,
    formFields,
    formValues,
    flattenForms,
    setToolConfig,
    setFlattenForms,
    setIsSignatureModalOpen,
    setIsRedactConfirmOpen,
    setPendingRedactItem,
    addImageItem,
    texts,
    updateTextItem,
    shapes,
    updateShapeItem,
  } = useEditStore();

  const selectedText = selectedId ? texts.find((t) => t.id === selectedId) : null;
  const selectedShape = selectedId ? shapes.find((s) => s.id === selectedId) : null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      addImageItem({
        id: Math.random().toString(36).substring(2, 9),
        page_number: currentPage,
        image_base64: b64,
        x: 100,
        y: 300,
        width: 180,
        height: 120,
        opacity: 1.0,
      });
      addToast({
        type: 'success',
        title: 'Image Added',
        message: 'Image placed on canvas. Drag to reposition.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSearchRedact = () => {
    if (!redactTargetText.trim()) {
      addToast({ type: 'warning', title: 'Target Text Missing', message: 'Enter text to redact.' });
      return;
    }
    setPendingRedactItem({
      id: Math.random().toString(36).substring(2, 9),
      page_number: currentPage,
      rects: [],
      target_text: redactTargetText.trim(),
      fill_color: redactFillColor,
      text_color: redactTextColor,
      overlay_text: redactOverlayText,
    });
    setIsRedactConfirmOpen(true);
  };

  return (
    <aside className="w-64 border-l border-studio-border bg-white flex flex-col justify-between p-4 select-none z-10 flex-shrink-0 overflow-y-auto">
      <div className="space-y-5">
        {/* Header */}
        <div className="border-b border-studio-border pb-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Tool Inspector
            </span>
            <h3 className="text-xs font-bold text-studio-navy capitalize mt-0.5">
              {selectedId ? `Edit ${selectedType}` : `${activeTool} Properties`}
            </h3>
          </div>
          {selectedId && (
            <button
              onClick={deleteSelected}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete Selected Item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 1. TEXT TOOL PROPERTIES */}
        {(activeTool === 'text' || selectedText) && (
          <div className="space-y-3.5 text-xs">
            {selectedText && (
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Text Content</label>
                <textarea
                  value={selectedText.text}
                  onChange={(e) => updateTextItem(selectedText.id, { text: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-studio-border rounded-lg text-studio-navy focus:outline-none focus:ring-1 focus:ring-studio-primary resize-none h-16"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">Font Family</label>
              <select
                value={selectedText ? selectedText.font_family : fontFamily}
                onChange={(e) => {
                  setToolConfig({ fontFamily: e.target.value });
                  if (selectedText) updateTextItem(selectedText.id, { font_family: e.target.value });
                }}
                className="w-full text-xs bg-slate-50 border border-studio-border rounded-lg px-2.5 py-1.5 text-slate-700"
              >
                <option value="Helvetica">Helvetica (Standard Sans)</option>
                <option value="Times-Roman">Times New Roman (Serif)</option>
                <option value="Courier">Courier (Monospace)</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Size</label>
                <input
                  type="number"
                  min={8}
                  max={72}
                  value={selectedText ? selectedText.font_size : fontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setToolConfig({ fontSize: val });
                    if (selectedText) updateTextItem(selectedText.id, { font_size: val });
                  }}
                  className="w-full text-xs bg-slate-50 border border-studio-border rounded-lg px-2.5 py-1.5 text-slate-700"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Color</label>
                <input
                  type="color"
                  value={selectedText ? selectedText.color : textColor}
                  onChange={(e) => {
                    setToolConfig({ textColor: e.target.value });
                    if (selectedText) updateTextItem(selectedText.id, { color: e.target.value });
                  }}
                  className="w-9 h-8 rounded border border-studio-border cursor-pointer bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 pt-1">
              <button
                onClick={() => {
                  const b = selectedText ? !selectedText.bold : !bold;
                  setToolConfig({ bold: b });
                  if (selectedText) updateTextItem(selectedText.id, { bold: b });
                }}
                className={`p-1.5 rounded border text-xs ${
                  (selectedText ? selectedText.bold : bold)
                    ? 'bg-studio-primary/10 border-studio-primary text-studio-primary font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const it = selectedText ? !selectedText.italic : !italic;
                  setToolConfig({ italic: it });
                  if (selectedText) updateTextItem(selectedText.id, { italic: it });
                }}
                className={`p-1.5 rounded border text-xs ${
                  (selectedText ? selectedText.italic : italic)
                    ? 'bg-studio-primary/10 border-studio-primary text-studio-primary'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 2. SHAPES TOOL PROPERTIES */}
        {(activeTool === 'shapes' || selectedShape) && (
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">Shape Type</label>
              <select
                value={selectedShape ? selectedShape.shape_type : shapeType}
                onChange={(e) => {
                  const st = e.target.value as ShapeType;
                  setToolConfig({ shapeType: st });
                  if (selectedShape) updateShapeItem(selectedShape.id, { shape_type: st });
                }}
                className="w-full text-xs bg-slate-50 border border-studio-border rounded-lg px-2.5 py-1.5 text-slate-700"
              >
                <option value="rect">Rectangle</option>
                <option value="rounded_rect">Rounded Rectangle</option>
                <option value="circle">Circle</option>
                <option value="ellipse">Ellipse</option>
                <option value="line">Line</option>
                <option value="arrow">Arrow</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Stroke (px)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={selectedShape ? selectedShape.stroke_width : strokeWidth}
                  onChange={(e) => {
                    const sw = Number(e.target.value);
                    setToolConfig({ strokeWidth: sw });
                    if (selectedShape) updateShapeItem(selectedShape.id, { stroke_width: sw });
                  }}
                  className="w-full text-xs bg-slate-50 border border-studio-border rounded-lg px-2.5 py-1.5 text-slate-700"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Stroke Color</label>
                <input
                  type="color"
                  value={selectedShape ? selectedShape.stroke_color : strokeColor}
                  onChange={(e) => {
                    setToolConfig({ strokeColor: e.target.value });
                    if (selectedShape) updateShapeItem(selectedShape.id, { stroke_color: e.target.value });
                  }}
                  className="w-9 h-8 rounded border border-studio-border cursor-pointer bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">Fill Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedShape?.fill_color || fillColor || '#FFFFFF'}
                  onChange={(e) => {
                    setToolConfig({ fillColor: e.target.value });
                    if (selectedShape) updateShapeItem(selectedShape.id, { fill_color: e.target.value });
                  }}
                  className="w-9 h-8 rounded border border-studio-border cursor-pointer bg-white"
                />
                <button
                  onClick={() => {
                    setToolConfig({ fillColor: '' });
                    if (selectedShape) updateShapeItem(selectedShape.id, { fill_color: undefined });
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-700 underline"
                >
                  Transparent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. HIGHLIGHT TOOL PROPERTIES */}
        {activeTool === 'highlight' && (
          <div className="space-y-3.5 text-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Preset Colors</span>
            <div className="flex items-center gap-2">
              {[
                { name: 'Yellow', hex: '#FFE500' },
                { name: 'Green', hex: '#4CAF50' },
                { name: 'Blue', hex: '#2196F3' },
                { name: 'Pink', hex: '#E91E63' },
                { name: 'Orange', hex: '#FF9800' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setToolConfig({ highlightColor: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  className={`w-6 h-6 rounded-full border ${
                    highlightColor === c.hex ? 'ring-2 ring-studio-primary ring-offset-1' : 'border-slate-300'
                  }`}
                  title={c.name}
                />
              ))}
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                Transparency: {Math.round(highlightOpacity * 100)}%
              </label>
              <input
                type="range"
                min={0.2}
                max={0.8}
                step={0.05}
                value={highlightOpacity}
                onChange={(e) => setToolConfig({ highlightOpacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* 4. DRAW TOOL PROPERTIES */}
        {activeTool === 'draw' && (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-500">Brush Color</label>
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setToolConfig({ drawColor: e.target.value })}
                className="w-8 h-7 rounded border border-studio-border cursor-pointer bg-white"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>Stroke Width</span>
                <span>{drawWidth}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={drawWidth}
                onChange={(e) => setToolConfig({ drawWidth: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* 5. IMAGE TOOL PROPERTIES */}
        {activeTool === 'image' && (
          <div className="space-y-3.5 text-xs">
            <label className="text-[11px] font-medium text-slate-500 block">Upload Image</label>
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-studio-primary rounded-xl cursor-pointer bg-slate-50 hover:bg-studio-primary/5 transition-colors">
              <Upload className="w-5 h-5 text-studio-primary mb-1.5" />
              <span className="text-xs font-semibold text-studio-navy">Browse Image</span>
              <span className="text-[10px] text-slate-400">PNG, JPEG, WebP</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* 6. WHITEOUT TOOL PROPERTIES */}
        {activeTool === 'whiteout' && (
          <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl space-y-2 text-xs text-amber-900 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold">
              <EyeOff className="w-4 h-4 text-amber-700" />
              <span>Cosmetic Obscuration</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Whiteout overlays an opaque white rectangle to visually hide content without deleting underlying PDF data streams.
            </p>
            <p className="text-[10px] text-amber-700">
              To permanently sanitize and delete underlying text from the file, use <strong>Redact</strong> instead.
            </p>
          </div>
        )}

        {/* 7. REDACT TOOL PROPERTIES */}
        {activeTool === 'redact' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-900 text-[11px]">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Secure Redaction</strong>
                Permanently rewrites and removes text glyphs and objects from the PDF content stream.
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">Search & Redact Text</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. SSN, Account #"
                  value={redactTargetText}
                  onChange={(e) => setToolConfig({ redactTargetText: e.target.value })}
                  className="flex-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-studio-border rounded-lg text-studio-navy"
                />
                <Button variant="danger" size="sm" onClick={handleSearchRedact}>
                  Sanitize
                </Button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">Overlay Text</label>
              <input
                type="text"
                value={redactOverlayText}
                onChange={(e) => setToolConfig({ redactOverlayText: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-studio-border rounded-lg text-studio-navy"
              />
            </div>
          </div>
        )}

        {/* 8. SIGN TOOL PROPERTIES */}
        {activeTool === 'sign' && (
          <div className="space-y-3.5 text-xs">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSignatureModalOpen(true)}
              className="w-full justify-center"
            >
              <PenLine className="w-3.5 h-3.5 mr-1.5" />
              Open Signature Pad
            </Button>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <span className="font-semibold block text-slate-700">Digital Signature Stamp</span>
              <span>Draw, type, or upload your signature to place on any document page.</span>
            </div>
          </div>
        )}

        {/* 9. FORM TOOL PROPERTIES */}
        {activeTool === 'form' && (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">AcroForm Fields</span>
              <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium">
                {formFields.length} detected
              </span>
            </div>

            {formFields.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-[11px]">
                No AcroForm fields detected in this PDF. Use <strong>Text</strong> tool to fill fields manually.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {formFields.slice(0, 8).map((f) => (
                  <div key={f.name} className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">{f.field_type}</span>
                    <span className="font-medium text-studio-navy truncate block">{f.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                id="flattenCheck"
                checked={flattenForms}
                onChange={(e) => setFlattenForms(e.target.checked)}
                className="rounded text-studio-primary focus:ring-studio-primary"
              />
              <label htmlFor="flattenCheck" className="text-[11px] text-slate-600 select-none">
                Flatten form fields on export
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="border-t border-studio-border pt-3 mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        <span>Edits preview live on canvas</span>
      </div>
    </aside>
  );
};
