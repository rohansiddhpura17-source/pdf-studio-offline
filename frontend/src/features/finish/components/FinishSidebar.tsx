import React from 'react';
import {
  Minimize2,
  FileText,
  ShieldCheck,
  GitCompare,
  HardDrive,
} from 'lucide-react';
import { useFinishStore } from '../../../state/useFinishStore';
import { FinishSubTool } from '../../../types/finish';

interface ToolItem {
  id: FinishSubTool;
  label: string;
  badge: string;
  icon: React.ReactNode;
  desc: string;
}

const FINISH_TOOLS: ToolItem[] = [
  {
    id: 'compress',
    label: 'PDF Compression',
    badge: 'Tool 1',
    icon: <Minimize2 className="w-4 h-4" />,
    desc: 'Downsample raster assets & deflate streams',
  },
  {
    id: 'edit-metadata',
    label: 'Edit Metadata',
    badge: 'Tool 2',
    icon: <FileText className="w-4 h-4" />,
    desc: 'Update document info & PDF dictionary keys',
  },
  {
    id: 'remove-metadata',
    label: 'Remove Metadata',
    badge: 'Tool 3',
    icon: <ShieldCheck className="w-4 h-4" />,
    desc: 'Sanitize document info, XMP & privacy traces',
  },
  {
    id: 'compare',
    label: 'Compare PDFs',
    badge: 'Tool 4',
    icon: <GitCompare className="w-4 h-4" />,
    desc: 'Side-by-side visual diffs & textual changes',
  },
];

export const FinishSidebar: React.FC = () => {
  const { activeSubTool, setActiveSubTool } = useFinishStore();

  return (
    <aside className="w-64 border-r border-studio-border bg-white flex flex-col justify-between select-none z-10 flex-shrink-0">
      <div className="p-3">
        <div className="flex items-center justify-between px-3 py-1.5 mb-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
            Finish & Compare Tools
          </span>
          <span className="text-[9px] font-semibold bg-blue-50 text-studio-primary px-1.5 py-0.5 rounded">
            Module E
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {FINISH_TOOLS.map((tool) => {
            const isActive = activeSubTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveSubTool(tool.id)}
                className={`flex flex-col text-left p-2.5 rounded-xl transition-all border ${
                  isActive
                    ? 'bg-studio-primary/5 border-studio-primary/30 text-studio-navy shadow-2xs'
                    : 'border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg ${
                        isActive
                          ? 'bg-studio-primary text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tool.icon}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        isActive ? 'text-studio-primary' : 'text-slate-700'
                      }`}
                    >
                      {tool.label}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono font-medium">
                    {tool.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 pl-8">
                  {tool.desc}
                </p>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Offline Assurance badge at bottom */}
      <div className="p-3 m-3 rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
            <HardDrive className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-slate-800">100% Local Verification</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          All compression, metadata stripping, and dual-document comparisons run strictly in local Python memory.
        </p>
      </div>
    </aside>
  );
};
