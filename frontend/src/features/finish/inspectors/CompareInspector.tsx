import React from 'react';
import {
  GitCompare,
  ExternalLink,
} from 'lucide-react';
import { useDocumentStore } from '../../../state/useDocumentStore';
import { useFinishStore } from '../../../state/useFinishStore';
import { Button } from '../../../components/common/Button';
import { api } from '../../../services/api';
import { CompareMode } from '../../../types/finish';

export const CompareInspector: React.FC = () => {
  const { document, addToast } = useDocumentStore();
  const {
    originalFileId,
    revisedFileId,
    compareMode,
    setCompareMode,
    sensitivityThreshold,
    setSensitivityThreshold,
    compareResult,
    setCompareResult,
    activeDiffPage,
    setActiveDiffPage,
    isComparing,
    setIsComparing,
  } = useFinishStore();

  const handleRunComparison = async () => {
    const origId = originalFileId || document?.file_id;
    if (!origId || !revisedFileId) {
      addToast({
        type: 'warning',
        title: 'Select Revised Document',
        message: 'Upload or generate a revised PDF before starting comparison.',
      });
      return;
    }

    setIsComparing(true);
    try {
      const res = await api.comparePdfs({
        original_file_id: origId,
        revised_file_id: revisedFileId,
        mode: compareMode,
        sensitivity_threshold: sensitivityThreshold,
      });

      setCompareResult(res);
      setActiveDiffPage(1);
      addToast({
        type: 'success',
        title: 'Comparison Complete',
        message: `Analysis completed in ${res.duration_ms} ms.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Comparison Failed',
        message: err.message || 'Comparison failed.',
      });
    } finally {
      setIsComparing(false);
    }
  };

  const handleExportHtml = () => {
    if (!compareResult) return;
    const url = api.getComparisonReportUrl(compareResult.comparison_id, 'html');
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-5 text-xs text-slate-700">
      {/* Comparison Scope Mode */}
      <div>
        <label className="block text-xs font-bold text-slate-900 mb-2">
          Comparison Mode
        </label>
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
          {(['all', 'text', 'visual'] as CompareMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCompareMode(mode)}
              className={`py-1.5 rounded-lg font-semibold text-center capitalize transition-all ${
                compareMode === mode
                  ? 'bg-white text-violet-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Sensitivity Threshold */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-slate-800">Visual Sensitivity</span>
          <span className="font-mono font-bold text-violet-600">{sensitivityThreshold}</span>
        </div>
        <input
          type="range"
          min="5"
          max="50"
          step="5"
          value={sensitivityThreshold}
          onChange={(e) => setSensitivityThreshold(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>High (5)</span>
          <span>Normal (15)</span>
          <span>Low (50)</span>
        </div>
      </div>

      {/* Difference Summary (if computed) */}
      {compareResult && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2.5">
          <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
            Detected Variances
          </span>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Text Modifications</span>
            <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
              {compareResult.total_text_differences} changes
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Visual Shift Pages</span>
            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {compareResult.pages_with_visual_changes.length} pages
            </span>
          </div>

          {/* Quick jump to changed pages */}
          {compareResult.pages_with_visual_changes.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                Jump to Changed Page:
              </span>
              <div className="flex flex-wrap gap-1">
                {compareResult.pages_with_visual_changes.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActiveDiffPage(p)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      activeDiffPage === p
                        ? 'bg-violet-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    p.{p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={handleRunComparison}
          disabled={isComparing || !revisedFileId}
          icon={
            isComparing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <GitCompare className="w-4 h-4" />
            )
          }
          className="w-full justify-center bg-violet-600 hover:bg-violet-700 shadow-subtle py-2.5"
        >
          {isComparing ? 'Running Comparison...' : 'Run Comparison'}
        </Button>

        {compareResult && (
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportHtml}
            icon={<ExternalLink className="w-3.5 h-3.5 text-violet-600" />}
            className="w-full justify-center"
          >
            Export HTML Report
          </Button>
        )}
      </div>
    </div>
  );
};
