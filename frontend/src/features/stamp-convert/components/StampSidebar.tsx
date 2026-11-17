import React from 'react';
import {
  Stamp,
  Hash,
  PanelTop,
  Calendar,
  ImagePlus,
  Images,
  FileText,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';
import { useStampConvertStore, StampConvertTool } from '../../../state/useStampConvertStore';

interface ToolItem {
  id: StampConvertTool;
  label: string;
  icon: React.ReactNode;
  desc: string;
  category: 'stamp' | 'convert';
}

const TOOLS: ToolItem[] = [
  // Module C: Stamp
  {
    id: 'watermark',
    label: 'Watermark',
    icon: <Stamp className="w-4 h-4" />,
    desc: 'Text or logo watermark overlay / underlay',
    category: 'stamp',
  },
  {
    id: 'page-numbers',
    label: 'Page Numbers',
    icon: <Hash className="w-4 h-4" />,
    desc: '6 positions, Roman/Arabic, skip cover',
    category: 'stamp',
  },
  {
    id: 'header-footer',
    label: 'Header & Footer',
    icon: <PanelTop className="w-4 h-4" />,
    desc: '3-column dynamic placeholders & dividers',
    category: 'stamp',
  },
  {
    id: 'date-stamp',
    label: 'Date Stamp',
    icon: <Calendar className="w-4 h-4" />,
    desc: 'Localized visual timestamp annotation',
    category: 'stamp',
  },
  // Module D: Convert
  {
    id: 'images-to-pdf',
    label: 'Images to PDF',
    icon: <ImagePlus className="w-4 h-4" />,
    desc: 'Batch compile PNG/JPEG images into PDF',
    category: 'convert',
  },
  {
    id: 'pdf-to-images',
    label: 'PDF to Images',
    icon: <Images className="w-4 h-4" />,
    desc: 'Export high-DPI pages to PNG/JPEG & ZIP',
    category: 'convert',
  },
  {
    id: 'pdf-to-text',
    label: 'PDF to Text',
    icon: <FileText className="w-4 h-4" />,
    desc: 'Extract plain or layout text with OCR alert',
    category: 'convert',
  },
];

export const StampSidebar: React.FC = () => {
  const { activeSubTool, setActiveSubTool } = useStampConvertStore();

  const stampTools = TOOLS.filter((t) => t.category === 'stamp');
  const convertTools = TOOLS.filter((t) => t.category === 'convert');

  return (
    <aside className="w-64 border-r border-studio-border bg-white flex flex-col justify-between select-none z-10 flex-shrink-0">
      <div className="flex flex-col p-3 overflow-y-auto">
        {/* Module C Section */}
        <div className="flex items-center gap-2 px-3 py-1.5 mb-1 text-[11px] font-bold tracking-wider uppercase text-slate-400">
          <Layers className="w-3.5 h-3.5 text-studio-primary" />
          <span>Module C — Stamp</span>
        </div>
        <nav className="flex flex-col gap-1 mb-5">
          {stampTools.map((tool) => {
            const isActive = activeSubTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveSubTool(tool.id)}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-studio-primary/10 text-studio-primary font-semibold shadow-2xs border border-studio-primary/20'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-studio-navy border border-transparent'
                }`}
              >
                <div className={`mt-0.5 p-1 rounded-md ${isActive ? 'bg-studio-primary text-white' : 'text-slate-500 bg-slate-100'}`}>
                  {tool.icon}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold leading-tight">{tool.label}</span>
                  <span className="text-[10px] text-slate-500 truncate mt-0.5">{tool.desc}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Module D Section */}
        <div className="flex items-center gap-2 px-3 py-1.5 mb-1 text-[11px] font-bold tracking-wider uppercase text-slate-400 border-t border-slate-100 pt-3">
          <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
          <span>Module D — Convert</span>
        </div>
        <nav className="flex flex-col gap-1">
          {convertTools.map((tool) => {
            const isActive = activeSubTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveSubTool(tool.id)}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-studio-primary/10 text-studio-primary font-semibold shadow-2xs border border-studio-primary/20'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-studio-navy border border-transparent'
                }`}
              >
                <div className={`mt-0.5 p-1 rounded-md ${isActive ? 'bg-studio-primary text-white' : 'text-slate-500 bg-slate-100'}`}>
                  {tool.icon}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold leading-tight">{tool.label}</span>
                  <span className="text-[10px] text-slate-500 truncate mt-0.5">{tool.desc}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Offline Status Badge at bottom */}
      <div className="p-3 m-3 rounded-lg bg-emerald-50/60 border border-emerald-200/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-semibold text-emerald-900">Local Hardware Engine</span>
        </div>
        <p className="text-[10px] text-emerald-700 mt-1 leading-snug">
          Zero network transit. Conversion and stamping operate entirely in your local sandbox.
        </p>
      </div>
    </aside>
  );
};
