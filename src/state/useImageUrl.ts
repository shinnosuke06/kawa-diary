import { useEffect, useState } from 'react';
import type { Photo } from '../domain/types';
import { FileNotFoundError } from '../errors';
import { useAppState, useController } from './AppContext';

interface ImageState {
  url: string | null;
  error: unknown | null;
}

// 画像を読み込み object URL にする。使い終わったら revoke する
export function useImageUrl(fileId: string | null, size: 'thumb' | 'full'): ImageState {
  const controller = useController();
  const { signedIn } = useAppState();
  const [state, setState] = useState<ImageState>({ url: null, error: null });

  useEffect(() => {
    if (!fileId) {
      setState({ url: null, error: null });
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    controller.loadImage(fileId, size).then(
      (blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setState({ url, error: null });
      },
      (error: unknown) => {
        if (!cancelled) setState({ url: null, error });
      },
    );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // ログインし直したら読み込みをやり直す
  }, [controller, fileId, size, signedIn]);

  return state;
}

// まずサムネイル、読めたら本体に差し替える。本体が読めなければサムネイルのまま
export function usePhotoUrl(photo: Photo | null): { url: string | null; notFound: boolean } {
  const thumb = useImageUrl(photo?.thumbFileId ?? null, 'thumb');
  const full = useImageUrl(photo?.fileId ?? null, 'full');
  const url = full.url ?? thumb.url;
  const notFound =
    url === null &&
    thumb.error !== null &&
    full.error !== null &&
    (thumb.error instanceof FileNotFoundError || full.error instanceof FileNotFoundError);
  return { url, notFound };
}
