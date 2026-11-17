export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatPageDimensions(widthPt: number, heightPt: number): string {
  // 72 points = 1 inch = 25.4 mm
  const widthMm = Math.round((widthPt / 72) * 25.4);
  const heightMm = Math.round((heightPt / 72) * 25.4);
  
  if (Math.abs(widthMm - 210) <= 2 && Math.abs(heightMm - 297) <= 2) {
    return 'A4 · Portrait';
  }
  if (Math.abs(widthMm - 297) <= 2 && Math.abs(heightMm - 210) <= 2) {
    return 'A4 · Landscape';
  }
  if (Math.abs(widthMm - 216) <= 2 && Math.abs(heightMm - 279) <= 2) {
    return 'Letter · Portrait';
  }
  return `${widthMm} × ${heightMm} mm`;
}
