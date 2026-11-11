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

// canvas を作る関数（テストで差し替えられるように）
const createCanvas = () => document.createElement('canvas');

export async function toJpeg(
  bitmap: ImageBitmap,
  maxLongSide: number,
  quality: number,
  makeCanvas: () => HTMLCanvasElement = createCanvas,
): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxLongSide);
  const canvas = makeCanvas();
  try {
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
  } finally {
    // iPhone の Safari は canvas のメモリ合計に上限があるため、すぐに解放する
    canvas.width = 0;
    canvas.height = 0;
  }
}

type CreateBitmap = (file: Blob, options?: ImageBitmapOptions) => Promise<ImageBitmap>;

// 写真を読み込む。向きの指定に対応していないブラウザでは指定なしで読み直す
export async function decodeImage(
  file: Blob,
  create: CreateBitmap = (f, o) => (o ? createImageBitmap(f, o) : createImageBitmap(f)),
): Promise<ImageBitmap> {
  try {
    return await create(file, { imageOrientation: 'from-image' });
  } catch (e) {
    if (e instanceof TypeError) {
      try {
        return await create(file);
      } catch {
        throw new ImageDecodeError('failed to decode image');
      }
    }
    throw new ImageDecodeError('failed to decode image');
  }
}

// 選んだ写真を本体（2048px）とサムネイル（480px）の JPEG にする（設計書 3.3）
export async function preparePhoto(file: File, today: string): Promise<PreparedPhoto> {
  const bitmap = await decodeImage(file);
  try {
    const full = await toJpeg(bitmap, IMAGE.full.maxLongSide, IMAGE.full.quality);
    const thumb = await toJpeg(bitmap, IMAGE.thumb.maxLongSide, IMAGE.thumb.quality);
    const takenAt = await readTakenDate(file, today);
    return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height, takenAt };
  } finally {
    bitmap.close();
  }
}
