export interface PageInfo {
  page_number: number;
  width: number;
  height: number;
  rotation: number;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creation_date?: string;
  mod_date?: string;
}

export interface DocumentInfo {
  file_id: string;
  filename: string;
  size_bytes: number;
  page_count: number;
  pages: PageInfo[];
  metadata: DocumentMetadata;
  is_encrypted: boolean;
  is_repaired: boolean;
}

export interface RecentDocument {
  file_id: string;
  filename: string;
  size_bytes: number;
  page_count: number;
  last_opened: string;
}

export type ToolModule = 'organise' | 'edit' | 'stamp' | 'convert' | 'finish';

export type ActiveTool =
  | 'select'
  | 'text'
  | 'image'
  | 'highlight'
  | 'draw'
  | 'shapes'
  | 'whiteout'
  | 'redact'
  | 'sign'
  | 'form';

export type OrganiseTool =
  | 'reorder'
  | 'rotate'
  | 'delete'
  | 'duplicate'
  | 'extract'
  | 'insert-blank'
  | 'crop'
  | 'merge'
  | 'split';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

// Organise API schemas
export interface SplitResponse {
  success: boolean;
  message: string;
  output_documents: DocumentInfo[];
}

export interface CropBoxCoords {
  left: number;
  bottom: number;
  right: number;
  top: number;
}
