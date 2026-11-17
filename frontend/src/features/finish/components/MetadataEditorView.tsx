import React, { useEffect, useState } from 'react';
import {
  FileText,
  Save,
  RotateCcw,
  Plus,
  Trash2,
} from 'lucide-react';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { useFinishStore } from '../../../state/useFinishStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';
import { formatBytes } from '../../../utils/format';

export const MetadataEditorView: React.FC = () => {
  const { document, setDocument, addToast } = useDocumentStore();
  const {
    metadataInfo,
    documentProperties,
    loadMetadata,
    isLoadingMetadata,
    isMetadataDirty,
    setMetadataField,
    setCustomMetadataField,
    removeCustomMetadataField,
    resetMetadataToInitial,
    isProcessing,
    setIsProcessing,
  } = useFinishStore();

  const [newCustomKey, setNewCustomKey] = useState('');
  const [newCustomVal, setNewCustomVal] = useState('');

  useEffect(() => {
    if (document?.file_id) {
      loadMetadata(document.file_id);
    }
  }, [document?.file_id]);

  const handleSave = async () => {
    if (!document) return;
    setIsProcessing(true);
    try {
      const updatedDoc = await api.editMetadata({
        file_id: document.file_id,
        metadata: metadataInfo,
      });
      setDocument(updatedDoc);
      await loadMetadata(updatedDoc.file_id);
      addToast({
        type: 'success',
        title: 'Metadata Saved',
        message: 'PDF document metadata dictionary has been updated.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Metadata Failed',
        message: err.message || 'Could not update document metadata.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCustom = () => {
    if (!newCustomKey.trim()) return;
    setCustomMetadataField(newCustomKey.trim(), newCustomVal.trim());
    setNewCustomKey('');
    setNewCustomVal('');
  };

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500">
        <p>No document loaded for metadata inspection.</p>
      </div>
    );
  }

  const customKeys = Object.entries(metadataInfo.custom_metadata || {});
  const keywordsList = (metadataInfo.keywords || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Header Banner */}
        <div className="bg-white border border-studio-border rounded-2xl p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-studio-primary flex items-center justify-center font-bold text-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-studio-navy">
                  PDF Metadata & Technical Properties
                </h2>
                <p className="text-xs text-slate-500">
                  Inspect and edit standard PDF `/Info` dictionary entries, document Dublin Core tags, and custom metadata keys.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isMetadataDirty && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                  Unsaved Edits
                </span>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isProcessing || !isMetadataDirty}
                icon={<Save className="w-4 h-4" />}
              >
                {isProcessing ? 'Saving...' : 'Save Metadata'}
              </Button>
            </div>
          </div>
        </div>

        {/* Technical Properties Bar */}
        {documentProperties && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-studio-border shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                PDF Specification
              </span>
              <p className="text-sm font-bold text-slate-800 mt-1">
                PDF v{documentProperties.pdf_version}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-studio-border shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Page Dimensions
              </span>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {documentProperties.page_dimensions}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-studio-border shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                File Size & Pages
              </span>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {formatBytes(documentProperties.file_size_bytes)} ({documentProperties.page_count}p)
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-studio-border shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                XMP Stream
              </span>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {documentProperties.has_xmp ? 'Present (XML)' : 'None'}
              </p>
            </div>
          </div>
        )}

        {/* Metadata Editor Form */}
        <div className="bg-white border border-studio-border rounded-2xl p-6 shadow-card flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Document Information Dictionary</h3>
            <button
              onClick={resetMetadataToInitial}
              disabled={!isMetadataDirty}
              className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Changes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={metadataInfo.title || ''}
                onChange={(e) => setMetadataField('title', e.target.value)}
                placeholder="e.g. Quarterly Financial Report"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-studio-primary/20 focus:border-studio-primary bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Author
              </label>
              <input
                type="text"
                value={metadataInfo.author || ''}
                onChange={(e) => setMetadataField('author', e.target.value)}
                placeholder="e.g. John Doe, Research Lead"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-studio-primary/20 focus:border-studio-primary bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={metadataInfo.subject || ''}
                onChange={(e) => setMetadataField('subject', e.target.value)}
                placeholder="e.g. Financial performance Q3 2026"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-studio-primary/20 focus:border-studio-primary bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keywords (Comma Separated)
              </label>
              <input
                type="text"
                value={metadataInfo.keywords || ''}
                onChange={(e) => setMetadataField('keywords', e.target.value)}
                placeholder="e.g. finance, audit, 2026, confidential"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-studio-primary/20 focus:border-studio-primary bg-slate-50/50"
              />
              {keywordsList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {keywordsList.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-medium bg-blue-50 text-studio-primary px-2 py-0.5 rounded-full border border-blue-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Creator (Authoring Application)
              </label>
              <input
                type="text"
                value={metadataInfo.creator || ''}
                onChange={(e) => setMetadataField('creator', e.target.value)}
                placeholder="e.g. PDF Studio / Microsoft Word"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-studio-primary/20 focus:border-studio-primary bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Producer (PDF Generation Engine)
              </label>
              <input
                type="text"
                value={metadataInfo.producer || ''}
                onChange={(e) => setMetadataField('producer', e.target.value)}
                placeholder="e.g. PDF Studio Engine 2.0"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-studio-primary/20 focus:border-studio-primary bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Creation Date
              </label>
              <input
                type="text"
                value={metadataInfo.creation_date || ''}
                onChange={(e) => setMetadataField('creation_date', e.target.value)}
                placeholder="e.g. D:20261107120000Z"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-studio-primary/20 focus:border-studio-primary bg-slate-50/50 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modification Date
              </label>
              <input
                type="text"
                value={metadataInfo.mod_date || ''}
                onChange={(e) => setMetadataField('mod_date', e.target.value)}
                placeholder="e.g. D:20261107120000Z"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-studio-primary/20 focus:border-studio-primary bg-slate-50/50 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Custom Metadata Keys Section */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">
              Custom Dictionary Metadata Keys
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Add bespoke organization or indexing metadata fields to the document header.
            </p>

            {customKeys.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-3">
                {customKeys.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-studio-primary">/{k}</span>
                      <span className="text-slate-400">=</span>
                      <span className="text-slate-700">{v}</span>
                    </div>
                    <button
                      onClick={() => removeCustomMetadataField(k)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Delete key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCustomKey}
                onChange={(e) => setNewCustomKey(e.target.value)}
                placeholder="Key (e.g. Department)"
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg w-40 focus:outline-none focus:border-studio-primary bg-white"
              />
              <input
                type="text"
                value={newCustomVal}
                onChange={(e) => setNewCustomVal(e.target.value)}
                placeholder="Value (e.g. Finance)"
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg flex-1 focus:outline-none focus:border-studio-primary bg-white"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddCustom}
                disabled={!newCustomKey.trim()}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Key
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
