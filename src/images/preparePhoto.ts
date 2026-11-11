import { IMAGE } from '../config';
import { ImageDecodeError } from '../errors';
import { readTakenDate } from './exifDate';
import { fitWithin } from './fit';

export interface PreparedPhoto {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  takenAt: string;
}

async function toJpeg(
  bitmap: ImageBitmap,
  maxLongSide: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxLongSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageDecodeError('canvas is not available');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new ImageDecodeError('failed to encode jpeg');
  return { blob, width, height };
}

// 選んだ写真を本体（2048px）とサムネイル（480px）の JPEG にする（設計書 3.3）
export async function preparePhoto(file: File, today: string): Promise<PreparedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageDecodeError('failed to decode image');
  }
  try {
    const full = await toJpeg(bitmap, IMAGE.full.maxLongSide, IMAGE.full.quality);
    const thumb = await toJpeg(bitmap, IMAGE.thumb.maxLongSide, IMAGE.thumb.quality);
    const takenAt = await readTakenDate(file, today);
    return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height, takenAt };
  } finally {
    bitmap.close();
  }
}
