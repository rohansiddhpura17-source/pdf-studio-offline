import React, { useState } from 'react';
import {
  RotateCw,
  Copy,
  Trash2,
  Check,
  GripVertical,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { api } from '../../services/api';

interface PageGridProps {
  onQuickRotate?: (pageNum: number) => void;
  onQuickDuplicate?: (pageNum: number) => void;
  onQuickDelete?: (pageNum: number) => void;
  onReorderPages?: (newOrder: number[]) => void;
}

export const PageGrid: React.FC<PageGridProps> = ({
  onQuickRotate,
  onQuickDuplicate,
  onQuickDelete,
  onReorderPages,
}) => {
  const {
    document,
    selectedPages,
    togglePageSelection,
    setSelectedPages,
    currentPage,
    setCurrentPage,
  } = useDocumentStore();

  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!document) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPageIndex(index);
    e.dataTransfer.setData('text/plain', `${index}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedPageIndex === null || draggedPageIndex === targetIndex) return;

    // Calculate new page order
    const pagesList = document.pages.map((p) => p.page_number);
    const movedItem = pagesList[draggedPageIndex];
    pagesList.splice(draggedPageIndex, 1);
    pagesList.splice(targetIndex, 0, movedItem);

    setDraggedPageIndex(null);
    if (onReorderPages) {
      onReorderPages(pagesList);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 select-none bg-studio-bg">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {document.pages.map((page, index) => {
          const isSelected = selectedPages.includes(page.page_number);
          const isCurrent = currentPage === page.page_number;
          const isDragging = draggedPageIndex === index;
          const isOver = dragOverIndex === index;
          const thumbUrl = api.getPageThumbnailUrl(document.file_id, page.page_number, 260);

          return (
            <div
              key={`${page.page_number}-${index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={() => {
                setDraggedPageIndex(null);
                setDragOverIndex(null);
              }}
              onDrop={(e) => handleDrop(e, index)}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                  togglePageSelection(page.page_number, true);
                } else {
                  togglePageSelection(page.page_number, false);
                }
              }}
              className={`group relative flex flex-col items-center p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                isDragging
                  ? 'opacity-40 scale-95'
                  : isOver
                  ? 'ring-2 ring-studio-primary ring-offset-2 scale-[1.02]'
                  : isSelected
                  ? 'bg-blue-50/60 ring-2 ring-studio-primary shadow-card'
                  : 'bg-white hover:bg-slate-50 border border-studio-border hover:shadow-subtle'
              }`}
            >
              {/* Drag Handle & Selection Indicator */}
              <div className="w-full flex items-center justify-between mb-1.5 px-0.5">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-studio-primary text-white'
                      : 'border border-slate-300 group-hover:border-slate-400 bg-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePageSelection(page.page_number, true);
                  }}
                  title="Toggle Selection"
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600">
                  <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing" />
                </div>
              </div>

              {/* Page Thumbnail */}
              <div
                className="relative w-full aspect-[1/1.414] bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs flex items-center justify-center"
                style={{
                  transform: `rotate(${page.rotation}deg)`,
                }}
              >
                <img
                  src={thumbUrl}
                  alt={`Page ${page.page_number}`}
                  loading="lazy"
                  className="w-full h-full object-contain pointer-events-none"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Page Number Overlay */}
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900/70 text-white backdrop-blur-xs">
                  {page.page_number}
                </span>
              </div>

              {/* Bottom Label and Quick Action Hover Buttons */}
              <div className="w-full mt-2 flex items-center justify-between text-xs">
                <span className={`font-semibold ${isSelected ? 'text-studio-primary' : 'text-studio-navy'}`}>
                  Page {page.page_number}
                </span>

                {/* Quick actions on hover */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  {onQuickRotate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickRotate(page.page_number);
                      }}
                      className="p-1 text-slate-500 hover:text-studio-primary hover:bg-slate-200/60 rounded"
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                  {onQuickDuplicate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickDuplicate(page.page_number);
                      }}
                      className="p-1 text-slate-500 hover:text-studio-primary hover:bg-slate-200/60 rounded"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                  {onQuickDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickDelete(page.page_number);
                      }}
                      className="p-1 text-slate-500 hover:text-studio-danger hover:bg-red-50 rounded"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
