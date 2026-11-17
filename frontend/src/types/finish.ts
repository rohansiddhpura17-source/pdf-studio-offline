// Types for Phase 5: Module E — Finish & Compare Tools

export type FinishSubTool = 'compress' | 'edit-metadata' | 'remove-metadata' | 'compare';

export type CompressionPreset = 'max_quality' | 'balanced' | 'strong' | 'custom';

export interface CompressRequest {
  file_id: string;
  preset: CompressionPreset;
  dpi?: number;
  jpeg_quality?: number;
  compress_streams: boolean;
  remove_duplicate_objects: boolean;
  optimize_images: boolean;
  preserve_metadata: boolean;
}

export interface CompressResponse {
  file_id: string;
  original_filename: string;
  original_size_bytes: intSafe;
  compressed_size_bytes: intSafe;
  bytes_saved: intSafe;
  percent_reduction: number;
  page_count: number;
  duration_ms: number;
  preset: string;
  is_already_optimized: boolean;
  details: string;
}

type intSafe = number;

export interface MetadataInfo {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creation_date?: string;
  mod_date?: string;
  custom_metadata?: Record<string, string>;
}

export interface DocumentProperties {
  pdf_version: string;
  page_count: number;
  file_size_bytes: number;
  page_dimensions: string;
  is_encrypted: boolean;
  has_xmp: boolean;
  metadata_fields_found: string[];
}

export interface GetMetadataResponse {
  file_id: string;
  filename: string;
  metadata: MetadataInfo;
  properties: DocumentProperties;
}

export interface EditMetadataRequest {
  file_id: string;
  metadata: MetadataInfo;
}

export type MetadataCleanupMode = 'standard' | 'deep';

export interface RemoveMetadataRequest {
  file_id: string;
  mode: MetadataCleanupMode;
  remove_author: boolean;
  remove_title: boolean;
  remove_subject: boolean;
  remove_keywords: boolean;
  remove_creator_producer: boolean;
  remove_timestamps: boolean;
  remove_custom_entries: boolean;
  remove_xmp: boolean;
  remove_thumbnails: boolean;
}

export interface PrivacyVerificationReport {
  file_id: string;
  mode: string;
  fields_before: string[];
  fields_removed: string[];
  fields_remaining: string[];
  is_sanitized: boolean;
  details: string;
}

export type CompareMode = 'all' | 'text' | 'visual';
export type VisualDiffViewMode = 'side-by-side' | 'overlay' | 'diff';

export interface CompareRequest {
  original_file_id: string;
  revised_file_id: string;
  mode: CompareMode;
  sensitivity_threshold: number;
}

export interface TextDiffBlock {
  page_number: number;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  text: string;
  old_text?: string;
  new_text?: string;
}

export interface PageVisualDiffItem {
  page_number: number;
  orig_page_image_b64?: string;
  rev_page_image_b64?: string;
  diff_heatmap_b64?: string;
  diff_percentage: number;
  has_visual_change: boolean;
  is_unpaired: boolean;
  unpaired_status?: string;
}

export interface CompareResponse {
  comparison_id: string;
  orig_file_id: string;
  orig_filename: string;
  orig_page_count: number;
  rev_file_id: string;
  rev_filename: string;
  rev_page_count: number;
  added_pages: number[];
  removed_pages: number[];
  pages_with_text_changes: number[];
  pages_with_visual_changes: number[];
  total_text_differences: number;
  total_visual_differences: number;
  duration_ms: number;
  text_diffs: TextDiffBlock[];
  visual_diffs: PageVisualDiffItem[];
  summary: string;
}
