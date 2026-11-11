// 「後」の写真の位置合わせ。画面座標 = scale * 画像座標 + (x, y)、transform-origin は左上
export interface Transform {
  scale: number;
  x: number;
  y: number;
}

export interface Pt {
  x: number;
  y: number;
}

export const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 4;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function pan(t: Transform, dx: number, dy: number): Transform {
  return { scale: t.scale, x: t.x + dx, y: t.y + dy };
}

// (cx, cy) の点を動かさずに拡大縮小する
function scaleAround(t: Transform, scale: number, from: Pt, to: Pt): Transform {
  const px = (from.x - t.x) / t.scale;
  const py = (from.y - t.y) / t.scale;
  return { scale, x: to.x - scale * px, y: to.y - scale * py };
}

export function zoomAt(t: Transform, factor: number, cx: number, cy: number): Transform {
  const scale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
  if (scale === t.scale) return t;
  const p = { x: cx, y: cy };
  return scaleAround(t, scale, p, p);
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// 2本指: 距離の比で拡大し、中点の移動で平行移動
export function pinch(start: Transform, from: [Pt, Pt], to: [Pt, Pt]): Transform {
  const d0 = dist(from[0], from[1]);
  const ratio = d0 === 0 ? 1 : dist(to[0], to[1]) / d0;
  const scale = clamp(start.scale * ratio, MIN_SCALE, MAX_SCALE);
  return scaleAround(start, scale, mid(from[0], from[1]), mid(to[0], to[1]));
}

export function dividerPercent(clientX: number, left: number, width: number): number {
  if (width <= 0) return 50;
  return clamp(((clientX - left) / width) * 100, 0, 100);
}
