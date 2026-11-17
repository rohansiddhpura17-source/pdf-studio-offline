import React from 'react';
import {
  Save,
  RotateCcw,
} from 'lucide-react';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { useFinishStore } from '../../../state/useFinishStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';
import { formatBytes } from '../../../utils/format';

export const MetadataInspector: React.FC = () => {
  const { document, setDocument, addToast } = useDocumentStore();
  const {
    metadataInfo,
    documentProperties,
    isMetadataDirty,
    resetMetadataToInitial,
    loadMetadata,
    isProcessing,
    setIsProcessing,
  } = useFinishStore();

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
        message: 'PDF document metadata dictionary updated.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not update metadata.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 text-xs text-slate-700">
      {/* Properties summary */}
      {documentProperties && (
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col gap-2">
          <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
            Document Catalog
          </span>
          <div className="flex justify-between text-slate-600">
            <span>Specification</span>
            <span className="font-semibold text-slate-800">PDF {documentProperties.pdf_version}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Size</span>
            <span className="font-semibold text-slate-800">{formatBytes(documentProperties.file_size_bytes)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Pages</span>
            <span className="font-semibold text-slate-800">{documentProperties.page_count}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>XMP Metadata</span>
            <span className="font-semibold text-slate-800">
              {documentProperties.has_xmp ? 'Embedded' : 'None'}
            </span>
          </div>
        </div>
      )}

      {/* Editing State Summary */}
      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col gap-1 text-[11px] text-blue-900">
        <span className="font-bold">Metadata Status</span>
        <p>
          {isMetadataDirty
            ? 'You have uncommitted modifications. Click Save to write updates to the PDF file.'
            : 'All metadata fields match the current document dictionary.'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={isProcessing || !isMetadataDirty}
          icon={
            isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )
          }
          className="w-full justify-center py-2.5 shadow-subtle"
        >
          {isProcessing ? 'Saving Metadata...' : 'Save Metadata'}
        </Button>

        <Button
          variant="ghost"
          size="md"
          onClick={resetMetadataToInitial}
          disabled={!isMetadataDirty}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          className="text-slate-500 justify-center"
        >
          Discard Edits
        </Button>
      </div>
    </div>
  );
};
