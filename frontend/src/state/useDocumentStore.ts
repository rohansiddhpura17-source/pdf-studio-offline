import { create } from 'zustand';
import { DocumentInfo, RecentDocument, ToolModule, ActiveTool, OrganiseTool, ToastMessage } from '../types/document';

interface DocumentState {
  // Document state
  document: DocumentInfo | null;
  originalDocument: DocumentInfo | null; // For reset changes in Organise
  currentPage: number;
  zoom: number;
  zoomMode: 'custom' | 'fit-width' | 'fit-page';
  selectedPages: number[];
  
  // Navigation & Tool state
  activeModule: ToolModule;
  activeTool: ActiveTool;
  organiseTool: OrganiseTool;
  organiseHistory: DocumentInfo[];
  organiseFuture: DocumentInfo[];
  searchQuery: string;
  isSearchOpen: boolean;
  isSettingsOpen: boolean;
  hasUnsavedChanges: boolean;
  
  // Persistent recent documents & offline status
  recentDocuments: RecentDocument[];
  isOffline: boolean;
  toasts: ToastMessage[];

  // Actions
  setDocument: (doc: DocumentInfo | null) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setZoomMode: (mode: 'custom' | 'fit-width' | 'fit-page') => void;
  zoomIn: () => void;
  zoomOut: () => void;
  togglePageSelection: (page: number, multi?: boolean) => void;
  setSelectedPages: (pages: number[]) => void;
  selectAllPages: () => void;
  clearPageSelection: () => void;
  setActiveModule: (mod: ToolModule) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setOrganiseTool: (tool: OrganiseTool) => void;
  pushOrganiseState: (newDoc: DocumentInfo) => void;
  undoOrganise: () => void;
  redoOrganise: () => void;
  resetOrganise: () => void;
  setSearchQuery: (query: string) => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setHasUnsavedChanges: (changed: boolean) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  addRecentDocument: (doc: DocumentInfo) => void;
  clearRecentDocuments: () => void;
  closeDocument: () => void;
}

const RECENT_DOCS_KEY = 'pdf_studio_recent_docs';

function loadRecentDocs(): RecentDocument[] {
  try {
    const raw = localStorage.getItem(RECENT_DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentDocs(docs: RecentDocument[]) {
  try {
    localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(docs.slice(0, 10)));
  } catch {
    // Ignore storage write issues
  }
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  document: null,
  originalDocument: null,
  currentPage: 1,
  zoom: 1.0,
  zoomMode: 'custom',
  selectedPages: [1],

  activeModule: 'edit',
  activeTool: 'select',
  organiseTool: 'reorder',
  organiseHistory: [],
  organiseFuture: [],
  searchQuery: '',
  isSearchOpen: false,
  isSettingsOpen: false,
  hasUnsavedChanges: false,

  recentDocuments: loadRecentDocs(),
  isOffline: true,
  toasts: [],

  setDocument: (doc) => {
    if (doc) {
      get().addRecentDocument(doc);
    }
    set({
      document: doc,
      originalDocument: doc,
      currentPage: 1,
      selectedPages: [1],
      activeModule: 'edit',
      activeTool: 'select',
      organiseHistory: [],
      organiseFuture: [],
      hasUnsavedChanges: false,
    });
  },

  setCurrentPage: (page) => {
    const doc = get().document;
    if (!doc) return;
    const bounded = Math.max(1, Math.min(page, doc.page_count));
    set({ currentPage: bounded, selectedPages: [bounded] });
  },

  setZoom: (zoom) => {
    const clamped = Math.max(0.25, Math.min(zoom, 4.0));
    set({ zoom: clamped, zoomMode: 'custom' });
  },

  setZoomMode: (mode) => set({ zoomMode: mode }),

  zoomIn: () => {
    const current = get().zoom;
    const next = Math.min(current + 0.15, 3.0);
    set({ zoom: parseFloat(next.toFixed(2)), zoomMode: 'custom' });
  },

  zoomOut: () => {
    const current = get().zoom;
    const next = Math.max(current - 0.15, 0.4);
    set({ zoom: parseFloat(next.toFixed(2)), zoomMode: 'custom' });
  },

  togglePageSelection: (page, multi = false) => {
    const { selectedPages } = get();
    if (multi) {
      if (selectedPages.includes(page)) {
        if (selectedPages.length > 1) {
          set({ selectedPages: selectedPages.filter((p) => p !== page) });
        }
      } else {
        set({ selectedPages: [...selectedPages, page].sort((a, b) => a - b) });
      }
    } else {
      set({ selectedPages: [page], currentPage: page });
    }
  },

  setSelectedPages: (pages) => set({ selectedPages: pages }),

  selectAllPages: () => {
    const doc = get().document;
    if (!doc) return;
    const all = Array.from({ length: doc.page_count }, (_, i) => i + 1);
    set({ selectedPages: all });
  },

  clearPageSelection: () => {
    const current = get().currentPage;
    set({ selectedPages: [current] });
  },

  setActiveModule: (mod) => set({ activeModule: mod }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setOrganiseTool: (tool) => set({ organiseTool: tool }),

  pushOrganiseState: (newDoc) => {
    const current = get().document;
    if (current) {
      set((state) => ({
        organiseHistory: [...state.organiseHistory, current],
        organiseFuture: [],
        document: newDoc,
        hasUnsavedChanges: true,
      }));
    } else {
      set({ document: newDoc });
    }
  },

  undoOrganise: () => {
    const { organiseHistory, document, organiseFuture } = get();
    if (organiseHistory.length === 0 || !document) return;
    const prev = organiseHistory[organiseHistory.length - 1];
    set({
      document: prev,
      organiseHistory: organiseHistory.slice(0, -1),
      organiseFuture: [document, ...organiseFuture],
      hasUnsavedChanges: true,
    });
  },

  redoOrganise: () => {
    const { organiseFuture, document, organiseHistory } = get();
    if (organiseFuture.length === 0 || !document) return;
    const next = organiseFuture[0];
    set({
      document: next,
      organiseFuture: organiseFuture.slice(1),
      organiseHistory: [...organiseHistory, document],
      hasUnsavedChanges: true,
    });
  },

  resetOrganise: () => {
    const { originalDocument } = get();
    if (originalDocument) {
      set({
        document: originalDocument,
        organiseHistory: [],
        organiseFuture: [],
        hasUnsavedChanges: false,
      });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setHasUnsavedChanges: (changed) => set({ hasUnsavedChanges: changed }),

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  addRecentDocument: (doc) => {
    const recentItem: RecentDocument = {
      file_id: doc.file_id,
      filename: doc.filename,
      size_bytes: doc.size_bytes,
      page_count: doc.page_count,
      last_opened: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const current = get().recentDocuments.filter((d) => d.filename !== doc.filename);
    const updated = [recentItem, ...current];
    set({ recentDocuments: updated });
    saveRecentDocs(updated);
  },

  clearRecentDocuments: () => {
    set({ recentDocuments: [] });
    saveRecentDocs([]);
  },

  closeDocument: () => {
    set({
      document: null,
      originalDocument: null,
      currentPage: 1,
      selectedPages: [],
      organiseHistory: [],
      organiseFuture: [],
      hasUnsavedChanges: false,
    });
  },
}));
