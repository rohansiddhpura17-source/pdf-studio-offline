import { create } from 'zustand';
import {
  TextAnnotationItem,
  ImageAnnotationItem,
  HighlightAnnotationItem,
  DrawAnnotationItem,
  ShapeAnnotationItem,
  WhiteoutAnnotationItem,
  RedactAnnotationItem,
  SignatureAnnotationItem,
  FormFieldInfo,
  ShapeType,
  DrawPath,
} from '../types/edit';
import { api } from '../services/api';

interface EditSnapshot {
  texts: TextAnnotationItem[];
  images: ImageAnnotationItem[];
  highlights: HighlightAnnotationItem[];
  drawings: DrawAnnotationItem[];
  shapes: ShapeAnnotationItem[];
  whiteouts: WhiteoutAnnotationItem[];
  redactions: RedactAnnotationItem[];
  signatures: SignatureAnnotationItem[];
}

interface EditState {
  // Annotations
  texts: TextAnnotationItem[];
  images: ImageAnnotationItem[];
  highlights: HighlightAnnotationItem[];
  drawings: DrawAnnotationItem[];
  shapes: ShapeAnnotationItem[];
  whiteouts: WhiteoutAnnotationItem[];
  redactions: RedactAnnotationItem[];
  signatures: SignatureAnnotationItem[];

  // Form handling
  formFields: FormFieldInfo[];
  formValues: Record<string, any>;
  flattenForms: boolean;
  isLoadingForms: boolean;

  // History (Undo / Redo for draft edits)
  history: EditSnapshot[];
  future: EditSnapshot[];

  // Active Tool & Selection
  selectedId: string | null;
  selectedType: string | null;

  // Tool specific configurations
  fontFamily: string;
  fontSize: number;
  textColor: string;
  bold: boolean;
  italic: boolean;
  textAlign: 'left' | 'center' | 'right';
  textOpacity: number;

  shapeType: ShapeType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  shapeOpacity: number;
  shapeRadius: number;

  highlightColor: string;
  highlightOpacity: number;

  drawColor: string;
  drawWidth: number;
  drawOpacity: number;
  isEraser: boolean;

  whiteoutColor: string;

  redactFillColor: string;
  redactTextColor: string;
  redactOverlayText: string;
  redactTargetText: string;
  redactMode: 'area' | 'search';

  signerName: string;
  includeTimestamp: boolean;

  // Modal dialog states
  isSignatureModalOpen: boolean;
  isRedactConfirmOpen: boolean;
  pendingRedactItem: RedactAnnotationItem | null;
  isSavingEdits: boolean;

  // Actions
  setToolConfig: (config: Partial<EditState>) => void;
  setSelectedId: (id: string | null, type: string | null) => void;
  setIsSignatureModalOpen: (open: boolean) => void;
  setIsRedactConfirmOpen: (open: boolean) => void;
  setPendingRedactItem: (item: RedactAnnotationItem | null) => void;
  setIsSavingEdits: (saving: boolean) => void;
  setFlattenForms: (flatten: boolean) => void;
  setFormValue: (fieldName: string, value: any) => void;

  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  clearAllEdits: () => void;

  addTextItem: (item: TextAnnotationItem) => void;
  updateTextItem: (id: string, updates: Partial<TextAnnotationItem>) => void;

  addImageItem: (item: ImageAnnotationItem) => void;
  updateImageItem: (id: string, updates: Partial<ImageAnnotationItem>) => void;

  addHighlightItem: (item: HighlightAnnotationItem) => void;

  addDrawingPath: (pageNumber: number, path: DrawPath) => void;

  addShapeItem: (item: ShapeAnnotationItem) => void;
  updateShapeItem: (id: string, updates: Partial<ShapeAnnotationItem>) => void;

  addWhiteoutItem: (item: WhiteoutAnnotationItem) => void;

  addRedactItem: (item: RedactAnnotationItem) => void;

  addSignatureItem: (item: SignatureAnnotationItem) => void;
  updateSignatureItem: (id: string, updates: Partial<SignatureAnnotationItem>) => void;

  deleteSelected: () => void;
  fetchFormFields: (fileId: string) => Promise<void>;
  getTotalDraftCount: () => number;
}

const getSnapshot = (state: EditState): EditSnapshot => ({
  texts: [...state.texts],
  images: [...state.images],
  highlights: [...state.highlights],
  drawings: state.drawings.map((d) => ({ ...d, paths: [...d.paths] })),
  shapes: [...state.shapes],
  whiteouts: [...state.whiteouts],
  redactions: [...state.redactions],
  signatures: [...state.signatures],
});

export const useEditStore = create<EditState>((set, get) => ({
  texts: [],
  images: [],
  highlights: [],
  drawings: [],
  shapes: [],
  whiteouts: [],
  redactions: [],
  signatures: [],

  formFields: [],
  formValues: {},
  flattenForms: false,
  isLoadingForms: false,

  history: [],
  future: [],

  selectedId: null,
  selectedType: null,

  // Default Tool Settings
  fontFamily: 'Helvetica',
  fontSize: 16,
  textColor: '#17243B',
  bold: false,
  italic: false,
  textAlign: 'left',
  textOpacity: 1.0,

  shapeType: 'rect',
  strokeColor: '#2859D9',
  strokeWidth: 2,
  fillColor: '',
  shapeOpacity: 1.0,
  shapeRadius: 8,

  highlightColor: '#FFE500',
  highlightOpacity: 0.4,

  drawColor: '#2859D9',
  drawWidth: 3,
  drawOpacity: 1.0,
  isEraser: false,

  whiteoutColor: '#FFFFFF',

  redactFillColor: '#000000',
  redactTextColor: '#FFFFFF',
  redactOverlayText: '[REDACTED]',
  redactTargetText: '',
  redactMode: 'area',

  signerName: '',
  includeTimestamp: true,

  isSignatureModalOpen: false,
  isRedactConfirmOpen: false,
  pendingRedactItem: null,
  isSavingEdits: false,

  setToolConfig: (config) => set((state) => ({ ...state, ...config })),
  setSelectedId: (id, type) => set({ selectedId: id, selectedType: type }),
  setIsSignatureModalOpen: (open) => set({ isSignatureModalOpen: open }),
  setIsRedactConfirmOpen: (open) => set({ isRedactConfirmOpen: open }),
  setPendingRedactItem: (item) => set({ pendingRedactItem: item }),
  setIsSavingEdits: (saving) => set({ isSavingEdits: saving }),
  setFlattenForms: (flatten) => set({ flattenForms: flatten }),

  setFormValue: (fieldName, value) => {
    set((state) => ({
      formValues: { ...state.formValues, [fieldName]: value },
    }));
  },

  pushSnapshot: () => {
    const current = getSnapshot(get());
    set((state) => ({
      history: [...state.history, current],
      future: [],
    }));
  },

  undo: () => {
    const { history, future } = get();
    if (history.length === 0) return;
    const current = getSnapshot(get());
    const prev = history[history.length - 1];
    set({
      ...prev,
      history: history.slice(0, -1),
      future: [current, ...future],
      selectedId: null,
    });
  },

  redo: () => {
    const { history, future } = get();
    if (future.length === 0) return;
    const current = getSnapshot(get());
    const next = future[0];
    set({
      ...next,
      future: future.slice(1),
      history: [...history, current],
      selectedId: null,
    });
  },

  clearAllEdits: () => {
    get().pushSnapshot();
    set({
      texts: [],
      images: [],
      highlights: [],
      drawings: [],
      shapes: [],
      whiteouts: [],
      redactions: [],
      signatures: [],
      selectedId: null,
      selectedType: null,
    });
  },

  addTextItem: (item) => {
    get().pushSnapshot();
    set((state) => ({
      texts: [...state.texts, item],
      selectedId: item.id,
      selectedType: 'text',
    }));
  },

  updateTextItem: (id, updates) => {
    set((state) => ({
      texts: state.texts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  addImageItem: (item) => {
    get().pushSnapshot();
    set((state) => ({
      images: [...state.images, item],
      selectedId: item.id,
      selectedType: 'image',
    }));
  },

  updateImageItem: (id, updates) => {
    set((state) => ({
      images: state.images.map((img) => (img.id === id ? { ...img, ...updates } : img)),
    }));
  },

  addHighlightItem: (item) => {
    get().pushSnapshot();
    set((state) => ({
      highlights: [...state.highlights, item],
    }));
  },

  addDrawingPath: (pageNumber, path) => {
    get().pushSnapshot();
    set((state) => {
      const existing = state.drawings.find((d) => d.page_number === pageNumber);
      if (existing) {
        return {
          drawings: state.drawings.map((d) =>
            d.page_number === pageNumber ? { ...d, paths: [...d.paths, path] } : d
          ),
        };
      } else {
        return {
          drawings: [
            ...state.drawings,
            { id: Math.random().toString(36).substring(2, 9), page_number: pageNumber, paths: [path] },
          ],
        };
      }
    });
  },

  addShapeItem: (item) => {
    get().pushSnapshot();
    set((state) => ({
      shapes: [...state.shapes, item],
      selectedId: item.id,
      selectedType: 'shape',
    }));
  },

  updateShapeItem: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  },

  addWhiteoutItem: (item) => {
    get().pushSnapshot();
    set((state) => ({
      whiteouts: [...state.whiteouts, item],
    }));
  },

  addRedactItem: (item) => {
    get().pushSnapshot();
    set((state) => ({
      redactions: [...state.redactions, item],
    }));
  },

  addSignatureItem: (item) => {
    get().pushSnapshot();
    set((state) => ({
      signatures: [...state.signatures, item],
      selectedId: item.id,
      selectedType: 'signature',
    }));
  },

  updateSignatureItem: (id, updates) => {
    set((state) => ({
      signatures: state.signatures.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  },

  deleteSelected: () => {
    const { selectedId, selectedType } = get();
    if (!selectedId) return;
    get().pushSnapshot();
    set((state) => ({
      texts: state.texts.filter((t) => t.id !== selectedId),
      images: state.images.filter((img) => img.id !== selectedId),
      shapes: state.shapes.filter((s) => s.id !== selectedId),
      signatures: state.signatures.filter((s) => s.id !== selectedId),
      selectedId: null,
      selectedType: null,
    }));
  },

  fetchFormFields: async (fileId: string) => {
    set({ isLoadingForms: true });
    try {
      const resp = await api.getFormFields(fileId);
      const initialValues: Record<string, any> = {};
      resp.fields.forEach((f) => {
        initialValues[f.name] = f.value || '';
      });
      set({ formFields: resp.fields, formValues: initialValues, isLoadingForms: false });
    } catch (e) {
      console.warn('Form inspection not applicable or empty:', e);
      set({ formFields: [], isLoadingForms: false });
    }
  },

  getTotalDraftCount: () => {
    const s = get();
    return (
      s.texts.length +
      s.images.length +
      s.highlights.length +
      s.drawings.reduce((acc, d) => acc + d.paths.length, 0) +
      s.shapes.length +
      s.whiteouts.length +
      s.redactions.length +
      s.signatures.length
    );
  },
}));
