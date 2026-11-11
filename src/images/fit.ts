// 長辺を maxLongSide 以下に収める寸法。拡大はしない
export function fitWithin(width: number, height: number, maxLongSide: number): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxLongSide) return { width, height };
  const ratio = maxLongSide / long;
  return width >= height
    ? { width: maxLongSide, height: Math.round(height * ratio) }
    : { width: Math.round(width * ratio), height: maxLongSide };
}
