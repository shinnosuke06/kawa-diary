// 外部スクリプトを1回だけ読み込む
const loaded = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  let p = loaded.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        loaded.delete(src);
        reject(new Error(`failed to load ${src}`));
      };
      document.head.appendChild(el);
    });
    loaded.set(src, p);
  }
  return p;
}
