import React, { useRef, useState } from 'react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useEditStore } from '../../state/useEditStore';
import {Point} from '../../types/edit';

interface AnnotationLayerProps {
  pageWidth: number;   // Displayed CSS width in pixels
  pageHeight: number;  // Displayed CSS height in pixels
  pdfWidth: number;    // Unscaled PDF points (e.g. 612)
  pdfHeight: number;   // Unscaled PDF points (e.g. 792)
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  pageWidth,
  pageHeight,
  pdfWidth,
  pdfHeight,
}) => {
  const { currentPage, activeTool, setActiveTool } = useDocumentStore();
  const {
    texts,
    images,
    highlights,
    drawings,
    shapes,
    whiteouts,
    redactions,
    signatures,
    formFields,
    formValues,
    setFormValue,
    selectedId,
    setSelectedId,
    addTextItem,
    addHighlightItem,
    addDrawingPath,
    addShapeItem,
    addWhiteoutItem,
    setPendingRedactItem,
    setIsRedactConfirmOpen,
    setIsSignatureModalOpen,
    fontFamily,
    fontSize,
    textColor,
    bold,
    italic,
    shapeType,
    strokeColor,
    strokeWidth,
    fillColor,
    shapeOpacity,
    highlightColor,
    highlightOpacity,
    drawColor,
    drawWidth,
    drawOpacity,
    redactFillColor,
    redactTextColor,
    redactOverlayText,
  } = useEditStore();

  const containerRef = useRef<HTMLDivElement>(null);

  // Drag creation state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [activeDrawPoints, setActiveDrawPoints] = useState<Point[]>([]);

  // Moving existing annotation state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Coordinate conversion factors
  const scaleX = pageWidth / pdfWidth;
  const scaleY = pageHeight / pdfHeight;

  // Convert browser pixel to PDF points (bottom-left origin)
  const clientToPdfCoords = (clientX: number, clientY: number, heightPt: number = 0) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const xPt = px / scaleX;
    const yTopPt = py / scaleY;
    const yPt = pdfHeight - yTopPt - heightPt;

    return { x: xPt, y: yPt, px, py };
  };

  // Convert PDF points to display CSS pixels
  const pdfToCssCoords = (xPt: number, yPt: number, heightPt: number = 0) => {
    const leftPx = xPt * scaleX;
    const topPx = (pdfHeight - yPt - heightPt) * scaleY;
    return { leftPx, topPx };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (activeTool === 'select') {
      // Deselect if clicking empty space
      if ((e.target as HTMLElement) === containerRef.current) {
        setSelectedId(null, null);
      }
      return;
    }

    if (activeTool === 'text') {
      const { x, y } = clientToPdfCoords(e.clientX, e.clientY, fontSize);
      const newText = {
        id: Math.random().toString(36).substring(2, 9),
        page_number: currentPage,
        text: 'Type text here',
        x,
        y,
        font_family: fontFamily,
        font_size: fontSize,
        color: textColor,
        bold,
        italic,
        align: 'left' as const,
        opacity: 1.0,
      };
      addTextItem(newText);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'sign') {
      setIsSignatureModalOpen(true);
      return;
    }

    // Tools requiring drag interaction
    if (['draw', 'highlight', 'shapes', 'whiteout', 'redact'].includes(activeTool)) {
      setIsDrawing(true);
      setStartPoint({ x: px, y: py });
      setCurrentPoint({ x: px, y: py });

      if (activeTool === 'draw') {
        const { x, y } = clientToPdfCoords(e.clientX, e.clientY);
        setActiveDrawPoints([{ x, y }]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (isDrawing) {
      setCurrentPoint({ x: px, y: py });
      if (activeTool === 'draw') {
        const { x, y } = clientToPdfCoords(e.clientX, e.clientY);
        setActiveDrawPoints((prev) => [...prev, { x, y }]);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !currentPoint) {
      setIsDrawing(false);
      return;
    }

    const minX = Math.min(startPoint.x, currentPoint.x);
    const maxX = Math.max(startPoint.x, currentPoint.x);
    const minY = Math.min(startPoint.y, currentPoint.y);
    const maxY = Math.max(startPoint.y, currentPoint.y);

    const widthPx = Math.max(10, maxX - minX);
    const heightPx = Math.max(10, maxY - minY);

    const widthPt = widthPx / scaleX;
    const heightPt = heightPx / scaleY;
    const xPt = minX / scaleX;
    const yPt = pdfHeight - (minY / scaleY) - heightPt;

    if (activeTool === 'draw') {
      if (activeDrawPoints.length > 1) {
        addDrawingPath(currentPage, {
          points: activeDrawPoints,
          color: drawColor,
          width: drawWidth,
          opacity: drawOpacity,
        });
      }
      setActiveDrawPoints([]);
    } else if (activeTool === 'highlight') {
      addHighlightItem({
        id: Math.random().toString(36).substring(2, 9),
        page_number: currentPage,
        rects: [{ x: xPt, y: yPt, width: widthPt, height: heightPt }],
        color: highlightColor,
        opacity: highlightOpacity,
      });
    } else if (activeTool === 'shapes') {
      addShapeItem({
        id: Math.random().toString(36).substring(2, 9),
        page_number: currentPage,
        shape_type: shapeType,
        x: xPt,
        y: yPt,
        width: widthPt,
        height: heightPt,
        stroke_color: strokeColor,
        stroke_width: strokeWidth,
        fill_color: fillColor || undefined,
        opacity: shapeOpacity,
      });
      setActiveTool('select');
    } else if (activeTool === 'whiteout') {
      addWhiteoutItem({
        id: Math.random().toString(36).substring(2, 9),
        page_number: currentPage,
        rects: [{ x: xPt, y: yPt, width: widthPt, height: heightPt }],
      });
    } else if (activeTool === 'redact') {
      setPendingRedactItem({
        id: Math.random().toString(36).substring(2, 9),
        page_number: currentPage,
        rects: [{ x: xPt, y: yPt, width: widthPt, height: heightPt }],
        fill_color: redactFillColor,
        text_color: redactTextColor,
        overlay_text: redactOverlayText,
      });
      setIsRedactConfirmOpen(true);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  // Filter items on current page
  const pageTexts = texts.filter((t) => t.page_number === currentPage);
  const pageImages = images.filter((img) => img.page_number === currentPage);
  const pageHighlights = highlights.filter((hl) => hl.page_number === currentPage);
  const pageDrawings = drawings.filter((d) => d.page_number === currentPage);
  const pageShapes = shapes.filter((s) => s.page_number === currentPage);
  const pageWhiteouts = whiteouts.filter((w) => w.page_number === currentPage);
  const pageRedactions = redactions.filter((r) => r.page_number === currentPage);
  const pageSignatures = signatures.filter((sig) => sig.page_number === currentPage);
  const pageFormFields = formFields.filter((f) => f.page_number === currentPage || !f.page_number);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ width: `${pageWidth}px`, height: `${pageHeight}px` }}
      className={`absolute inset-0 select-none ${
        activeTool === 'draw'
          ? 'cursor-crosshair'
          : activeTool === 'text'
          ? 'cursor-text'
          : activeTool === 'select'
          ? 'cursor-default'
          : 'cursor-crosshair'
      }`}
    >
      {/* 1. Highlights Layer */}
      {pageHighlights.map((hl) =>
        hl.rects.map((r, i) => {
          const { leftPx, topPx } = pdfToCssCoords(r.x, r.y, r.height);
          return (
            <div
              key={`${hl.id}-${i}`}
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${r.width * scaleX}px`,
                height: `${r.height * scaleY}px`,
                backgroundColor: hl.color,
                opacity: hl.opacity,
              }}
              className="absolute pointer-events-none mix-blend-multiply rounded-xs"
            />
          );
        })
      )}

      {/* 2. Whiteout Layer */}
      {pageWhiteouts.map((wo) =>
        wo.rects.map((r, i) => {
          const { leftPx, topPx } = pdfToCssCoords(r.x, r.y, r.height);
          return (
            <div
              key={`${wo.id}-${i}`}
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${r.width * scaleX}px`,
                height: `${r.height * scaleY}px`,
              }}
              className="absolute bg-white shadow-xs border border-dashed border-slate-200"
            />
          );
        })
      )}

      {/* 3. Secure Redaction Layer */}
      {pageRedactions.map((redact) =>
        redact.rects.map((r, i) => {
          const { leftPx, topPx } = pdfToCssCoords(r.x, r.y, r.height);
          return (
            <div
              key={`${redact.id}-${i}`}
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${r.width * scaleX}px`,
                height: `${r.height * scaleY}px`,
                backgroundColor: redact.fill_color,
                color: redact.text_color,
              }}
              className="absolute flex items-center justify-center font-mono font-bold text-[10px] tracking-wider select-none overflow-hidden"
            >
              {redact.overlay_text}
            </div>
          );
        })
      )}

      {/* 4. Vector Drawings (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {pageDrawings.map((draw) =>
          draw.paths.map((p, idx) => {
            const pointsStr = p.points
              .map((pt) => {
                const { leftPx, topPx } = pdfToCssCoords(pt.x, pt.y);
                return `${leftPx},${topPx}`;
              })
              .join(' ');
            return (
              <polyline
                key={`${draw.id}-${idx}`}
                points={pointsStr}
                stroke={p.color}
                strokeWidth={p.width * scaleX}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={p.opacity}
              />
            );
          })
        )}
        {/* Active live stroke being drawn */}
        {activeDrawPoints.length > 1 && (
          <polyline
            points={activeDrawPoints
              .map((pt) => {
                const { leftPx, topPx } = pdfToCssCoords(pt.x, pt.y);
                return `${leftPx},${topPx}`;
              })
              .join(' ')}
            stroke={drawColor}
            strokeWidth={drawWidth * scaleX}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={drawOpacity}
          />
        )}
      </svg>

      {/* 5. Geometric Shapes */}
      {pageShapes.map((shape) => {
        const { leftPx, topPx } = pdfToCssCoords(shape.x, shape.y, shape.height);
        const wPx = shape.width * scaleX;
        const hPx = shape.height * scaleY;
        const isSelected = selectedId === shape.id;

        return (
          <div
            key={shape.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(shape.id, 'shape');
            }}
            style={{
              left: `${leftPx}px`,
              top: `${topPx}px`,
              width: `${wPx}px`,
              height: `${hPx}px`,
            }}
            className={`absolute cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-studio-primary ring-offset-1' : ''
            }`}
          >
            <svg className="w-full h-full overflow-visible">
              {shape.shape_type === 'rect' && (
                <rect
                  x={0}
                  y={0}
                  width={wPx}
                  height={hPx}
                  stroke={shape.stroke_color}
                  strokeWidth={shape.stroke_width * scaleX}
                  fill={shape.fill_color || 'none'}
                  opacity={shape.opacity}
                />
              )}
              {shape.shape_type === 'rounded_rect' && (
                <rect
                  x={0}
                  y={0}
                  width={wPx}
                  height={hPx}
                  rx={(shape.radius || 8) * scaleX}
                  stroke={shape.stroke_color}
                  strokeWidth={shape.stroke_width * scaleX}
                  fill={shape.fill_color || 'none'}
                  opacity={shape.opacity}
                />
              )}
              {['circle', 'ellipse'].includes(shape.shape_type) && (
                <ellipse
                  cx={wPx / 2}
                  cy={hPx / 2}
                  rx={wPx / 2}
                  ry={hPx / 2}
                  stroke={shape.stroke_color}
                  strokeWidth={shape.stroke_width * scaleX}
                  fill={shape.fill_color || 'none'}
                  opacity={shape.opacity}
                />
              )}
              {shape.shape_type === 'line' && (
                <line
                  x1={0}
                  y1={0}
                  x2={wPx}
                  y2={hPx}
                  stroke={shape.stroke_color}
                  strokeWidth={shape.stroke_width * scaleX}
                  opacity={shape.opacity}
                />
              )}
              {shape.shape_type === 'arrow' && (
                <>
                  <line
                    x1={0}
                    y1={0}
                    x2={wPx}
                    y2={hPx}
                    stroke={shape.stroke_color}
                    strokeWidth={shape.stroke_width * scaleX}
                    opacity={shape.opacity}
                  />
                  {/* Arrow marker */}
                  <circle cx={wPx} cy={hPx} r={4 * scaleX} fill={shape.stroke_color} />
                </>
              )}
            </svg>
          </div>
        );
      })}

      {/* 6. Text Elements */}
      {pageTexts.map((txt) => {
        const { leftPx, topPx } = pdfToCssCoords(txt.x, txt.y, txt.font_size);
        const isSelected = selectedId === txt.id;

        return (
          <div
            key={txt.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(txt.id, 'text');
            }}
            style={{
              left: `${leftPx}px`,
              top: `${topPx}px`,
              fontSize: `${txt.font_size * scaleY}px`,
              color: txt.color,
              fontFamily: txt.font_family,
              fontWeight: txt.bold ? 'bold' : 'normal',
              fontStyle: txt.italic ? 'italic' : 'normal',
              opacity: txt.opacity,
            }}
            className={`absolute px-1 py-0.5 rounded cursor-move whitespace-pre leading-none ${
              isSelected ? 'ring-2 ring-studio-primary bg-studio-primary/5' : 'hover:outline hover:outline-slate-300'
            }`}
          >
            {txt.text}
          </div>
        );
      })}

      {/* 7. Image Elements */}
      {pageImages.map((img) => {
        const { leftPx, topPx } = pdfToCssCoords(img.x, img.y, img.height);
        const isSelected = selectedId === img.id;

        return (
          <div
            key={img.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(img.id, 'image');
            }}
            style={{
              left: `${leftPx}px`,
              top: `${topPx}px`,
              width: `${img.width * scaleX}px`,
              height: `${img.height * scaleY}px`,
              opacity: img.opacity,
            }}
            className={`absolute cursor-move overflow-hidden rounded ${
              isSelected ? 'ring-2 ring-studio-primary' : 'hover:ring-1 hover:ring-slate-300'
            }`}
          >
            <img src={img.image_base64} alt="Embedded" className="w-full h-full object-contain" />
          </div>
        );
      })}

      {/* 8. Digital Signatures */}
      {pageSignatures.map((sig) => {
        const { leftPx, topPx } = pdfToCssCoords(sig.x, sig.y, sig.height);
        const isSelected = selectedId === sig.id;

        return (
          <div
            key={sig.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(sig.id, 'signature');
            }}
            style={{
              left: `${leftPx}px`,
              top: `${topPx}px`,
              width: `${sig.width * scaleX}px`,
              height: `${sig.height * scaleY}px`,
            }}
            className={`absolute p-1 cursor-move flex flex-col justify-between rounded ${
              isSelected ? 'ring-2 ring-studio-primary bg-studio-primary/5' : 'hover:ring-1 hover:ring-slate-300'
            }`}
          >
            <img src={sig.signature_image_base64} alt="Signature" className="max-h-full object-contain pointer-events-none" />
            {sig.signer_name && (
              <span className="text-[9px] text-slate-500 font-medium truncate pointer-events-none">
                {sig.signer_name}
              </span>
            )}
            {sig.include_timestamp && sig.timestamp_text && (
              <span className="text-[8px] text-slate-400 font-mono truncate pointer-events-none">
                {sig.timestamp_text}
              </span>
            )}
          </div>
        );
      })}

      {/* 9. Interactive AcroForm Fields Overlay */}
      {activeTool === 'form' &&
        pageFormFields.map((field) => {
          if (!field.rect) return null;
          const [rx, ry, rwidth, rheight] = field.rect;
          const { leftPx, topPx } = pdfToCssCoords(rx, ry, rheight);

          return (
            <div
              key={field.name}
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${rwidth * scaleX}px`,
                height: `${rheight * scaleY}px`,
              }}
              className="absolute z-20"
            >
              {field.field_type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={formValues[field.name] === true || formValues[field.name] === 'Yes'}
                  onChange={(e) => setFormValue(field.name, e.target.checked)}
                  className="w-full h-full rounded text-studio-primary cursor-pointer"
                />
              ) : (
                <input
                  type="text"
                  value={formValues[field.name] || ''}
                  onChange={(e) => setFormValue(field.name, e.target.value)}
                  placeholder={field.name}
                  className="w-full h-full px-1.5 text-xs bg-blue-50/80 border border-studio-primary/40 focus:bg-white focus:border-studio-primary rounded text-studio-navy font-medium"
                />
              )}
            </div>
          );
        })}

      {/* Live drag box preview */}
      {isDrawing && startPoint && currentPoint && ['highlight', 'shapes', 'whiteout', 'redact'].includes(activeTool) && (
        <div
          style={{
            left: `${Math.min(startPoint.x, currentPoint.x)}px`,
            top: `${Math.min(startPoint.y, currentPoint.y)}px`,
            width: `${Math.abs(currentPoint.x - startPoint.x)}px`,
            height: `${Math.abs(currentPoint.y - startPoint.y)}px`,
          }}
          className={`absolute pointer-events-none border-2 ${
            activeTool === 'redact'
              ? 'border-red-600 bg-red-600/20'
              : activeTool === 'whiteout'
              ? 'border-slate-400 bg-white/80'
              : activeTool === 'highlight'
              ? 'border-amber-400 bg-amber-400/30'
              : 'border-studio-primary bg-studio-primary/10'
          }`}
        />
      )}
    </div>
  );
};
