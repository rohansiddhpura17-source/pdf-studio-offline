import { create } from 'zustand';
import {
  FinishSubTool,
  CompressionPreset,
  CompressResponse,
  MetadataInfo,
  DocumentProperties,
  MetadataCleanupMode,
  PrivacyVerificationReport,
  CompareMode,
  VisualDiffViewMode,
  CompareResponse,
} from '../types/finish';
import { api } from '../services/api';

interface FinishState {
  // Navigation
  activeSubTool: FinishSubTool;
  setActiveSubTool: (tool: FinishSubTool) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;

  // Tool 1: Compression
  compressionPreset: CompressionPreset;
  dpi: number;
  jpegQuality: number;
  compressStreams: boolean;
  removeDuplicateObjects: boolean;
  optimizeImages: boolean;
  preserveMetadata: boolean;
  compressionResult: CompressResponse | null;
  setCompressionPreset: (preset: CompressionPreset) => void;
  setDpi: (dpi: number) => void;
  setJpegQuality: (quality: number) => void;
  setCompressStreams: (val: boolean) => void;
  setRemoveDuplicateObjects: (val: boolean) => void;
  setOptimizeImages: (val: boolean) => void;
  setPreserveMetadata: (val: boolean) => void;
  setCompressionResult: (res: CompressResponse | null) => void;

  // Tool 2: Metadata Editor
  metadataInfo: MetadataInfo;
  documentProperties: DocumentProperties | null;
  initialMetadataInfo: MetadataInfo | null;
  isLoadingMetadata: boolean;
  isMetadataDirty: boolean;
  setMetadataField: (field: keyof MetadataInfo, value: any) => void;
  setCustomMetadataField: (key: string, value: string) => void;
  removeCustomMetadataField: (key: string) => void;
  loadMetadata: (fileId: string) => Promise<void>;
  resetMetadataToInitial: () => void;

  // Tool 3: Metadata Cleanup
  cleanupMode: MetadataCleanupMode;
  removeAuthor: boolean;
  removeTitle: boolean;
  removeSubject: boolean;
  removeKeywords: boolean;
  removeCreatorProducer: boolean;
  removeTimestamps: boolean;
  removeCustomEntries: boolean;
  removeXmp: boolean;
  removeThumbnails: boolean;
  verificationReport: PrivacyVerificationReport | null;
  setCleanupMode: (mode: MetadataCleanupMode) => void;
  setRemoveAuthor: (val: boolean) => void;
  setRemoveTitle: (val: boolean) => void;
  setRemoveSubject: (val: boolean) => void;
  setRemoveKeywords: (val: boolean) => void;
  setRemoveCreatorProducer: (val: boolean) => void;
  setRemoveTimestamps: (val: boolean) => void;
  setRemoveCustomEntries: (val: boolean) => void;
  setRemoveXmp: (val: boolean) => void;
  setRemoveThumbnails: (val: boolean) => void;
  setVerificationReport: (report: PrivacyVerificationReport | null) => void;

  // Tool 4: Compare PDFs
  originalFileId: string | null;
  revisedFileId: string | null;
  originalFilename: string | null;
  revisedFilename: string | null;
  compareMode: CompareMode;
  visualDiffMode: VisualDiffViewMode;
  overlayOpacity: number; // 0 to 100
  sensitivityThreshold: number; // 1 to 50
  compareResult: CompareResponse | null;
  activeDiffPage: number;
  isComparing: boolean;
  setOriginalFile: (fileId: string, filename: string) => void;
  setRevisedFile: (fileId: string, filename: string) => void;
  setCompareMode: (mode: CompareMode) => void;
  setVisualDiffMode: (mode: VisualDiffViewMode) => void;
  setOverlayOpacity: (opacity: number) => void;
  setSensitivityThreshold: (threshold: number) => void;
  setCompareResult: (res: CompareResponse | null) => void;
  setActiveDiffPage: (pageNum: number) => void;
  setIsComparing: (val: boolean) => void;

  // Reset
  resetFinishState: () => void;
}

const DEFAULT_METADATA: MetadataInfo = {
  title: '',
  author: '',
  subject: '',
  keywords: '',
  creator: '',
  producer: '',
  creation_date: '',
  mod_date: '',
  custom_metadata: {},
};

export const useFinishStore = create<FinishState>((set, get) => ({
  // Navigation
  activeSubTool: 'compress',
  setActiveSubTool: (tool) => set({ activeSubTool: tool }),
  isProcessing: false,
  setIsProcessing: (val) => set({ isProcessing: val }),

  // Tool 1: Compression
  compressionPreset: 'balanced',
  dpi: 150,
  jpegQuality: 85,
  compressStreams: true,
  removeDuplicateObjects: true,
  optimizeImages: true,
  preserveMetadata: true,
  compressionResult: null,

  setCompressionPreset: (preset) => {
    if (preset === 'max_quality') {
      set({
        compressionPreset: preset,
        dpi: 300,
        jpegQuality: 92,
        compressStreams: true,
        removeDuplicateObjects: true,
        optimizeImages: false,
        preserveMetadata: true,
      });
    } else if (preset === 'balanced') {
      set({
        compressionPreset: preset,
        dpi: 150,
        jpegQuality: 85,
        compressStreams: true,
        removeDuplicateObjects: true,
        optimizeImages: true,
        preserveMetadata: true,
      });
    } else if (preset === 'strong') {
      set({
        compressionPreset: preset,
        dpi: 96,
        jpegQuality: 70,
        compressStreams: true,
        removeDuplicateObjects: true,
        optimizeImages: true,
        preserveMetadata: false,
      });
    } else {
      set({ compressionPreset: 'custom' });
    }
  },
  setDpi: (dpi) => set({ dpi, compressionPreset: 'custom' }),
  setJpegQuality: (quality) => set({ jpegQuality: quality, compressionPreset: 'custom' }),
  setCompressStreams: (val) => set({ compressStreams: val, compressionPreset: 'custom' }),
  setRemoveDuplicateObjects: (val) => set({ removeDuplicateObjects: val, compressionPreset: 'custom' }),
  setOptimizeImages: (val) => set({ optimizeImages: val, compressionPreset: 'custom' }),
  setPreserveMetadata: (val) => set({ preserveMetadata: val, compressionPreset: 'custom' }),
  setCompressionResult: (res) => set({ compressionResult: res }),

  // Tool 2: Metadata Editor
  metadataInfo: { ...DEFAULT_METADATA },
  documentProperties: null,
  initialMetadataInfo: null,
  isLoadingMetadata: false,
  isMetadataDirty: false,

  setMetadataField: (field, value) =>
    set((state) => ({
      metadataInfo: { ...state.metadataInfo, [field]: value },
      isMetadataDirty: true,
    })),

  setCustomMetadataField: (key, value) =>
    set((state) => {
      const custom = { ...(state.metadataInfo.custom_metadata || {}) };
      if (value.trim()) {
        custom[key] = value;
      } else {
        delete custom[key];
      }
      return {
        metadataInfo: { ...state.metadataInfo, custom_metadata: custom },
        isMetadataDirty: true,
      };
    }),

  removeCustomMetadataField: (key) =>
    set((state) => {
      const custom = { ...(state.metadataInfo.custom_metadata || {}) };
      delete custom[key];
      return {
        metadataInfo: { ...state.metadataInfo, custom_metadata: custom },
        isMetadataDirty: true,
      };
    }),

  loadMetadata: async (fileId: string) => {
    set({ isLoadingMetadata: true });
    try {
      const res = await api.getMetadata(fileId);
      set({
        metadataInfo: res.metadata,
        documentProperties: res.properties,
        initialMetadataInfo: res.metadata,
        isLoadingMetadata: false,
        isMetadataDirty: false,
      });
    } catch {
      set({ isLoadingMetadata: false });
    }
  },

  resetMetadataToInitial: () =>
    set((state) => ({
      metadataInfo: state.initialMetadataInfo ? { ...state.initialMetadataInfo } : { ...DEFAULT_METADATA },
      isMetadataDirty: false,
    })),

  // Tool 3: Metadata Cleanup
  cleanupMode: 'standard',
  removeAuthor: true,
  removeTitle: true,
  removeSubject: true,
  removeKeywords: true,
  removeCreatorProducer: true,
  removeTimestamps: true,
  removeCustomEntries: true,
  removeXmp: true,
  removeThumbnails: true,
  verificationReport: null,

  setCleanupMode: (mode) =>
    set({
      cleanupMode: mode,
      removeAuthor: true,
      removeTitle: true,
      removeSubject: true,
      removeKeywords: true,
      removeCreatorProducer: true,
      removeTimestamps: true,
      removeCustomEntries: true,
      removeXmp: true,
      removeThumbnails: true,
    }),
  setRemoveAuthor: (val) => set({ removeAuthor: val }),
  setRemoveTitle: (val) => set({ removeTitle: val }),
  setRemoveSubject: (val) => set({ removeSubject: val }),
  setRemoveKeywords: (val) => set({ removeKeywords: val }),
  setRemoveCreatorProducer: (val) => set({ removeCreatorProducer: val }),
  setRemoveTimestamps: (val) => set({ removeTimestamps: val }),
  setRemoveCustomEntries: (val) => set({ removeCustomEntries: val }),
  setRemoveXmp: (val) => set({ removeXmp: val }),
  setRemoveThumbnails: (val) => set({ removeThumbnails: val }),
  setVerificationReport: (report) => set({ verificationReport: report }),

  // Tool 4: Compare PDFs
  originalFileId: null,
  revisedFileId: null,
  originalFilename: null,
  revisedFilename: null,
  compareMode: 'all',
  visualDiffMode: 'side-by-side',
  overlayOpacity: 50,
  sensitivityThreshold: 15,
  compareResult: null,
  activeDiffPage: 1,
  isComparing: false,

  setOriginalFile: (fileId, filename) =>
    set({ originalFileId: fileId, originalFilename: filename }),
  setRevisedFile: (fileId, filename) =>
    set({ revisedFileId: fileId, revisedFilename: filename }),
  setCompareMode: (mode) => set({ compareMode: mode }),
  setVisualDiffMode: (mode) => set({ visualDiffMode: mode }),
  setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),
  setSensitivityThreshold: (threshold) => set({ sensitivityThreshold: threshold }),
  setCompareResult: (res) =>
    set({
      compareResult: res,
      activeDiffPage: 1,
    }),
  setActiveDiffPage: (pageNum) => set({ activeDiffPage: pageNum }),
  setIsComparing: (val) => set({ isComparing: val }),

  // Reset
  resetFinishState: () =>
    set({
      compressionPreset: 'balanced',
      dpi: 150,
      jpegQuality: 85,
      compressStreams: true,
      removeDuplicateObjects: true,
      optimizeImages: true,
      preserveMetadata: true,
      compressionResult: null,
      cleanupMode: 'standard',
      verificationReport: null,
      compareResult: null,
      activeDiffPage: 1,
      isProcessing: false,
    }),
}));
