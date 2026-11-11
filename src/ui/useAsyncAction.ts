import { useMemo, useRef, useState } from 'react';
import { singleFlight } from '../state/singleFlight';

// ボタンから呼ぶ非同期処理。実行中の再実行を防ぎ、失敗は error に入れる
export function useAsyncAction<A extends unknown[]>(fn: (...args: A) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useMemo(
    () =>
      singleFlight(async (...args: A) => {
        setBusy(true);
        setError(null);
        try {
          await fnRef.current(...args);
        } catch (e) {
          setError(e);
        } finally {
          setBusy(false);
        }
      }),
    [],
  );

  return { run, busy, error };
}
