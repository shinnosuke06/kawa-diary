import { expect, it, vi } from 'vitest';
import { ImageDecodeError } from '../errors';
import { decodeImage, toJpeg } from './preparePhoto';

const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

it('decodeImage は imageOrientation 指定が使えないブラウザでは指定なしで読み直す', async () => {
  const bitmap = { width: 10, height: 10 } as ImageBitmap;
  const create = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('unsupported option'))
    .mockResolvedValueOnce(bitmap);
  expect(await decodeImage(file, create)).toBe(bitmap);
  expect(create).toHaveBeenNthCalledWith(1, file, { imageOrientation: 'from-image' });
  expect(create).toHaveBeenNthCalledWith(2, file);
});

it('decodeImage は読めない画像を ImageDecodeError にする', async () => {
  const create = vi.fn().mockRejectedValue(new DOMException('bad', 'InvalidStateError'));
  await expect(decodeImage(file, create)).rejects.toBeInstanceOf(ImageDecodeError);
});

it('toJpeg は使い終わった canvas を解放する（iPhone の canvas メモリ上限対策）', async () => {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: vi.fn(), imageSmoothingEnabled: false, imageSmoothingQuality: 'low' }),
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['jpeg'], { type: 'image/jpeg' })),
  };
  const bitmap = { width: 4000, height: 3000 } as ImageBitmap;
  const result = await toJpeg(bitmap, 2048, 0.85, () => canvas as unknown as HTMLCanvasElement);
  expect(result).toMatchObject({ width: 2048, height: 1536 });
  expect(await result.blob.text()).toBe('jpeg');
  expect([canvas.width, canvas.height]).toEqual([0, 0]);
});
