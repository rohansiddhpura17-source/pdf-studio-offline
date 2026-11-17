// Phase 4: Module C (Stamp) & Module D (Convert) Types

export interface WatermarkRequest {
  file_id: string;
  type?: 'text' | 'image';
  text?: string;
  font_name?: 'Helvetica' | 'Times-Roman' | 'Courier';
  font_size?: number;
  color?: string; // hex #RRGGBB
  opacity?: number; // 0.0 - 1.0
  rotation?: number; // degrees, e.g. 45
  placement?: 'foreground' | 'background';
  repeat?: boolean;
  repeat_density?: 'loose' | 'medium' | 'dense';
  image_base64?: string;
  image_scale?: number;
  maintain_aspect_ratio?: boolean;
  page_selection?: number[];
  page_range?: string;
}

export interface PageNumbersRequest {
  file_id: string;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  format?: 'arabic' | 'padded' | 'roman_lower' | 'roman_upper';
  start_number?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  include_total?: boolean;
  font_name?: 'Helvetica' | 'Times-Roman' | 'Courier';
  font_size?: number;
  color?: string;
  skip_cover?: boolean;
  margin_x?: number;
  margin_y?: number;
  page_selection?: number[];
  page_range?: string;
}

export interface HeaderFooterRequest {
  file_id: string;
  header_left?: string;
  header_center?: string;
  header_right?: string;
  footer_left?: string;
  footer_center?: string;
  footer_right?: string;
  font_name?: 'Helvetica' | 'Times-Roman' | 'Courier';
  font_size?: number;
  color?: string;
  margin_top?: number;
  margin_bottom?: number;
  margin_horizontal?: number;
  divider_line?: boolean;
  divider_color?: string;
  skip_cover?: boolean;
  page_selection?: number[];
  page_range?: string;
}

export interface DateStampRequest {
  file_id: string;
  date_format?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'full';
  custom_date?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  font_name?: 'Helvetica' | 'Times-Roman' | 'Courier';
  font_size?: number;
  color?: string;
  opacity?: number;
  rotation?: number;
  margin_x?: number;
  margin_y?: number;
  page_selection?: number[];
  page_range?: string;
}

export interface ImageInputItem {
  id: string;
  name: string;
  data_base64: string;
  rotation?: number; // 0, 90, 180, 270
}

export interface ImagesToPdfRequest {
  images: ImageInputItem[];
  output_filename?: string;
  page_size?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Original' | 'Custom';
  custom_width_pt?: number;
  custom_height_pt?: number;
  fit_mode?: 'fit' | 'fill' | 'stretch';
  orientation?: 'portrait' | 'landscape' | 'auto';
  margin_pt?: number;
  bg_color?: string;
}

export interface PdfToImagesRequest {
  file_id: string;
  format?: 'png' | 'jpeg';
  dpi?: number; // 72 - 300
  quality?: number; // 1 - 100 (for jpeg)
  page_selection?: number[];
  page_range?: string;
}

export interface RenderedImageItem {
  page_number: number;
  image_base64: string;
  width: number;
  height: number;
  size_bytes: number;
  format: string;
}

export interface PdfToImagesResponse {
  total_pages_rendered: number;
  images: RenderedImageItem[];
  archive_file_id?: string;
  format: string;
  dpi: number;
}

export interface PdfToTextRequest {
  file_id: string;
  mode?: 'plain' | 'layout';
  preserve_page_breaks?: boolean;
  page_selection?: number[];
  page_range?: string;
}

export interface PageTextItem {
  page_number: number;
  text: string;
  character_count: number;
  is_likely_scanned: boolean;
}

export interface PdfToTextResponse {
  full_text: string;
  total_characters: number;
  pages: PageTextItem[];
  has_scanned_pages: boolean;
  scanned_warning?: string;
}
