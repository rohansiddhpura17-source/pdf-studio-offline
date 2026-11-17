import React from 'react';
import {
  Plus,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { api } from '../../services/api';

export const PageNavigator: React.FC = () => {
  const {
    document,
    currentPage,
    setCurrentPage,
    selectedPages,
    togglePageSelection,
    addToast,
  } = useDocumentStore();

  if (!document) return null;

  return (
    <aside className="w-48 border-r border-studio-border bg-slate-50/60 flex flex-col justify-between select-none z-10 flex-shrink-0">
      <div className="p-3 border-b border-studio-border/70 flex items-center justify-between bg-white">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
          Pages ({document.page_count})
        </span>
      </div>

      {/* Thumbnails Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {document.pages.map((page) => {
          const isActive = currentPage === page.page_number;
          const isSelected = selectedPages.includes(page.page_number);
          const thumbUrl = api.getPageThumbnailUrl(document.file_id, page.page_number, 200);

          return (
            <div
              key={page.page_number}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                  togglePageSelection(page.page_number, true);
                } else {
                  setCurrentPage(page.page_number);
                }
              }}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`relative w-32 aspect-[1/1.414] bg-white rounded-md border shadow-subtle overflow-hidden transition-all duration-150 ${
                  isActive
                    ? 'border-studio-primary ring-2 ring-studio-primary/25 shadow-card'
                    : isSelected
                    ? 'border-indigo-400 bg-indigo-50/30'
                    : 'border-studio-border hover:border-slate-400'
                }`}
                style={{
                  transform: `rotate(${page.rotation}deg)`,
                }}
              >
                {/* Thumbnail Image */}
                <img
                  src={thumbUrl}
                  alt={`Page ${page.page_number}`}
                  loading="lazy"
                  className="w-full h-full object-contain pointer-events-none"
                  onError={(e) => {
                    // Fallback to placeholder if thumbnail service is warming up
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Page Number Badge overlay */}
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-900/60 text-white backdrop-blur-xs">
                  {page.page_number}
                </span>
              </div>

              {/* Page Number below */}
              <span className={`text-[11px] mt-1.5 font-medium ${isActive ? 'text-studio-primary font-bold' : 'text-slate-500'}`}>
                Page {page.page_number}
              </span>
            </div>
          );
        })}

        {/* Add Page Button */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => {
              addToast({
                type: 'info',
                title: 'Organise Module',
                message: 'Use the Organise tab in the left rail to insert blank pages or merge documents.',
              });
            }}
            className="w-32 py-2 border-2 border-dashed border-slate-300 hover:border-studio-primary rounded-lg text-xs text-slate-500 hover:text-studio-primary flex items-center justify-center gap-1.5 transition-colors bg-white/50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add page</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
