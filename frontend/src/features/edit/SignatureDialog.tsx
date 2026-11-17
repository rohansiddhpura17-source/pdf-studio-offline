import React, { useRef, useState, useEffect } from 'react';
import { X, Pen, Type, Upload, Trash2, Check, Shield } from 'lucide-react';
import { useEditStore } from '../../state/useEditStore';
import { useDocumentStore } from '../../state/useDocumentStore';
import { Button } from '../../components/common/Button';

export const SignatureDialog: React.FC = () => {
  const {
    isSignatureModalOpen,
    setIsSignatureModalOpen,
    signerName,
    includeTimestamp,
    setToolConfig,
    addSignatureItem,
  } = useEditStore();

  const { currentPage, addToast } = useDocumentStore();

  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState(signerName || 'Jane Doe');
  const [typedFont, setTypedFont] = useState<'font-script' | 'font-cursive' | 'font-serif'>('font-script');
  const [sigColor, setSigColor] = useState('#17243B');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize canvas when opened
  useEffect(() => {
    if (isSignatureModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = sigColor;
      }
    }
  }, [isSignatureModalOpen, sigColor, activeTab]);

  if (!isSignatureModalOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasDrawn(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please upload a PNG or JPEG image signature.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApplySignature = () => {
    let finalBase64 = '';

    if (activeTab === 'draw') {
      if (!canvasRef.current || !hasDrawn) {
        addToast({ type: 'warning', title: 'Signature Empty', message: 'Please draw your signature first.' });
        return;
      }
      finalBase64 = canvasRef.current.toDataURL('image/png');
    } else if (activeTab === 'type') {
      if (!typedName.trim()) {
        addToast({ type: 'warning', title: 'Name Required', message: 'Please enter a name for the signature.' });
        return;
      }
      // Render typed text to temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 150;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = sigColor;
        ctx.font = 'italic 44px "Brush Script MT", "Caveat", "Segoe Script", cursive';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(typedName, 200, 75);
        finalBase64 = tempCanvas.toDataURL('image/png');
      }
    } else if (activeTab === 'upload') {
      if (!uploadedImage) {
        addToast({ type: 'warning', title: 'Image Required', message: 'Please choose an image file.' });
        return;
      }
      finalBase64 = uploadedImage;
    }

    if (!finalBase64) return;

    const timestampText = includeTimestamp
      ? new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC'
      : undefined;

    addSignatureItem({
      id: Math.random().toString(36).substring(2, 9),
      page_number: currentPage,
      signature_image_base64: finalBase64,
      x: 150,
      y: 250,
      width: 160,
      height: 60,
      signer_name: signerName.trim() || (activeTab === 'type' ? typedName : undefined),
      include_timestamp: includeTimestamp,
      timestamp_text: timestampText,
    });

    setIsSignatureModalOpen(false);
    addToast({
      type: 'success',
      title: 'Signature Placed',
      message: `Signature placed on page ${currentPage}. You can drag or resize it.`,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-studio-border max-w-lg w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-studio-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-studio-navy">Create Digital Signature</h3>
            <p className="text-xs text-slate-500">Sign documents with a visual signature stamp</p>
          </div>
          <button
            onClick={() => setIsSignatureModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 flex gap-2 border-b border-studio-border">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'draw'
                ? 'border-studio-primary text-studio-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            onClick={() => setActiveTab('type')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'type'
                ? 'border-studio-primary text-studio-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'upload'
                ? 'border-studio-primary text-studio-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
        </div>

        {/* Body content based on active tab */}
        <div className="p-6 space-y-4">
          {activeTab === 'draw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Draw signature below:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {['#17243B', '#2859D9', '#057A55'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setSigColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-4 h-4 rounded-full border ${
                          sigColor === color ? 'ring-2 ring-studio-primary ring-offset-1' : 'border-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={clearCanvas}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 font-medium ml-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
              <div className="border border-slate-300 rounded-xl bg-slate-50/50 relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={450}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 cursor-crosshair touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs italic">
                    Use mouse, stylus, or touchpad to draw your signature here
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'type' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Your Full Name:</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 border border-studio-border rounded-lg text-sm text-studio-navy focus:outline-none focus:ring-2 focus:ring-studio-primary"
                />
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[90px]">
                <span
                  style={{ color: sigColor, fontFamily: 'cursive' }}
                  className="text-3xl italic tracking-wide select-none"
                >
                  {typedName || 'Signature Preview'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-600 block">Upload Signature (PNG / JPEG):</label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {uploadedImage ? (
                  <div className="flex flex-col items-center">
                    <img src={uploadedImage} alt="Uploaded signature" className="max-h-24 object-contain mb-2" />
                    <span className="text-xs text-studio-primary font-medium">Click to replace image</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-500">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-medium">Drop transparent PNG or click to browse</span>
                    <span className="text-[10px] text-slate-400">Recommended: Transparent background PNG</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Options: Signer Name & Timestamp */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-600 font-medium">Signer Name Label:</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setToolConfig({ signerName: e.target.value })}
                placeholder="Optional signer label"
                className="px-2.5 py-1 border border-slate-200 rounded-md text-xs w-48 text-studio-navy"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="sigTimestamp"
                checked={includeTimestamp}
                onChange={(e) => setToolConfig({ includeTimestamp: e.target.checked })}
                className="rounded text-studio-primary focus:ring-studio-primary"
              />
              <label htmlFor="sigTimestamp" className="text-slate-600 select-none">
                Include date and time stamp underneath signature
              </label>
            </div>
          </div>

          {/* Legal / Technical notice distinguishing visual from cryptographic signature */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-900 leading-relaxed">
            <Shield className="w-4 h-4 text-studio-primary flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Visual Signature Stamp</span>
              This tool applies an authenticated visual signature stamp to the document canvas. It is not an X.509 PKI cryptographic signature and does not require third-party CA certificate tokens.
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-studio-border flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsSignatureModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleApplySignature}>
            <Check className="w-3.5 h-3.5 mr-1" />
            Place on Document
          </Button>
        </div>
      </div>
    </div>
  );
};
