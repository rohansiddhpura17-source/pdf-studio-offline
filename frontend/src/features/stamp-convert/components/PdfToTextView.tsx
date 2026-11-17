import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Download,
  Search,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useStampConvertStore } from '../../../state/useStampConvertStore';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { Button } from '../../../components/common/Button';

export const PdfToTextView: React.FC = () => {
  const {
    p2tExtractedResult,
    p2tMode,
    p2tSearchQuery,
    setP2tSearchQuery,
    isProcessing,
  } = useStampConvertStore();

  const { document, addToast } = useDocumentStore();
  const [activeTab, setActiveTab] = useState<'all' | number>('all');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: 'Extracted text copied to system clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!p2tExtractedResult) return;
    const blob = new Blob([p2tExtractedResult.full_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document?.filename?.replace('.pdf', '') || 'document'}_extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      title: 'Download Started',
      message: 'Text file exported successfully.',
    });
  };

  const getDisplayedText = () => {
    if (!p2tExtractedResult) return '';
    if (activeTab === 'all') {
      return p2tExtractedResult.full_text;
    }
    const pageItem = p2tExtractedResult.pages.find((p) => p.page_number === activeTab);
    return pageItem ? pageItem.text : '';
  };

  const textToDisplay = getDisplayedText();

  // Highlight search occurrences if query is active
  const renderHighlightedContent = (text: string) => {
    if (!p2tSearchQuery.trim()) {
      return text || <span className="text-slate-400 italic">No text found on this page.</span>;
    }

    const escaped = p2tSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-xs px-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden p-6">
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full gap-4">
        {/* Header */}
        <div className="bg-white p-5 rounded-xl border border-studio-border shadow-xs flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold tracking-wide uppercase">
                Tool 7 — Module D
              </span>
              <h2 className="text-lg font-bold text-studio-navy">PDF to Text Extractor</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Extract raw textual content with structure preservation, page segmentation, and OCR detection.
            </p>
          </div>

          {p2tExtractedResult && (
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(textToDisplay)}
                className="text-xs flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy Text'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadTxt}
                className="text-xs flex items-center gap-1.5 bg-studio-primary"
              >
                <Download className="w-3.5 h-3.5" />
                Download .TXT
              </Button>
            </div>
          )}
        </div>

        {/* State 1: Awaiting extraction */}
        {!p2tExtractedResult && (
          <div className="flex-1 border border-slate-200 rounded-2xl bg-white p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-studio-primary flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Ready to Extract Text
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Select your extraction mode (<strong>Plain Text</strong> or <strong>Preserve Layout</strong>) and target page range in the right inspector, then click <strong>Extract Text</strong>.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                Scanned documents without embedded text layers will be flagged automatically with OCR notice.
              </span>
            </div>
          </div>
        )}

        {/* State 2: Extracted Result */}
        {p2tExtractedResult && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Scanned Document Warning Notice (if applicable) */}
            {p2tExtractedResult.has_scanned_pages && (
              <div className="bg-amber-50 border-b border-amber-200 p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-amber-900 block mb-0.5">
                    Scanned Document or Low-Text Density Detected
                  </span>
                  <p className="text-amber-800 leading-snug">
                    {p2tExtractedResult.scanned_warning ||
                      'One or more pages contain scanned raster images with little or no digital text stream. Vector text extraction was applied; optical character recognition (OCR) is not included.'}
                  </p>
                </div>
              </div>
            )}

            {/* Toolbar: Tabs & Search Filter */}
            <div className="h-12 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50 flex-shrink-0">
              {/* Page Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[60%]">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white text-studio-primary shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Full Document ({p2tExtractedResult.total_characters} chars)
                </button>
                {p2tExtractedResult.pages.map((p) => (
                  <button
                    key={p.page_number}
                    onClick={() => setActiveTab(p.page_number)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTab === p.page_number
                        ? 'bg-white text-studio-primary shadow-2xs border border-slate-200 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Page {p.page_number} {p.is_likely_scanned && '⚠️'}
                  </button>
                ))}
              </div>

              {/* Search Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={p2tSearchQuery}
                    onChange={(e) => setP2tSearchQuery(e.target.value)}
                    placeholder="Search in extracted text..."
                    className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-studio-primary w-48 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Content Viewport */}
            <div className="flex-1 overflow-auto p-6 bg-white font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap select-text">
              {renderHighlightedContent(textToDisplay)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
