import React, { useState } from 'react';
import {
  ShieldCheck,
  Trash2,
  Laptop,
  Info,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useDocumentStore } from '../../state/useDocumentStore';
import { api } from '../../services/api';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, addToast } = useDocumentStore();
  const [isPurging, setIsPurging] = useState(false);

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      const result = await api.cleanupTempStorage();
      addToast({
        type: 'success',
        title: 'Cache Purged',
        message: `Removed ${result.purged_count} temporary files from your disk.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Purge Failed',
        message: 'Could not delete temporary files.',
      });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
      title="Application Settings"
      subtitle="PDF Studio · Privacy, storage and preferences"
      maxWidth="lg"
    >
      <div className="space-y-6 text-sm text-studio-navy">
        {/* Privacy & Storage Section */}
        <div>
          <div className="flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wider text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Privacy & Local Storage</span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
            <p className="text-xs text-emerald-900 leading-relaxed">
              <strong>100% Offline Promise:</strong> All PDF document parsing, page operations, annotations, and redactions execute purely in your local browser and local loopback Python service (<code className="bg-emerald-100/80 px-1 py-0.5 rounded">127.0.0.1</code>). Zero document bytes leave your computer.
            </p>
            <div className="pt-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Temporary Working Cache</p>
                <p className="text-[11px] text-slate-500">Purge local temporary session files from disk.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5 text-studio-danger" />}
                onClick={handlePurge}
                disabled={isPurging}
              >
                {isPurging ? 'Purging...' : 'Purge Cache'}
              </Button>
            </div>
          </div>
        </div>

        {/* Viewer Defaults */}
        <div>
          <div className="flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wider text-slate-500">
            <Laptop className="w-4 h-4 text-studio-primary" />
            <span>Viewer Defaults</span>
          </div>
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-studio-border text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Target Viewport</p>
                <p className="text-slate-500">Optimised for 1440px desktop viewports with responsive scaling.</p>
              </div>
              <span className="font-mono bg-white px-2 py-1 rounded border border-studio-border text-slate-700">
                1440 × 900
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <div>
                <p className="font-semibold text-slate-800">Reduced Motion</p>
                <p className="text-slate-500">Disable subtle UI animations across panels and modals.</p>
              </div>
              <input type="checkbox" className="rounded text-studio-primary focus:ring-studio-primary" />
            </div>
          </div>
        </div>

        {/* About & Licenses */}
        <div>
          <div className="flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wider text-slate-500">
            <Info className="w-4 h-4 text-slate-400" />
            <span>About & Open Source Licences</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-studio-border text-xs space-y-1.5 text-slate-600">
            <p><strong>PDF Studio</strong> Version 1.0.0 (Phase 1 Foundation)</p>
            <p>Project 1 — Bharat Space Education Research Centre (BSERC) GenAI Internship (Week 2)</p>
            <div className="pt-2 text-[11px] text-slate-500 space-y-1">
              <p>• <strong>PyMuPDF (fitz)</strong>: GNU AGPLv3 (Local personal & educational offline usage)</p>
              <p>• <strong>pypdf</strong>: BSD 3-Clause License (Permissive pure-Python PDF manipulation)</p>
              <p>• <strong>Pillow</strong>: HPND License (Image transcoding and downsampling)</p>
              <p>• <strong>PDF.js</strong>: Apache 2.0 License (Client-side rendering engine)</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
