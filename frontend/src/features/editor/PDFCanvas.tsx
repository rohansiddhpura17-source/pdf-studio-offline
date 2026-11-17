import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useDocumentStore } from '../../state/useDocumentStore';
import { api } from '../../services/api';
import { AnnotationLayer } from '../edit/AnnotationLayer';

// Configure local offline PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const PDFCanvas: React.FC = () => {
  const {
    document,
    currentPage,
    zoom,
    zoomMode,
    setZoom,
    activeTool,
    addToast,
  } = useDocumentStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Load PDF Document instance when document file_id changes
  useEffect(() => {
    if (!document) {
      setPdfDocProxy(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const docUrl = api.getDocumentDownloadUrl(document.file_id);
    const loadingTask = pdfjsLib.getDocument({
      url: docUrl,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
    });

    loadingTask.promise
      .then((loadedDoc) => {
        if (!isCancelled) {
          setPdfDocProxy(loadedDoc);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('PDF.js loading error:', err);
          setError('Failed to render PDF canvas. The document might be corrupted.');
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      loadingTask.destroy();
    };
  }, [document?.file_id]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDocProxy || !canvasRef.current || !containerRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocProxy.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Auto zoom calculation if fit-width or fit-page is set
        let effectiveScale = zoom;
        if (zoomMode === 'fit-width' && containerRef.current) {
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const availableWidth = containerRef.current.clientWidth - 80;
          effectiveScale = Math.max(0.4, availableWidth / unscaledViewport.width);
          setZoom(parseFloat(effectiveScale.toFixed(2)));
        } else if (zoomMode === 'fit-page' && containerRef.current) {
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const availableHeight = containerRef.current.clientHeight - 80;
          effectiveScale = Math.max(0.4, availableHeight / unscaledViewport.height);
          setZoom(parseFloat(effectiveScale.toFixed(2)));
        }

        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: effectiveScale * pixelRatio });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / pixelRatio}px`;
        canvas.style.height = `${viewport.height / pixelRatio}px`;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (!isCancelled) {
          setCanvasSize({
            width: viewport.width / pixelRatio,
            height: viewport.height / pixelRatio,
          });
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page rendering error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDocProxy, currentPage, zoom, zoomMode]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-studio-bg overflow-auto p-8 flex items-center justify-center relative select-none"
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-20">
          <div className="w-8 h-8 border-3 border-studio-primary border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-semibold text-studio-navy">Rendering PDF Page {currentPage}...</span>
        </div>
      )}

      {error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl max-w-md text-center text-xs text-red-700">
          <p className="font-semibold mb-1">Canvas Render Error</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="relative shadow-2xl rounded-sm transition-all duration-100 bg-white">
          <canvas ref={canvasRef} className="block rounded-sm" />

          {/* Interactive Annotation Overlay Layer */}
          {canvasSize.width > 0 && document && (
            <AnnotationLayer
              pageWidth={canvasSize.width}
              pageHeight={canvasSize.height}
              pdfWidth={document.pages.find((p) => p.page_number === currentPage)?.width || 612}
              pdfHeight={document.pages.find((p) => p.page_number === currentPage)?.height || 792}
            />
          )}
        </div>
      )}
    </div>
  );
};
