import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { dividerPercent, pan, pinch, zoomAt, type Pt, type Transform } from './alignTransform';

export interface CompareSliderProps {
  beforeUrl: string | null;
  afterUrl: string | null;
  aspectRatio: number;
  mode: 'slider' | 'align';
  transform: Transform;
  onTransformChange: (t: Transform) => void;
  divider: number;
  onDividerChange: (v: number) => void;
}

// 2枚を重ね、境界線より左に「前」、右に「後」を見せる
export function CompareSlider(props: CompareSliderProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Pt>());
  const pinchStart = useRef<{ start: Transform; from: [Pt, Pt] } | null>(null);
  const last = useRef<Pt | null>(null);
  const latest = useRef(props);
  latest.current = props;

  const toLocal = (clientX: number, clientY: number): Pt => {
    const rect = frameRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const setDivider = (clientX: number) => {
    const rect = frameRef.current!.getBoundingClientRect();
    latest.current.onDividerChange(dividerPercent(clientX, rect.left, rect.width));
  };

  const beginPinchIfTwo = () => {
    const pts = [...pointers.current.values()];
    pinchStart.current = pts.length === 2 ? { start: latest.current.transform, from: [pts[0], pts[1]] } : null;
    last.current = pts.length === 1 ? pts[0] : null;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    frameRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toLocal(e.clientX, e.clientY));
    if (props.mode === 'slider') setDivider(e.clientX);
    else beginPinchIfTwo();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = toLocal(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, p);
    if (props.mode === 'slider') {
      setDivider(e.clientX);
      return;
    }
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && pinchStart.current) {
      props.onTransformChange(pinch(pinchStart.current.start, pinchStart.current.from, [pts[0], pts[1]]));
    } else if (pts.length === 1 && last.current) {
      props.onTransformChange(pan(latest.current.transform, p.x - last.current.x, p.y - last.current.y));
      last.current = p;
    }
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    beginPinchIfTwo();
  };

  // ホイールでの拡大縮小（ページのスクロールを止めるため passive: false で登録）
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (latest.current.mode !== 'align') return;
      e.preventDefault();
      const p = toLocal(e.clientX, e.clientY);
      latest.current.onTransformChange(zoomAt(latest.current.transform, Math.exp(-e.deltaY / 500), p.x, p.y));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') props.onDividerChange(Math.max(0, props.divider - 2));
    else if (e.key === 'ArrowRight') props.onDividerChange(Math.min(100, props.divider + 2));
    else return;
    e.preventDefault();
  };

  const { x, y, scale } = props.transform;
  return (
    <div
      ref={frameRef}
      className={`compare-frame mode-${props.mode}`}
      data-testid="compare-frame"
      style={{ aspectRatio: String(props.aspectRatio) }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {props.beforeUrl && <img className="compare-img" src={props.beforeUrl} alt="前" draggable={false} />}
      <div className="compare-after" style={{ clipPath: `inset(0 0 0 ${props.divider}%)` }}>
        {props.afterUrl && (
          <img
            className="compare-img"
            data-testid="after-image"
            src={props.afterUrl}
            alt="後"
            draggable={false}
            style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
          />
        )}
      </div>
      <div
        className="compare-divider"
        role="slider"
        aria-label="境界線"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(props.divider)}
        tabIndex={0}
        style={{ left: `${props.divider}%` }}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
