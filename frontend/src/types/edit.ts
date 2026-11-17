export type ShapeType = 'rect' | 'rounded_rect' | 'circle' | 'ellipse' | 'line' | 'arrow';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextAnnotationItem {
  id: string;
  page_number: number;
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  font_family: string;
  font_size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  opacity: number;
}

export interface ImageAnnotationItem {
  id: string;
  page_number: number;
  image_base64: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export interface HighlightAnnotationItem {
  id: string;
  page_number: number;
  rects: Rect[];
  color: string;
  opacity: number;
}

export interface DrawPath {
  points: Point[];
  color: string;
  width: number;
  opacity: number;
}

export interface DrawAnnotationItem {
  id: string;
  page_number: number;
  paths: DrawPath[];
}

export interface ShapeAnnotationItem {
  id: string;
  page_number: number;
  shape_type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke_color: string;
  stroke_width: number;
  fill_color?: string;
  opacity: number;
  radius?: number;
}

export interface WhiteoutAnnotationItem {
  id: string;
  page_number: number;
  rects: Rect[];
}

export interface RedactAnnotationItem {
  id: string;
  page_number: number;
  rects: Rect[];
  target_text?: string;
  fill_color: string;
  overlay_text?: string;
  text_color: string;
}

export interface SignatureAnnotationItem {
  id: string;
  page_number: number;
  signature_image_base64: string;
  x: number;
  y: number;
  width: number;
  height: number;
  signer_name?: string;
  include_timestamp: boolean;
  timestamp_text?: string;
}

export interface FormFieldInfo {
  name: string;
  field_type: 'text' | 'checkbox' | 'radio' | 'choice' | 'unknown';
  value?: any;
  rect?: [number, number, number, number];
  page_number?: number;
  options?: string[];
}

export interface GetFormFieldsResponse {
  has_form_fields: boolean;
  fields: FormFieldInfo[];
}

export interface BatchApplyEditsRequest {
  texts?: TextAnnotationItem[];
  images?: ImageAnnotationItem[];
  highlights?: HighlightAnnotationItem[];
  drawings?: DrawAnnotationItem[];
  shapes?: ShapeAnnotationItem[];
  whiteouts?: WhiteoutAnnotationItem[];
  redactions?: RedactAnnotationItem[];
  signatures?: SignatureAnnotationItem[];
  form_fills?: Record<string, any>;
  flatten_forms?: boolean;
}
