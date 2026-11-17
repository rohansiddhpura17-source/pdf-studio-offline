import { create } from 'zustand';
import {
  ImageInputItem,
  PdfToImagesResponse,
  PdfToTextResponse,
} from '../types/stamp-convert';

export type StampConvertTool =
  | 'watermark'
  | 'page-numbers'
  | 'header-footer'
  | 'date-stamp'
  | 'images-to-pdf'
  | 'pdf-to-images'
  | 'pdf-to-text';

export type PageRangeOption = 'all' | 'custom' | 'selection';

interface StampConvertState {
  // Navigation
  activeSubTool: StampConvertTool;
  setActiveSubTool: (tool: StampConvertTool) => void;

  // Page targeting
  pageRangeOption: PageRangeOption;
  setPageRangeOption: (opt: PageRangeOption) => void;
  customPageRange: string;
  setCustomPageRange: (range: string) => void;
  selectedPages: number[];
  setSelectedPages: (pages: number[]) => void;
  togglePageSelection: (pageNum: number) => void;

  // 1. Watermark
  wmType: 'text' | 'image';
  setWmType: (type: 'text' | 'image') => void;
  wmText: string;
  setWmText: (text: string) => void;
  wmFontName: 'Helvetica' | 'Times-Roman' | 'Courier';
  setWmFontName: (f: 'Helvetica' | 'Times-Roman' | 'Courier') => void;
  wmFontSize: number;
  setWmFontSize: (s: number) => void;
  wmColor: string;
  setWmColor: (c: string) => void;
  wmOpacity: number;
  setWmOpacity: (o: number) => void;
  wmRotation: number;
  setWmRotation: (r: number) => void;
  wmPlacement: 'foreground' | 'background';
  setWmPlacement: (p: 'foreground' | 'background') => void;
  wmRepeat: boolean;
  setWmRepeat: (repeat: boolean) => void;
  wmRepeatDensity: 'loose' | 'medium' | 'dense';
  setWmRepeatDensity: (d: 'loose' | 'medium' | 'dense') => void;
  wmImageBase64: string;
  setWmImageBase64: (img: string) => void;
  wmImageScale: number;
  setWmImageScale: (s: number) => void;
  wmMaintainAspect: boolean;
  setWmMaintainAspect: (m: boolean) => void;

  // 2. Page Numbers
  pnPosition: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  setPnPosition: (pos: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right') => void;
  pnFormat: 'arabic' | 'padded' | 'roman_lower' | 'roman_upper';
  setPnFormat: (f: 'arabic' | 'padded' | 'roman_lower' | 'roman_upper') => void;
  pnStartNumber: number;
  setPnStartNumber: (n: number) => void;
  pnPrefix: string;
  setPnPrefix: (p: string) => void;
  pnSuffix: string;
  setPnSuffix: (s: string) => void;
  pnSeparator: string;
  setPnSeparator: (sep: string) => void;
  pnIncludeTotal: boolean;
  setPnIncludeTotal: (inc: boolean) => void;
  pnFontName: 'Helvetica' | 'Times-Roman' | 'Courier';
  setPnFontName: (f: 'Helvetica' | 'Times-Roman' | 'Courier') => void;
  pnFontSize: number;
  setPnFontSize: (s: number) => void;
  pnColor: string;
  setPnColor: (c: string) => void;
  pnSkipCover: boolean;
  setPnSkipCover: (s: boolean) => void;

  // 3. Header & Footer
  hfHeaderLeft: string;
  setHfHeaderLeft: (val: string) => void;
  hfHeaderCenter: string;
  setHfHeaderCenter: (val: string) => void;
  hfHeaderRight: string;
  setHfHeaderRight: (val: string) => void;
  hfFooterLeft: string;
  setHfFooterLeft: (val: string) => void;
  hfFooterCenter: string;
  setHfFooterCenter: (val: string) => void;
  hfFooterRight: string;
  setHfFooterRight: (val: string) => void;
  hfFontName: 'Helvetica' | 'Times-Roman' | 'Courier';
  setHfFontName: (f: 'Helvetica' | 'Times-Roman' | 'Courier') => void;
  hfFontSize: number;
  setHfFontSize: (s: number) => void;
  hfColor: string;
  setHfColor: (c: string) => void;
  hfDividerLine: boolean;
  setHfDividerLine: (d: boolean) => void;
  hfDividerColor: string;
  setHfDividerColor: (c: string) => void;
  hfSkipCover: boolean;
  setHfSkipCover: (s: boolean) => void;

  // 4. Date Stamp
  dsDateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'full';
  setDsDateFormat: (f: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'full') => void;
  dsCustomDate: string;
  setDsCustomDate: (d: string) => void;
  dsPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  setDsPosition: (p: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center') => void;
  dsFontName: 'Helvetica' | 'Times-Roman' | 'Courier';
  setDsFontName: (f: 'Helvetica' | 'Times-Roman' | 'Courier') => void;
  dsFontSize: number;
  setDsFontSize: (s: number) => void;
  dsColor: string;
  setDsColor: (c: string) => void;
  dsOpacity: number;
  setDsOpacity: (o: number) => void;
  dsRotation: number;
  setDsRotation: (r: number) => void;

  // 5. Images to PDF
  imgQueue: ImageInputItem[];
  addImagesToQueue: (items: ImageInputItem[]) => void;
  removeImageFromQueue: (id: string) => void;
  reorderImageQueue: (startIndex: number, endIndex: number) => void;
  rotateImageInQueue: (id: string, angleDelta: number) => void;
  clearImageQueue: () => void;
  imgPageSize: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Original' | 'Custom';
  setImgPageSize: (s: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Original' | 'Custom') => void;
  imgFitMode: 'fit' | 'fill' | 'stretch';
  setImgFitMode: (m: 'fit' | 'fill' | 'stretch') => void;
  imgOrientation: 'portrait' | 'landscape' | 'auto';
  setImgOrientation: (o: 'portrait' | 'landscape' | 'auto') => void;
  imgMarginPt: number;
  setImgMarginPt: (m: number) => void;
  imgBgColor: string;
  setImgBgColor: (c: string) => void;
  imgOutputFilename: string;
  setImgOutputFilename: (n: string) => void;

  // 6. PDF to Images
  p2iFormat: 'png' | 'jpeg';
  setP2iFormat: (f: 'png' | 'jpeg') => void;
  p2iDpi: number;
  setP2iDpi: (dpi: number) => void;
  p2iQuality: number;
  setP2iQuality: (q: number) => void;
  p2iRenderedResult: PdfToImagesResponse | null;
  setP2iRenderedResult: (res: PdfToImagesResponse | null) => void;

  // 7. PDF to Text
  p2tMode: 'plain' | 'layout';
  setP2tMode: (m: 'plain' | 'layout') => void;
  p2tPreservePageBreaks: boolean;
  setP2tPreservePageBreaks: (p: boolean) => void;
  p2tExtractedResult: PdfToTextResponse | null;
  setP2tExtractedResult: (res: PdfToTextResponse | null) => void;
  p2tSearchQuery: string;
  setP2tSearchQuery: (q: string) => void;

  // Loading & Feedback
  isProcessing: boolean;
  setIsProcessing: (b: boolean) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (msg: string | null) => void;

  resetToolState: () => void;
}

export const useStampConvertStore = create<StampConvertState>((set) => ({
  activeSubTool: 'watermark',
  setActiveSubTool: (tool) => set({ activeSubTool: tool, errorMessage: null, successMessage: null }),

  pageRangeOption: 'all',
  setPageRangeOption: (opt) => set({ pageRangeOption: opt }),
  customPageRange: '',
  setCustomPageRange: (range) => set({ customPageRange: range }),
  selectedPages: [],
  setSelectedPages: (pages) => set({ selectedPages: pages }),
  togglePageSelection: (pageNum) =>
    set((state) => {
      const exists = state.selectedPages.includes(pageNum);
      return {
        selectedPages: exists
          ? state.selectedPages.filter((p) => p !== pageNum)
          : [...state.selectedPages, pageNum].sort((a, b) => a - b),
      };
    }),

  // Watermark
  wmType: 'text',
  setWmType: (type) => set({ wmType: type }),
  wmText: 'CONFIDENTIAL',
  setWmText: (text) => set({ wmText: text }),
  wmFontName: 'Helvetica',
  setWmFontName: (wmFontName) => set({ wmFontName }),
  wmFontSize: 48,
  setWmFontSize: (wmFontSize) => set({ wmFontSize }),
  wmColor: '#D92D20',
  setWmColor: (wmColor) => set({ wmColor }),
  wmOpacity: 0.25,
  setWmOpacity: (wmOpacity) => set({ wmOpacity }),
  wmRotation: 45,
  setWmRotation: (wmRotation) => set({ wmRotation }),
  wmPlacement: 'foreground',
  setWmPlacement: (wmPlacement) => set({ wmPlacement }),
  wmRepeat: false,
  setWmRepeat: (wmRepeat) => set({ wmRepeat }),
  wmRepeatDensity: 'medium',
  setWmRepeatDensity: (wmRepeatDensity) => set({ wmRepeatDensity }),
  wmImageBase64: '',
  setWmImageBase64: (wmImageBase64) => set({ wmImageBase64 }),
  wmImageScale: 0.5,
  setWmImageScale: (wmImageScale) => set({ wmImageScale }),
  wmMaintainAspect: true,
  setWmMaintainAspect: (wmMaintainAspect) => set({ wmMaintainAspect }),

  // Page Numbers
  pnPosition: 'bottom-center',
  setPnPosition: (pnPosition) => set({ pnPosition }),
  pnFormat: 'arabic',
  setPnFormat: (pnFormat) => set({ pnFormat }),
  pnStartNumber: 1,
  setPnStartNumber: (pnStartNumber) => set({ pnStartNumber }),
  pnPrefix: '',
  setPnPrefix: (pnPrefix) => set({ pnPrefix }),
  pnSuffix: '',
  setPnSuffix: (pnSuffix) => set({ pnSuffix }),
  pnSeparator: ' of ',
  setPnSeparator: (pnSeparator) => set({ pnSeparator }),
  pnIncludeTotal: false,
  setPnIncludeTotal: (pnIncludeTotal) => set({ pnIncludeTotal }),
  pnFontName: 'Helvetica',
  setPnFontName: (pnFontName) => set({ pnFontName }),
  pnFontSize: 10,
  setPnFontSize: (pnFontSize) => set({ pnFontSize }),
  pnColor: '#475467',
  setPnColor: (pnColor) => set({ pnColor }),
  pnSkipCover: false,
  setPnSkipCover: (pnSkipCover) => set({ pnSkipCover }),

  // Header & Footer
  hfHeaderLeft: '',
  setHfHeaderLeft: (hfHeaderLeft) => set({ hfHeaderLeft }),
  hfHeaderCenter: '{title}',
  setHfHeaderCenter: (hfHeaderCenter) => set({ hfHeaderCenter }),
  hfHeaderRight: '{date}',
  setHfHeaderRight: (hfHeaderRight) => set({ hfHeaderRight }),
  hfFooterLeft: 'Confidential',
  setHfFooterLeft: (hfFooterLeft) => set({ hfFooterLeft }),
  hfFooterCenter: 'Page {page} of {total}',
  setHfFooterCenter: (hfFooterCenter) => set({ hfFooterCenter }),
  hfFooterRight: '',
  setHfFooterRight: (hfFooterRight) => set({ hfFooterRight }),
  hfFontName: 'Helvetica',
  setHfFontName: (hfFontName) => set({ hfFontName }),
  hfFontSize: 9,
  setHfFontSize: (hfFontSize) => set({ hfFontSize }),
  hfColor: '#475467',
  setHfColor: (hfColor) => set({ hfColor }),
  hfDividerLine: true,
  setHfDividerLine: (hfDividerLine) => set({ hfDividerLine }),
  hfDividerColor: '#D0D5DD',
  setHfDividerColor: (hfDividerColor) => set({ hfDividerColor }),
  hfSkipCover: false,
  setHfSkipCover: (hfSkipCover) => set({ hfSkipCover }),

  // Date Stamp
  dsDateFormat: 'DD/MM/YYYY',
  setDsDateFormat: (dsDateFormat) => set({ dsDateFormat }),
  dsCustomDate: '',
  setDsCustomDate: (dsCustomDate) => set({ dsCustomDate }),
  dsPosition: 'bottom-right',
  setDsPosition: (dsPosition) => set({ dsPosition }),
  dsFontName: 'Helvetica',
  setDsFontName: (dsFontName) => set({ dsFontName }),
  dsFontSize: 11,
  setDsFontSize: (dsFontSize) => set({ dsFontSize }),
  dsColor: '#D92D20',
  setDsColor: (dsColor) => set({ dsColor }),
  dsOpacity: 0.85,
  setDsOpacity: (dsOpacity) => set({ dsOpacity }),
  dsRotation: 0,
  setDsRotation: (dsRotation) => set({ dsRotation }),

  // Images to PDF
  imgQueue: [],
  addImagesToQueue: (items) => set((state) => ({ imgQueue: [...state.imgQueue, ...items] })),
  removeImageFromQueue: (id) =>
    set((state) => ({ imgQueue: state.imgQueue.filter((item) => item.id !== id) })),
  reorderImageQueue: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.imgQueue);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { imgQueue: result };
    }),
  rotateImageInQueue: (id, angleDelta) =>
    set((state) => ({
      imgQueue: state.imgQueue.map((item) => {
        if (item.id === id) {
          const current = item.rotation || 0;
          return { ...item, rotation: (current + angleDelta) % 360 };
        }
        return item;
      }),
    })),
  clearImageQueue: () => set({ imgQueue: [] }),
  imgPageSize: 'A4',
  setImgPageSize: (imgPageSize) => set({ imgPageSize }),
  imgFitMode: 'fit',
  setImgFitMode: (imgFitMode) => set({ imgFitMode }),
  imgOrientation: 'auto',
  setImgOrientation: (imgOrientation) => set({ imgOrientation }),
  imgMarginPt: 18,
  setImgMarginPt: (imgMarginPt) => set({ imgMarginPt }),
  imgBgColor: '#FFFFFF',
  setImgBgColor: (imgBgColor) => set({ imgBgColor }),
  imgOutputFilename: 'Converted_Images.pdf',
  setImgOutputFilename: (imgOutputFilename) => set({ imgOutputFilename }),

  // PDF to Images
  p2iFormat: 'png',
  setP2iFormat: (p2iFormat) => set({ p2iFormat }),
  p2iDpi: 150,
  setP2iDpi: (p2iDpi) => set({ p2iDpi }),
  p2iQuality: 90,
  setP2iQuality: (p2iQuality) => set({ p2iQuality }),
  p2iRenderedResult: null,
  setP2iRenderedResult: (p2iRenderedResult) => set({ p2iRenderedResult }),

  // PDF to Text
  p2tMode: 'plain',
  setP2tMode: (p2tMode) => set({ p2tMode }),
  p2tPreservePageBreaks: true,
  setP2tPreservePageBreaks: (p2tPreservePageBreaks) => set({ p2tPreservePageBreaks }),
  p2tExtractedResult: null,
  setP2tExtractedResult: (p2tExtractedResult) => set({ p2tExtractedResult }),
  p2tSearchQuery: '',
  setP2tSearchQuery: (p2tSearchQuery) => set({ p2tSearchQuery }),

  // Loading & Feedback
  isProcessing: false,
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  errorMessage: null,
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  successMessage: null,
  setSuccessMessage: (successMessage) => set({ successMessage }),

  resetToolState: () =>
    set({
      errorMessage: null,
      successMessage: null,
      isProcessing: false,
    }),
}));
