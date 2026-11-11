// ハッシュ方式のルーティング（設計書 4.1）
import { useMemo, useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'itemNew' }
  | { name: 'item'; itemId: string }
  | { name: 'itemEdit'; itemId: string }
  | { name: 'photoNew'; itemId: string }
  | { name: 'photoEdit'; itemId: string; photoId: string }
  | { name: 'careNew'; itemId: string }
  | { name: 'careEdit'; itemId: string; careId: string }
  | { name: 'wears'; itemId: string }
  | { name: 'compare'; itemId: string }
  | { name: 'notFound' };

const NOT_FOUND: Route = { name: 'notFound' };

export function parseRoute(hash: string): Route {
  let seg: string[];
  try {
    seg = hash.replace(/^#/, '').split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return NOT_FOUND;
  }
  if (seg.length === 0) return { name: 'home' };
  if (seg[0] !== 'items' || seg.length < 2) return NOT_FOUND;
  const itemId = seg[1];
  if (seg.length === 2) return itemId === 'new' ? { name: 'itemNew' } : { name: 'item', itemId };
  if (seg.length === 3) {
    if (seg[2] === 'edit') return { name: 'itemEdit', itemId };
    if (seg[2] === 'wears') return { name: 'wears', itemId };
    if (seg[2] === 'compare') return { name: 'compare', itemId };
    return NOT_FOUND;
  }
  if (seg.length === 4) {
    const [, , kind, id] = seg;
    if (kind === 'photos') return id === 'new' ? { name: 'photoNew', itemId } : { name: 'photoEdit', itemId, photoId: id };
    if (kind === 'care') return id === 'new' ? { name: 'careNew', itemId } : { name: 'careEdit', itemId, careId: id };
  }
  return NOT_FOUND;
}

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return useMemo(() => parseRoute(hash), [hash]);
}

export function href(path: string): string {
  return `#${path}`;
}

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  if (opts.replace) window.location.replace(href(path));
  else window.location.hash = path;
}
