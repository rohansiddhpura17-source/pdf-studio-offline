import React from 'react';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react';
import { useEditStore } from '../../state/useEditStore';
import { useDocumentStore } from '../../state/useDocumentStore';
import { Button } from '../../components/common/Button';

export const RedactionConfirmDialog: React.FC = () => {
  const {
    isRedactConfirmOpen,
    setIsRedactConfirmOpen,
    pendingRedactItem,
    setPendingRedactItem,
    addRedactItem,
  } = useEditStore();

  const { addToast } = useDocumentStore();

  if (!isRedactConfirmOpen || !pendingRedactItem) return null;

  const handleConfirm = () => {
    addRedactItem(pendingRedactItem);
    setIsRedactConfirmOpen(false);
    setPendingRedactItem(null);
    addToast({
      type: 'warning',
      title: 'Redaction Queued',
      message: 'Redaction marked. Underlying text and objects will be permanently sanitized when changes are applied.',
    });
  };

  const handleCancel = () => {
    setIsRedactConfirmOpen(false);
    setPendingRedactItem(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-700">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h3 className="text-sm font-bold">Permanent Redaction Warning</h3>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3.5 text-xs text-slate-600 leading-relaxed">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Irreversible Operation:</strong> Secure Redaction does not merely cover content with a black box. It permanently destroys and rewrites underlying text operators, glyphs, and annotations from the PDF content stream.
            </span>
          </div>

          <p>
            Once you commit or export this document, the redacted text cannot be copied, searched, extracted via OCR, or recovered by any PDF inspection tool.
          </p>

          {pendingRedactItem.target_text && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-700 block mb-0.5">Target Text Pattern:</span>
              <code className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded font-mono">
                {pendingRedactItem.target_text}
              </code>
            </div>
          )}

          <div className="text-[11px] text-slate-500">
            If you only need a temporary visual cover without deleting data, consider using the <strong>Whiteout</strong> tool instead.
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            Confirm & Redact
          </button>
        </div>
      </div>
    </div>
  );
};
