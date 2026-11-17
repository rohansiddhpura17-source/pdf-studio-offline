import { DocumentInfo, SplitResponse, CropBoxCoords } from '../types/document';
import {
  TextAnnotationItem,
  ImageAnnotationItem,
  HighlightAnnotationItem,
  DrawAnnotationItem,
  ShapeAnnotationItem,
  WhiteoutAnnotationItem,
  RedactAnnotationItem,
  SignatureAnnotationItem,
  GetFormFieldsResponse,
  BatchApplyEditsRequest
} from '../types/edit';
import {
  WatermarkRequest,
  PageNumbersRequest,
  HeaderFooterRequest,
  DateStampRequest,
  ImagesToPdfRequest,
  PdfToImagesRequest,
  PdfToImagesResponse,
  PdfToTextRequest,
  PdfToTextResponse,
} from '../types/stamp-convert';
import {
  CompressRequest,
  CompressResponse,
  GetMetadataResponse,
  EditMetadataRequest,
  RemoveMetadataRequest,
  PrivacyVerificationReport,
  CompareRequest,
  CompareResponse,
} from '../types/finish';

const BASE_URL = '/api';

export const api = {
  async uploadDocument(file: File): Promise<DocumentInfo> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/document/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }

    return res.json();
  },

  async getDocumentInfo(fileId: string): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/document/${fileId}/info`);
    if (!res.ok) {
      throw new Error('Failed to load document info');
    }
    return res.json();
  },

  getDocumentDownloadUrl(fileId: string): string {
    return `${BASE_URL}/document/${fileId}/download`;
  },

  async downloadDocument(fileId: string, filename: string): Promise<void> {
    const url = this.getDocumentDownloadUrl(fileId);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  async saveAs(fileId: string, newFilename: string): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/document/${fileId}/save-as`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_filename: newFilename }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Save As failed' }));
      throw new Error(err.detail || 'Save As failed');
    }

    return res.json();
  },

  async createSampleDocument(pages: number = 50): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/document/sample?pages=${pages}`, {
      method: 'POST',
    });

    if (!res.ok) {
      throw new Error('Failed to generate sample document');
    }

    return res.json();
  },

  getPageThumbnailUrl(fileId: string, pageNum: number, width: number = 240): string {
    return `${BASE_URL}/document/${fileId}/page/${pageNum}/thumbnail?width=${width}`;
  },

  async cleanupTempStorage(): Promise<{ purged_count: number }> {
    const res = await fetch(`${BASE_URL}/document/system/cleanup`, {
      method: 'POST',
    });
    return res.json();
  },

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/document/system/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  // ================= ORGANISATION TOOLS API =================

  async mergePdfs(fileIds: string[], outputFilename: string = 'merged_document.pdf'): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/organise/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_ids: fileIds, output_filename: outputFilename }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Merge failed' }));
      throw new Error(err.detail || 'Merge failed');
    }
    return res.json();
  },

  async splitPdf(
    fileId: string,
    mode: 'all_pages' | 'ranges' | 'after_pages' = 'ranges',
    ranges?: string[],
    splitAfterPages?: number[]
  ): Promise<SplitResponse> {
    const res = await fetch(`${BASE_URL}/organise/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id: fileId,
        mode,
        ranges,
        split_after_pages: splitAfterPages,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Split failed' }));
      throw new Error(err.detail || 'Split failed');
    }
    return res.json();
  },

  async reorderPages(fileId: string, pageOrder: number[]): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/organise/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, page_order: pageOrder }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Reorder failed' }));
      throw new Error(err.detail || 'Reorder failed');
    }
    return res.json();
  },

  async rotatePages(fileId: string, pageNumbers: number[], angle: 90 | 180 | 270): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/organise/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, page_numbers: pageNumbers, angle }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Rotation failed' }));
      throw new Error(err.detail || 'Rotation failed');
    }
    return res.json();
  },

  async deletePages(fileId: string, pageNumbers: number[]): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/organise/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, page_numbers: pageNumbers }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Delete pages failed' }));
      throw new Error(err.detail || 'Delete pages failed');
    }
    return res.json();
  },

  async duplicatePages(fileId: string, pageNumbers: number[], count: number = 1): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/organise/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, page_numbers: pageNumbers, count }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Duplicate pages failed' }));
      throw new Error(err.detail || 'Duplicate pages failed');
    }
    return res.json();
  },

  async extractPages(fileId: string, pageNumbers: number[], outputFilename?: string): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/organise/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, page_numbers: pageNumbers, output_filename: outputFilename }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Extract pages failed' }));
      throw new Error(err.detail || 'Extract pages failed');
    }
    return res.json();
  },

  async insertBlankPage(
    fileId: string,
    targetPage: number,
    position: 'before' | 'after' = 'after',
    count: number = 1,
    paperSize: 'A4' | 'Letter' = 'A4',
    orientation: 'portrait' | 'landscape' = 'portrait'
  ): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/organise/insert-blank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id: fileId,
        target_page: targetPage,
        position,
        count,
        paper_size: paperSize,
        orientation,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Insert blank page failed' }));
      throw new Error(err.detail || 'Insert blank page failed');
    }
    return res.json();
  },

  async cropPages(fileId: string, pageNumbers: number[], cropBox: CropBoxCoords): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/organise/crop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, page_numbers: pageNumbers, crop_box: cropBox }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Crop pages failed' }));
      throw new Error(err.detail || 'Crop pages failed');
    }
    return res.json();
  },

  // Edit Module API methods
  async getFormFields(fileId: string): Promise<GetFormFieldsResponse> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/form-fields`);
    if (!res.ok) {
      throw new Error('Failed to load form fields');
    }
    return res.json();
  },

  async batchApplyEdits(fileId: string, edits: BatchApplyEditsRequest): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edits),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Applying edits failed' }));
      throw new Error(err.detail || 'Applying edits failed');
    }
    return res.json();
  },

  async addText(fileId: string, item: TextAnnotationItem): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Add text failed' }));
      throw new Error(err.detail || 'Add text failed');
    }
    return res.json();
  },

  async addImage(fileId: string, item: ImageAnnotationItem): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Add image failed' }));
      throw new Error(err.detail || 'Add image failed');
    }
    return res.json();
  },

  async addHighlight(fileId: string, item: HighlightAnnotationItem): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/highlight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Add highlight failed' }));
      throw new Error(err.detail || 'Add highlight failed');
    }
    return res.json();
  },

  async addDraw(fileId: string, item: DrawAnnotationItem): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Add drawing failed' }));
      throw new Error(err.detail || 'Add drawing failed');
    }
    return res.json();
  },

  async addShape(fileId: string, item: ShapeAnnotationItem): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/shape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Add shape failed' }));
      throw new Error(err.detail || 'Add shape failed');
    }
    return res.json();
  },

  async addWhiteout(fileId: string, item: WhiteoutAnnotationItem): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/whiteout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Add whiteout failed' }));
      throw new Error(err.detail || 'Add whiteout failed');
    }
    return res.json();
  },

  async addRedact(fileId: string, item: RedactAnnotationItem): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/redact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Add redaction failed' }));
      throw new Error(err.detail || 'Add redaction failed');
    }
    return res.json();
  },

  async addSignature(fileId: string, item: SignatureAnnotationItem): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Add signature failed' }));
      throw new Error(err.detail || 'Add signature failed');
    }
    return res.json();
  },

  async fillForm(fileId: string, fieldValues: Record<string, any>, flatten: boolean = false): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/edit/${fileId}/form-fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_values: fieldValues, flatten }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Form filling failed' }));
      throw new Error(err.detail || 'Form filling failed');
    }
    return res.json();
  },

  // --- Phase 4: Module C (Stamp) ---
  async applyWatermark(req: WatermarkRequest): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/stamp/watermark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Apply watermark failed' }));
      throw new Error(err.detail || 'Apply watermark failed');
    }
    return res.json();
  },

  async applyPageNumbers(req: PageNumbersRequest): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/stamp/page-numbers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Apply page numbers failed' }));
      throw new Error(err.detail || 'Apply page numbers failed');
    }
    return res.json();
  },

  async applyHeaderFooter(req: HeaderFooterRequest): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/stamp/header-footer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Apply header & footer failed' }));
      throw new Error(err.detail || 'Apply header & footer failed');
    }
    return res.json();
  },

  async applyDateStamp(req: DateStampRequest): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/stamp/date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Apply date stamp failed' }));
      throw new Error(err.detail || 'Apply date stamp failed');
    }
    return res.json();
  },

  // --- Phase 4: Module D (Convert) ---
  async convertImagesToPdf(req: ImagesToPdfRequest): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/convert/images-to-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Images to PDF failed' }));
      throw new Error(err.detail || 'Images to PDF failed');
    }
    return res.json();
  },

  async convertPdfToImages(req: PdfToImagesRequest): Promise<PdfToImagesResponse> {
    const res = await fetch(`${BASE_URL}/convert/pdf-to-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'PDF to Images failed' }));
      throw new Error(err.detail || 'PDF to Images failed');
    }
    return res.json();
  },

  async convertPdfToText(req: PdfToTextRequest): Promise<PdfToTextResponse> {
    const res = await fetch(`${BASE_URL}/convert/pdf-to-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'PDF to Text failed' }));
      throw new Error(err.detail || 'PDF to Text failed');
    }
    return res.json();
  },

  getArchiveDownloadUrl(archiveId: string): string {
    return `${BASE_URL}/convert/download/${archiveId}`;
  },

  // --- Phase 5: Module E (Finish & Compare) ---
  async compressPdf(req: CompressRequest): Promise<CompressResponse> {
    const res = await fetch(`${BASE_URL}/finish/compress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'PDF Compression failed' }));
      throw new Error(err.detail || 'PDF Compression failed');
    }
    return res.json();
  },

  async getMetadata(fileId: string): Promise<GetMetadataResponse> {
    const res = await fetch(`${BASE_URL}/finish/metadata/${fileId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to inspect metadata' }));
      throw new Error(err.detail || 'Failed to inspect metadata');
    }
    return res.json();
  },

  async editMetadata(req: EditMetadataRequest): Promise<DocumentInfo> {
    const res = await fetch(`${BASE_URL}/finish/metadata/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Edit metadata failed' }));
      throw new Error(err.detail || 'Edit metadata failed');
    }
    return res.json();
  },

  async removeMetadata(
    req: RemoveMetadataRequest
  ): Promise<{ document: DocumentInfo; report: PrivacyVerificationReport }> {
    const res = await fetch(`${BASE_URL}/finish/metadata/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Metadata removal failed' }));
      throw new Error(err.detail || 'Metadata removal failed');
    }
    const data = await res.json();
    return {
      document: data.document,
      report: data.report || data.verification_report,
    };
  },

  async comparePdfs(req: CompareRequest): Promise<CompareResponse> {
    const res = await fetch(`${BASE_URL}/finish/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Comparison failed' }));
      throw new Error(err.detail || 'Comparison failed');
    }
    return res.json();
  },

  getComparisonReportUrl(comparisonId: string, format: 'html' | 'json' = 'html'): string {
    return `${BASE_URL}/finish/compare/${comparisonId}/report?format=${format}`;
  },
};
