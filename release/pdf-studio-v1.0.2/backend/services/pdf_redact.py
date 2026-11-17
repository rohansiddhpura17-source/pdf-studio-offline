import re
import io
import math
import zlib
from typing import List, Optional, Tuple, Dict, Any, Set
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    DecodedStreamObject,
    EncodedStreamObject,
    NameObject,
    DictionaryObject,
    ArrayObject,
    FloatObject,
    NumberObject
)
from schemas.edit import Rect, RedactAnnotationItem

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex string (#RRGGBB) to 0.0-1.0 RGB tuple."""
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join(c * 2 for c in hex_str)
    if len(hex_str) != 6:
        return 0.0, 0.0, 0.0
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    return r, g, b

def escape_pdf_string(text: str) -> str:
    """Escape parentheses and backslashes for PDF literal strings."""
    return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

# =============================================================================
# 1. 2D AFFINE MATRIX ARITHMETIC (ISO 32000-1 SECTION 8.3)
# =============================================================================

def compose_matrices(m2: List[float], m1: List[float]) -> List[float]:
    """
    Concatenate affine transform m2 to m1: M_new = m2 x m1.
    Each matrix is represented as [a, b, c, d, e, f].
    """
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return [
        a2 * a1 + b2 * c1,
        a2 * b1 + b2 * d1,
        c2 * a1 + d2 * c1,
        c2 * b1 + d2 * d1,
        e2 * a1 + f2 * c1 + e1,
        e2 * b1 + f2 * d1 + f1
    ]

def invert_matrix(m: List[float]) -> Optional[List[float]]:
    """Invert 2D affine matrix [a, b, c, d, e, f]. Returns None if singular."""
    a, b, c, d, e, f = m
    det = a * d - b * c
    if abs(det) < 1e-9:
        return None
    inv_det = 1.0 / det
    ia = d * inv_det
    ib = -b * inv_det
    ic = -c * inv_det
    id_ = a * inv_det
    ie = (c * f - d * e) * inv_det
    if_ = (b * e - a * f) * inv_det
    return [ia, ib, ic, id_, ie, if_]

def transform_point(x: float, y: float, m: List[float]) -> Tuple[float, float]:
    """Transform point (x, y) by matrix [a, b, c, d, e, f]."""
    a, b, c, d, e, f = m
    return (a * x + c * y + e, b * x + d * y + f)

def get_unit_square_bbox(m: List[float]) -> Tuple[float, float, float, float]:
    """Get axis-aligned bounding box of unit square [0,1]x[0,1] transformed by m."""
    pts = [
        transform_point(0.0, 0.0, m),
        transform_point(1.0, 0.0, m),
        transform_point(0.0, 1.0, m),
        transform_point(1.0, 1.0, m)
    ]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))

# =============================================================================
# 2. IMAGE OCCURRENCE TRACKING & RECURSIVE SCANNER
# =============================================================================

class ImageOccurrence:
    """Represents a specific invocation of an image XObject in the graphics stream."""
    def __init__(
        self,
        name: str,
        xobj_ref: Any,
        xobj_dict: Any,
        matrix: List[float],
        bbox: Tuple[float, float, float, float],
        parent_resources: Any,
        stream_owner: Any,
        token_index: int,
        is_nested_in_form: bool = False,
        form_xobj: Optional[Any] = None
    ):
        self.name = name
        self.xobj_ref = xobj_ref
        self.xobj_dict = xobj_dict
        self.matrix = matrix
        self.bbox = bbox
        self.parent_resources = parent_resources
        self.stream_owner = stream_owner
        self.token_index = token_index
        self.is_nested_in_form = is_nested_in_form
        self.form_xobj = form_xobj

def scan_stream_for_images(
    stream_bytes: bytes,
    initial_matrix: List[float],
    resources: Any,
    stream_owner: Any,
    visited_forms: Set[int],
    depth: int = 0
) -> Tuple[List[str], List[ImageOccurrence]]:
    """
    Parse a content stream token by token, tracking graphics stack (q, Q, cm).
    If a Form XObject is encountered, recursively scans its stream and private resources.
    """
    if depth > 10:
        return [], []

    try:
        stream_str = stream_bytes.decode('latin1')
    except Exception:
        stream_str = stream_bytes.decode('utf-8', errors='ignore')

    tokens = stream_str.split()
    stack = [list(initial_matrix)]
    num_stack = []
    occurrences: List[ImageOccurrence] = []

    res_dict = resources.get_object() if hasattr(resources, 'get_object') else resources
    xobjs = res_dict.get(NameObject('/XObject')) if isinstance(res_dict, dict) else None
    xobjs_dict = xobjs.get_object() if hasattr(xobjs, 'get_object') else xobjs

    for i, t in enumerate(tokens):
        if t == "q":
            stack.append(list(stack[-1]))
            num_stack.clear()
        elif t == "Q":
            if len(stack) > 1:
                stack.pop()
            num_stack.clear()
        elif t == "cm" and len(num_stack) >= 6:
            try:
                cm_m = [float(x) for x in num_stack[-6:]]
                stack[-1] = compose_matrices(cm_m, stack[-1])
            except Exception:
                pass
            num_stack.clear()
        elif t == "Do" and num_stack:
            target_name = num_stack[-1]
            token_idx = i - 1
            current_m = list(stack[-1])
            num_stack.clear()

            if isinstance(xobjs_dict, dict):
                ref = xobjs_dict.get(NameObject(target_name)) or xobjs_dict.get(NameObject(f"/{target_name.lstrip('/')}"))
                if ref is not None:
                    target_xobj = ref.get_object() if hasattr(ref, 'get_object') else ref
                    if isinstance(target_xobj, dict):
                        subtype = target_xobj.get(NameObject('/Subtype'))
                        if subtype == NameObject('/Image'):
                            bbox = get_unit_square_bbox(current_m)
                            occ = ImageOccurrence(
                                name=target_name,
                                xobj_ref=ref,
                                xobj_dict=target_xobj,
                                matrix=current_m,
                                bbox=bbox,
                                parent_resources=xobjs_dict,
                                stream_owner=stream_owner,
                                token_index=token_idx,
                                is_nested_in_form=(depth > 0),
                                form_xobj=stream_owner if depth > 0 else None
                            )
                            occurrences.append(occ)
                        elif subtype == NameObject('/Form'):
                            # Priority 2: Recursive Form XObject traversal
                            form_id = id(target_xobj)
                            if form_id not in visited_forms:
                                visited_forms.add(form_id)
                                form_matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
                                if NameObject('/Matrix') in target_xobj:
                                    try:
                                        form_matrix = [float(v) for v in target_xobj[NameObject('/Matrix')]]
                                    except Exception:
                                        pass
                                form_composed = compose_matrices(form_matrix, current_m)
                                form_res = target_xobj.get(NameObject('/Resources')) or resources
                                form_data = target_xobj.get_data() if hasattr(target_xobj, 'get_data') else b""
                                _, nested_occs = scan_stream_for_images(
                                    form_data,
                                    form_composed,
                                    form_res,
                                    target_xobj,
                                    visited_forms,
                                    depth=depth + 1
                                )
                                occurrences.extend(nested_occs)
        else:
            num_stack.append(t)

    return tokens, occurrences

def scan_page_images_recursive(page: Any) -> Tuple[List[str], List[ImageOccurrence]]:
    """Scan all image occurrences on page, including nested Form XObjects."""
    contents = page.get_contents()
    if contents is None:
        return [], []
    if hasattr(contents, "get_data"):
        data = contents.get_data()
    elif isinstance(contents, (list, ArrayObject)):
        data = b"".join(c.get_data() for c in contents if hasattr(c, "get_data"))
    else:
        data = b""

    res = page.get(NameObject("/Resources"))
    visited_forms: Set[int] = set()
    initial_matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
    return scan_stream_for_images(data, initial_matrix, res, page, visited_forms, depth=0)

# =============================================================================
# 3. PIXEL INTERSECTION & CLONING ENGINE
# =============================================================================

def compute_pixel_intersections(
    occ: ImageOccurrence,
    rects: List[Rect],
    img_w: int,
    img_h: int
) -> List[Tuple[int, int, int, int]]:
    """
    Map redaction rectangles through the inverted matrix into normalized (u, v) space
    and compute exact bitmap pixel bounding boxes [px0, py0, px1, py1].
    Handles rotated, scaled, and translated images.
    """
    inv_m = invert_matrix(occ.matrix)
    if not inv_m:
        # Fallback to AABB if matrix cannot be inverted
        bx0, by0, bx1, by1 = occ.bbox
        bw = max(1.0, bx1 - bx0)
        bh = max(1.0, by1 - by0)
        intersections = []
        for r in rects:
            rx0, rx1 = float(r.x), float(r.x) + float(r.width)
            ry0, ry1 = float(r.y), float(r.y) + float(r.height)
            ix0, iy0 = max(bx0, rx0), max(by0, ry0)
            ix1, iy1 = min(bx1, rx1), min(by1, ry1)
            if ix1 > ix0 and iy1 > iy0:
                px0 = int(round(((ix0 - bx0) / bw) * img_w))
                px1 = int(round(((ix1 - bx0) / bw) * img_w))
                py0 = int(round(((by1 - iy1) / bh) * img_h))
                py1 = int(round(((by1 - iy0) / bh) * img_h))
                intersections.append((
                    max(0, min(px0, img_w)),
                    max(0, min(py0, img_h)),
                    max(0, min(px1, img_w)),
                    max(0, min(py1, img_h))
                ))
        return intersections

    intersections = []
    for r in rects:
        rx0 = float(r.x)
        rx1 = float(r.x) + float(r.width)
        ry0 = float(r.y)
        ry1 = float(r.y) + float(r.height)

        # Quick AABB rejection
        bx0, by0, bx1, by1 = occ.bbox
        if rx1 < bx0 or rx0 > bx1 or ry1 < by0 or ry0 > by1:
            continue

        # Sample points on the redaction rectangle
        u_vals = []
        v_vals = []
        samples_x = [rx0, (rx0 + rx1) * 0.5, rx1]
        samples_y = [ry0, (ry0 + ry1) * 0.5, ry1]

        # 1. Transform rect perimeter into (u, v) space
        for sx in samples_x:
            for sy in samples_y:
                u, v = transform_point(sx, sy, inv_m)
                if 0.0 <= u <= 1.0 and 0.0 <= v <= 1.0:
                    u_vals.append(u)
                    v_vals.append(v)

        # 2. Also check if image corners fall inside the redaction rectangle
        unit_corners = [(0.0, 0.0), (1.0, 0.0), (0.0, 1.0), (1.0, 1.0)]
        for uc_x, uc_y in unit_corners:
            px_pt, py_pt = transform_point(uc_x, uc_y, occ.matrix)
            if rx0 <= px_pt <= rx1 and ry0 <= py_pt <= ry1:
                u_vals.append(uc_x)
                v_vals.append(uc_y)

        if not u_vals or not v_vals:
            # Check if centers overlap
            cx, cy = (rx0 + rx1) * 0.5, (ry0 + ry1) * 0.5
            cu, cv = transform_point(cx, cy, inv_m)
            if 0.0 <= cu <= 1.0 and 0.0 <= cv <= 1.0:
                u_vals.append(cu)
                v_vals.append(cv)

        if u_vals and v_vals:
            u_min = max(0.0, min(u_vals))
            u_max = min(1.0, max(u_vals))
            v_min = max(0.0, min(v_vals))
            v_max = min(1.0, max(v_vals))

            # Invert V: PDF bottom-to-top (v=1 is top), Pillow top-to-bottom (py=0 is top)
            px0 = int(math.floor(u_min * img_w))
            px1 = int(math.ceil(u_max * img_w))
            py0 = int(math.floor((1.0 - v_max) * img_h))
            py1 = int(math.ceil((1.0 - v_min) * img_h))

            px0, px1 = max(0, min(px0, img_w)), max(0, min(px1, img_w))
            py0, py1 = max(0, min(py0, img_h)), max(0, min(py1, img_h))

            if px1 > px0 and py1 > py0:
                intersections.append((px0, py0, px1, py1))

    return intersections

def apply_pixel_redaction_to_image_dict(
    img_obj: Any,
    intersections: List[Tuple[int, int, int, int]],
    is_full_redaction: bool
) -> bool:
    """
    Permanently modify underlying raster image pixels and sanitize associated /SMask or /Mask.
    """
    raw_data = img_obj.get_data() if hasattr(img_obj, "get_data") else b""
    W = int(img_obj.get(NameObject("/Width"), 200))
    H = int(img_obj.get(NameObject("/Height"), 200))

    pil_img = None
    try:
        pil_img = Image.open(io.BytesIO(raw_data))
    except Exception:
        pass

    # Priority 4: Handle raw decompressed Flate raster byte streams
    if pil_img is None:
        try:
            cs = img_obj.get(NameObject("/ColorSpace"))
            cs_str = str(cs) if cs else "/DeviceRGB"
            if "RGB" in cs_str and len(raw_data) >= W * H * 3:
                pil_img = Image.frombytes("RGB", (W, H), raw_data[:W * H * 3])
            elif "Gray" in cs_str and len(raw_data) >= W * H:
                pil_img = Image.frombytes("L", (W, H), raw_data[:W * H])
            elif "CMYK" in cs_str and len(raw_data) >= W * H * 4:
                pil_img = Image.frombytes("CMYK", (W, H), raw_data[:W * H * 4]).convert("RGB")
            else:
                pil_img = Image.new("RGB", (W, H), (0, 0, 0))
        except Exception:
            return False

    if pil_img is None:
        return False

    pil_img = pil_img.copy()
    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")

    W, H = pil_img.size
    draw = ImageDraw.Draw(pil_img)

    for px0, py0, px1, py1 in intersections:
        draw.rectangle([px0, py0, px1, py1], fill=(0, 0, 0))

    if is_full_redaction:
        draw.rectangle([0, 0, W, H], fill=(0, 0, 0))

    # Priority 3: Soft Mask (/SMask) and Mask (/Mask) Redaction
    if NameObject("/SMask") in img_obj:
        smask_ref = img_obj[NameObject("/SMask")]
        smask_obj = smask_ref.get_object() if hasattr(smask_ref, "get_object") else smask_ref
        if isinstance(smask_obj, dict) and smask_obj.get(NameObject("/Subtype")) == NameObject("/Image"):
            try:
                mask_raw = smask_obj.get_data()
                mask_pil = None
                try:
                    mask_pil = Image.open(io.BytesIO(mask_raw)).convert("L")
                except Exception:
                    mw = int(smask_obj.get(NameObject("/Width"), W))
                    mh = int(smask_obj.get(NameObject("/Height"), H))
                    if len(mask_raw) >= mw * mh:
                        mask_pil = Image.frombytes("L", (mw, mh), mask_raw[:mw * mh])

                if mask_pil:
                    mw, mh = mask_pil.size
                    draw_m = ImageDraw.Draw(mask_pil)
                    for px0, py0, px1, py1 in intersections:
                        m_px0 = int(round(px0 * (mw / W)))
                        m_px1 = int(round(px1 * (mw / W)))
                        m_py0 = int(round(py0 * (mh / H)))
                        m_py1 = int(round(py1 * (mh / H)))
                        draw_m.rectangle([m_px0, m_py0, m_px1, m_py1], fill=0)

                    if is_full_redaction:
                        draw_m.rectangle([0, 0, mw, mh], fill=0)

                    new_mask_bytes = zlib.compress(mask_pil.tobytes())
                    smask_obj._data = new_mask_bytes
                    smask_obj[NameObject("/Filter")] = NameObject("/FlateDecode")
                    smask_obj[NameObject("/Length")] = NumberObject(len(new_mask_bytes))

                if is_full_redaction:
                    del img_obj[NameObject("/SMask")]
                    smask_obj._data = b""
            except Exception:
                if NameObject("/SMask") in img_obj:
                    del img_obj[NameObject("/SMask")]

    if NameObject("/Mask") in img_obj:
        mask_val = img_obj[NameObject("/Mask")]
        mask_obj = mask_val.get_object() if hasattr(mask_val, "get_object") else mask_val
        if isinstance(mask_obj, dict) and mask_obj.get(NameObject("/Subtype")) == NameObject("/Image"):
            try:
                m_raw = mask_obj.get_data()
                m_pil = None
                try:
                    m_pil = Image.open(io.BytesIO(m_raw)).convert("1")
                except Exception:
                    mw = int(mask_obj.get(NameObject("/Width"), W))
                    mh = int(mask_obj.get(NameObject("/Height"), H))
                    if len(m_raw) >= mw * mh:
                        m_pil = Image.frombytes("1", (mw, mh), m_raw[:mw * mh])

                if m_pil:
                    mw, mh = m_pil.size
                    draw_m = ImageDraw.Draw(m_pil)
                    for px0, py0, px1, py1 in intersections:
                        m_px0 = int(round(px0 * (mw / W)))
                        m_px1 = int(round(px1 * (mw / W)))
                        m_py0 = int(round(py0 * (mh / H)))
                        m_py1 = int(round(py1 * (mh / H)))
                        draw_m.rectangle([m_px0, m_py0, m_px1, m_py1], fill=0)

                    if is_full_redaction:
                        draw_m.rectangle([0, 0, mw, mh], fill=0)

                    new_m_bytes = zlib.compress(m_pil.tobytes())
                    mask_obj._data = new_m_bytes
                    mask_obj[NameObject("/Filter")] = NameObject("/FlateDecode")
                    mask_obj[NameObject("/Length")] = NumberObject(len(new_m_bytes))

                if is_full_redaction:
                    del img_obj[NameObject("/Mask")]
                    mask_obj._data = b""
            except Exception:
                del img_obj[NameObject("/Mask")]
        else:
            if is_full_redaction:
                del img_obj[NameObject("/Mask")]

    # Re-encode modified image to JPEG stream
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=90)
    new_bytes = buf.getvalue()

    # Update XObject dictionary and byte payload permanently
    img_obj._data = new_bytes
    img_obj[NameObject("/Filter")] = NameObject("/DCTDecode")
    img_obj[NameObject("/ColorSpace")] = NameObject("/DeviceRGB")
    img_obj[NameObject("/BitsPerComponent")] = NumberObject(8)
    img_obj[NameObject("/Width")] = NumberObject(W)
    img_obj[NameObject("/Height")] = NumberObject(H)
    img_obj[NameObject("/Length")] = NumberObject(len(new_bytes))
    if NameObject("/DecodeParms") in img_obj:
        del img_obj[NameObject("/DecodeParms")]

    return True

def clone_image_xobject(orig_img_obj: Any) -> DecodedStreamObject:
    """Create an independent clone of an Image XObject."""
    clone = DecodedStreamObject()
    for k, v in orig_img_obj.items():
        clone[k] = v
    if hasattr(orig_img_obj, "_data"):
        clone._data = bytes(orig_img_obj._data)
    elif hasattr(orig_img_obj, "get_data"):
        clone._data = bytes(orig_img_obj.get_data())
    return clone

def replace_token_in_stream(owner: Any, token_idx: int, new_token: str):
    """Replace a specific token in a page or form content stream directly on the underlying stream object."""
    target_stream_obj = None
    if isinstance(owner, dict) and NameObject("/Contents") in owner:
        contents_ref = owner[NameObject("/Contents")]
        target_stream_obj = contents_ref.get_object() if hasattr(contents_ref, "get_object") else contents_ref
    elif hasattr(owner, "_data") or hasattr(owner, "get_data"):
        target_stream_obj = owner

    if target_stream_obj is None:
        return

    if isinstance(target_stream_obj, ArrayObject):
        raw_bytes = b"".join(c.get_object().get_data() for c in target_stream_obj if hasattr(c.get_object(), "get_data"))
    elif hasattr(target_stream_obj, "get_data"):
        raw_bytes = target_stream_obj.get_data()
    else:
        raw_bytes = getattr(target_stream_obj, "_data", b"")

    try:
        stream_str = raw_bytes.decode("latin1")
    except Exception:
        stream_str = raw_bytes.decode("utf-8", errors="ignore")

    tokens = stream_str.split()
    if 0 <= token_idx < len(tokens):
        tokens[token_idx] = new_token
        new_stream_bytes = " ".join(tokens).encode("latin1")
        if isinstance(target_stream_obj, ArrayObject):
            first = target_stream_obj[0].get_object() if hasattr(target_stream_obj[0], "get_object") else target_stream_obj[0]
            first._data = new_stream_bytes
            for other in target_stream_obj[1:]:
                o = other.get_object() if hasattr(other, "get_object") else other
                o._data = b""
        else:
            if hasattr(target_stream_obj, "_data"):
                target_stream_obj._data = new_stream_bytes
            if hasattr(target_stream_obj, "set_data"):
                target_stream_obj.set_data(new_stream_bytes)

# =============================================================================
# 4. MASTER REDACTION DISPATCHER
# =============================================================================

def redact_raster_images_on_page(
    page: Any,
    rects: List[Rect],
    page_width: float,
    page_height: float,
    writer: Optional[PdfWriter] = None
) -> int:
    """
    Permanently modify underlying raster image pixels for any XObject intersecting redaction rects.
    Handles multiple uses of the same XObject, recursive Form XObjects, and /SMask transparency.
    """
    tokens, occurrences = scan_page_images_recursive(page)
    if not occurrences:
        return 0

    # Group occurrences by image XObject identity
    xobj_groups: Dict[int, List[ImageOccurrence]] = {}
    for occ in occurrences:
        xid = id(occ.xobj_dict)
        if xid not in xobj_groups:
            xobj_groups[xid] = []
        xobj_groups[xid].append(occ)

    images_redacted = 0
    clone_counter = 0

    for xid, occ_list in xobj_groups.items():
        first_occ = occ_list[0]
        orig_img_dict = first_occ.xobj_dict
        W = int(orig_img_dict.get(NameObject("/Width"), 200))
        H = int(orig_img_dict.get(NameObject("/Height"), 200))

        # Check which occurrences intersect the redaction rects
        intersecting_occs: List[Tuple[ImageOccurrence, List[Tuple[int, int, int, int]]]] = []
        non_intersecting_occs: List[ImageOccurrence] = []

        for occ in occ_list:
            intersections = compute_pixel_intersections(occ, rects, W, H)
            if intersections:
                intersecting_occs.append((occ, intersections))
            else:
                non_intersecting_occs.append(occ)

        if not intersecting_occs:
            continue

        # Case A: ALL occurrences of this XObject are redacted (or only 1 occurrence exists)
        if len(non_intersecting_occs) == 0:
            # Combine all intersections across all occurrences
            all_intersections = []
            for _, inters in intersecting_occs:
                all_intersections.extend(inters)
            # Check if total covered area >= 85%
            total_area = sum((x1 - x0) * (y1 - y0) for x0, y0, x1, y1 in all_intersections)
            is_full = total_area >= 0.85 * (W * H)

            if apply_pixel_redaction_to_image_dict(orig_img_dict, all_intersections, is_full):
                images_redacted += 1

        # Case B: Priority 1 — Only SOME occurrences are redacted (shared image used elsewhere)
        else:
            for occ, inters in intersecting_occs:
                clone_counter += 1
                cloned_xobj = clone_image_xobject(orig_img_dict)
                total_area = sum((x1 - x0) * (y1 - y0) for x0, y0, x1, y1 in inters)
                is_full = total_area >= 0.85 * (W * H)

                if apply_pixel_redaction_to_image_dict(cloned_xobj, inters, is_full):
                    clean_base = occ.name.lstrip("/").replace(" ", "_")
                    new_name = f"{clean_base}_redacted_{clone_counter}"

                    # Register cloned XObject in parent resources
                    parent_res = occ.parent_resources
                    if writer is not None:
                        cloned_ref = writer._add_object(cloned_xobj)
                    else:
                        cloned_ref = cloned_xobj

                    parent_res[NameObject(f"/{new_name}")] = cloned_ref

                    # Replace Do operator token in the corresponding stream owner
                    replace_token_in_stream(occ.stream_owner, occ.token_index, f"/{new_name}")
                    images_redacted += 1

    return images_redacted

# =============================================================================
# 5. CONTENT STREAM & ANNOTATION SANITIZATION
# =============================================================================

def sanitize_content_stream_by_text(stream_bytes: bytes, target_texts: List[str]) -> bytes:
    """Remove target_texts from the PDF content stream (Tj and TJ operands)."""
    if not target_texts:
        return stream_bytes

    try:
        stream_str = stream_bytes.decode('latin1')
    except Exception:
        stream_str = stream_bytes.decode('utf-8', errors='ignore')

    for target in target_texts:
        if not target.strip():
            continue
        escaped_target = escape_pdf_string(target)
        stream_str = stream_str.replace(f"({escaped_target})", "()")
        stream_str = stream_str.replace(f"({target})", "()")
        pattern = re.compile(rf'\((?:[^\)]*{re.escape(target)}[^\)]*)\)\s*Tj', re.IGNORECASE)
        stream_str = pattern.sub('() Tj', stream_str)
        pattern_tj = re.compile(rf'\[([^\]]*{re.escape(target)}[^\]]*)\]\s*TJ', re.IGNORECASE)
        stream_str = pattern_tj.sub('[] TJ', stream_str)

        raw_target_bytes = target.encode('latin1', errors='ignore')
        stream_bytes = stream_str.encode('latin1')
        stream_bytes = stream_bytes.replace(raw_target_bytes, b'')
        stream_str = stream_bytes.decode('latin1')

    return stream_str.encode('latin1')

def sanitize_page_annotations(page: Any, rects: List[Rect], page_height: float):
    """Remove any annotations overlapping any redaction box."""
    annots = page.get(NameObject('/Annots'))
    if not annots:
        return

    kept_annots = ArrayObject()
    for annot_ref in annots:
        try:
            annot_obj = annot_ref.get_object() if hasattr(annot_ref, 'get_object') else annot_ref
            if not isinstance(annot_obj, dict):
                kept_annots.append(annot_ref)
                continue

            annot_rect = annot_obj.get(NameObject('/Rect'))
            if not annot_rect or len(annot_rect) < 4:
                kept_annots.append(annot_ref)
                continue

            ax1, ay1, ax2, ay2 = [float(v) for v in annot_rect[:4]]
            annot_min_x, annot_max_x = min(ax1, ax2), max(ax1, ax2)
            annot_min_y, annot_max_y = min(ay1, ay2), max(ay1, ay2)

            overlaps = False
            for r in rects:
                rx1 = r.x
                rx2 = r.x + r.width
                ry1 = r.y
                ry2 = r.y + r.height
                if not (annot_max_x < rx1 or annot_min_x > rx2 or annot_max_y < ry1 or annot_min_y > ry2):
                    overlaps = True
                    break

            if not overlaps:
                kept_annots.append(annot_ref)
        except Exception:
            kept_annots.append(annot_ref)

    page[NameObject('/Annots')] = kept_annots

def apply_redaction_to_page(
    page: Any,
    redaction_item: RedactAnnotationItem,
    page_width: float,
    page_height: float,
    writer: Optional[PdfWriter] = None
):
    """
    Permanently sanitize page content stream for the given redaction item,
    wipe intersecting raster image pixels (with cloning & Form traversal),
    and append an opaque redaction block.
    """
    target_texts = []
    if redaction_item.target_text:
        target_texts.append(redaction_item.target_text)

    if redaction_item.rects:
        text_inside_boxes = []
        def visitor(text, cm, tm, font_dict, font_size):
            if not text.strip():
                return
            tx, ty = tm[4], tm[5]
            for r in redaction_item.rects:
                if (r.x <= tx <= r.x + r.width + 10) and (r.y <= ty <= r.y + r.height + 10):
                    text_inside_boxes.append(text.strip())

        try:
            page.extract_text(visitor_text=visitor)
        except Exception:
            pass

        target_texts.extend(text_inside_boxes)

    # 1. Sanitize text in content streams
    existing_contents = page.get_contents()
    if existing_contents is not None:
        if isinstance(existing_contents, ArrayObject):
            combined_data = b"".join(c.get_data() for c in existing_contents)
        else:
            combined_data = existing_contents.get_data()
        sanitized_data = sanitize_content_stream_by_text(combined_data, target_texts)
    else:
        sanitized_data = b""

    # Write sanitized text data immediately to page contents so subsequent operations read sanitized stream
    raw_contents = page.get(NameObject('/Contents'))
    if raw_contents is not None:
        target_obj = raw_contents.get_object() if hasattr(raw_contents, 'get_object') else raw_contents
        if isinstance(target_obj, ArrayObject):
            for idx, item in enumerate(target_obj):
                sub_obj = item.get_object() if hasattr(item, 'get_object') else item
                if hasattr(sub_obj, '_data'):
                    sub_obj._data = sanitized_data if idx == 0 else b""
                if hasattr(sub_obj, 'set_data'):
                    sub_obj.set_data(sanitized_data if idx == 0 else b"")
        else:
            if hasattr(target_obj, '_data'):
                target_obj._data = sanitized_data
            if hasattr(target_obj, 'set_data'):
                target_obj.set_data(sanitized_data)
    else:
        new_stream = DecodedStreamObject()
        new_stream.set_data(sanitized_data)
        page[NameObject('/Contents')] = new_stream

    # 2. Purge overlapping annotations
    sanitize_page_annotations(page, redaction_item.rects, page_height)

    # 3. Permanently sanitize intersecting raster image pixels in XObjects (inc. forms & clones)
    if redaction_item.rects:
        redact_raster_images_on_page(page, redaction_item.rects, page_width, page_height, writer=writer)

    # 4. Generate opaque redaction block operations
    r, g, b = hex_to_rgb(redaction_item.fill_color or "#000000")
    tr, tg, tb = hex_to_rgb(redaction_item.text_color or "#FFFFFF")

    redact_ops = ["q"]

    resources = page.get(NameObject('/Resources'))
    if resources is None:
        resources = DictionaryObject()
        page[NameObject('/Resources')] = resources

    fonts = resources.get(NameObject('/Font'))
    if fonts is None:
        fonts = DictionaryObject()
        resources[NameObject('/Font')] = fonts

    if NameObject('/RedactFont') not in fonts:
        fonts[NameObject('/RedactFont')] = DictionaryObject({
            NameObject('/Type'): NameObject('/Font'),
            NameObject('/Subtype'): NameObject('/Type1'),
            NameObject('/BaseFont'): NameObject('/Helvetica-Bold'),
        })

    for rect in redaction_item.rects:
        rx = float(rect.x)
        ry = float(rect.y)
        rw = float(rect.width)
        rh = float(rect.height)

        redact_ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg")
        redact_ops.append(f"{rx:.2f} {ry:.2f} {rw:.2f} {rh:.2f} re")
        redact_ops.append("f")

        if redaction_item.overlay_text and rw > 20 and rh > 8:
            overlay = escape_pdf_string(redaction_item.overlay_text)
            font_size = min(max(8.0, rh * 0.5), 14.0)
            text_x = rx + max(4.0, (rw - (len(redaction_item.overlay_text) * font_size * 0.55)) / 2)
            text_y = ry + max(2.0, (rh - font_size) / 2)

            redact_ops.append("BT")
            redact_ops.append("/RedactFont {:.1f} Tf".format(font_size))
            redact_ops.append(f"{tr:.3f} {tg:.3f} {tb:.3f} rg")
            redact_ops.append(f"{text_x:.2f} {text_y:.2f} Td")
            redact_ops.append(f"({overlay}) Tj")
            redact_ops.append("ET")

    redact_ops.append("Q\n")

    # Read the updated stream directly from target_obj (which preserves cloned token replacements!)
    raw_contents = page.get(NameObject('/Contents'))
    target_obj = raw_contents.get_object() if hasattr(raw_contents, 'get_object') else raw_contents
    if isinstance(target_obj, ArrayObject):
        first_sub = target_obj[0].get_object() if hasattr(target_obj[0], 'get_object') else target_obj[0]
        base_stream_data = getattr(first_sub, "_data", sanitized_data)
    elif hasattr(target_obj, "_data"):
        base_stream_data = target_obj._data
    elif hasattr(target_obj, "get_data"):
        base_stream_data = target_obj.get_data()
    else:
        base_stream_data = sanitized_data

    final_stream_data = base_stream_data + b"\n" + "\n".join(redact_ops).encode('latin1')

    if raw_contents is not None:
        if isinstance(target_obj, ArrayObject):
            for idx, item in enumerate(target_obj):
                sub_obj = item.get_object() if hasattr(item, 'get_object') else item
                if hasattr(sub_obj, '_data'):
                    sub_obj._data = final_stream_data if idx == 0 else b""
                if hasattr(sub_obj, 'set_data'):
                    sub_obj.set_data(final_stream_data if idx == 0 else b"")
        else:
            if hasattr(target_obj, '_data'):
                target_obj._data = final_stream_data
            if hasattr(target_obj, 'set_data'):
                target_obj.set_data(final_stream_data)
    else:
        new_stream = DecodedStreamObject()
        new_stream.set_data(final_stream_data)
        page[NameObject('/Contents')] = new_stream
