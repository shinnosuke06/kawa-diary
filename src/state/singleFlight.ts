// 実行中にもう一度呼ばれたら、同じ Promise を返す（ボタン連打対策）
export function singleFlight<A extends unknown[], T>(fn: (...args: A) => Promise<T>): (...args: A) => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return (...args: A) => {
    if (inFlight) return inFlight;
    const p = fn(...args).finally(() => {
      inFlight = null;
    });
    inFlight = p;
    return p;
  };
}
