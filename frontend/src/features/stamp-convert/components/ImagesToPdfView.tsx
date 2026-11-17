import React, { useRef } from 'react';
import {
  UploadCloud,
  Trash2,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Plus,
} from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { Button } from '../../../components/common/Button';

export const ImagesToPdfView: React.FC = () => {
  const {
    imgQueue,
    addImagesToQueue,
    removeImageFromQueue,
    reorderImageQueue,
    rotateImageInQueue,
    clearImageQueue,
    isProcessing,
  } = useStampConvertStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useDocumentStore();

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: { id: string; name: string; data_base64: string; rotation: number }[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        addToast({
          type: 'warning',
          title: 'Invalid File',
          message: `${file.name} is not an image file (PNG, JPEG, WebP accepted).`,
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const b64 = e.target?.result as string;
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          data_base64: b64,
          rotation: 0,
        });

        if (newItems.length === files.length) {
          addImagesToQueue(newItems);
          addToast({
            type: 'success',
            title: 'Images Added',
            message: `Added ${newItems.length} image(s) to compilation queue.`,
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-xl border border-studio-border shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold tracking-wide uppercase">
                Tool 5 — Module D
              </span>
              <h2 className="text-lg font-bold text-studio-navy">Images to PDF Converter</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Batch compile multiple PNG, JPEG, or WebP images into a single standardized PDF document.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {imgQueue.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearImageQueue}
                disabled={isProcessing}
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
              >
                Clear Queue
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Images
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              multiple
              accept="image/png,image/jpeg,image/webp,image/tiff"
              className="hidden"
            />
          </div>
        </div>

        {/* Dropzone */}
        {imgQueue.length === 0 ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white hover:bg-blue-50/30 hover:border-studio-primary transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[300px]"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-studio-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Drag & Drop Images Here
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Supports PNG, JPEG, and WebP. Add high-resolution photos, scanned pages, or diagrams to compile.
            </p>
            <Button variant="outline" size="sm" className="pointer-events-none text-xs">
              Select Images from Computer
            </Button>
          </div>
        ) : (
          /* Queue Grid */
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1">
              <span>{imgQueue.length} Image(s) in Compilation Sequence</span>
              <span className="text-slate-400">Reorder with arrows or adjust orientation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {imgQueue.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col transition-all hover:shadow-md group"
                >
                  {/* Thumbnail Container */}
                  <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden p-2">
                    <img
                      src={item.data_base64}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain transition-transform"
                      style={{
                        transform: `rotate(${item.rotation || 0}deg)`,
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Page {idx + 1}
                    </div>
                  </div>

                  {/* Metadata and Controls */}
                  <div className="p-3 flex flex-col justify-between flex-1 gap-2 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </span>

                    <div className="flex items-center justify-between pt-1">
                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => idx > 0 && reorderImageQueue(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-600"
                          title="Move Earlier"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => idx < imgQueue.length - 1 && reorderImageQueue(idx, idx + 1)}
                          disabled={idx === imgQueue.length - 1}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-600"
                          title="Move Later"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Rotate & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => rotateImageInQueue(item.id, 90)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600"
                          title="Rotate 90° Clockwise"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeImageFromQueue(item.id)}
                          className="p-1 rounded hover:bg-red-50 text-red-500"
                          title="Remove from Queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
