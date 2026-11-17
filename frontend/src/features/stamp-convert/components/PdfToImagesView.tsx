import React, { useState } from 'react';
import {
  Images,
  Download,
  Archive,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';
import { formatBytes } from '../../../utils/format';

export const PdfToImagesView: React.FC = () => {
  const { p2iRenderedResult, p2iFormat, p2iDpi, isProcessing } = useStampConvertStore();
  const { document } = useDocumentStore();
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  const downloadSingleImage = (b64: string, pageNum: number, ext: string) => {
    const a = window.document.createElement('a');
    a.href = b64;
    a.download = `${document?.filename?.replace('.pdf', '') || 'document'}_page_${pageNum}.${ext}`;
    a.click();
  };

  const downloadZipArchive = () => {
    if (!p2iRenderedResult?.archive_file_id) return;
    const url = api.getArchiveDownloadUrl(p2iRenderedResult.archive_file_id);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document?.filename?.replace('.pdf', '') || 'document'}_images.zip`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-studio-border shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold tracking-wide uppercase">
                Tool 6 — Module D
              </span>
              <h2 className="text-lg font-bold text-studio-navy">PDF to Images Rasterizer</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Extract PDF pages as standalone high-resolution PNG or JPEG images with automated ZIP packaging.
            </p>
          </div>

          {p2iRenderedResult && p2iRenderedResult.archive_file_id && (
            <Button
              variant="primary"
              size="sm"
              onClick={downloadZipArchive}
              className="text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Archive className="w-3.5 h-3.5" />
              Download All as ZIP
            </Button>
          )}
        </div>

        {/* State 1: Not yet rendered */}
        {!p2iRenderedResult && (
          <div className="border border-slate-200 rounded-2xl bg-white p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-studio-primary flex items-center justify-center mb-4">
              <Images className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Ready to Rasterize Document Pages
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Configure your desired format (PNG / JPEG), resolution ({p2iDpi} DPI), and page range in the right inspector, then click <strong>Render Images & Export</strong>.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg w-full text-left">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Format</span>
                <span className="text-xs font-semibold text-slate-700 uppercase">{p2iFormat} Lossless</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Resolution</span>
                <span className="text-xs font-semibold text-slate-700">{p2iDpi} DPI Engine</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Document</span>
                <span className="text-xs font-semibold text-slate-700">{document?.page_count || 0} Pages</span>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Rendered gallery */}
        {p2iRenderedResult && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-900">
                  {p2iRenderedResult.total_pages_rendered} page(s) rendered at {p2iRenderedResult.dpi || p2iDpi} DPI ({(p2iRenderedResult.format || p2iFormat || 'png').toUpperCase()})
                </span>
              </div>
              <span className="text-slate-500">
                Click download on any image or use Download All as ZIP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {p2iRenderedResult.images.map((img) => (
                <div
                  key={img.page_number}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col group hover:shadow-md transition-all"
                >
                  <div
                    onClick={() => setPreviewModalImg(img.image_base64)}
                    className="relative h-56 bg-slate-100 flex items-center justify-center p-3 cursor-pointer group-hover:bg-slate-200/50 transition-colors"
                  >
                    <img
                      src={img.image_base64}
                      alt={`Page ${img.page_number}`}
                      className="max-h-full max-w-full object-contain shadow-xs rounded"
                    />
                    <div className="absolute top-2 left-2 bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Page {img.page_number}
                    </div>
                    <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="bg-white/90 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Full Preview
                      </span>
                    </div>
                  </div>

                  <div className="p-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Page {img.page_number}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {img.width} × {img.height} px • {formatBytes(img.size_bytes)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSingleImage(img.image_base64, img.page_number, img.format)}
                      className="text-xs flex items-center gap-1.5 hover:bg-studio-primary hover:text-white hover:border-studio-primary transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full preview modal */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-6 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl p-3 shadow-2xl overflow-auto">
            <img src={previewModalImg} alt="Preview" className="max-h-[85vh] w-auto object-contain mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
};
