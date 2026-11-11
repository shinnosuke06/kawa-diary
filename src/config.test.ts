import { describe, expect, it } from 'vitest';
import { APP_PROPERTY_KEY, DRIVE_SCOPE, IMAGE } from './config';

describe('config', () => {
  it('Drive の権限と画像サイズが設計どおり', () => {
    expect(DRIVE_SCOPE).toBe('https://www.googleapis.com/auth/drive.file');
    expect(APP_PROPERTY_KEY).toBe('kawaDiary');
    expect(IMAGE.full).toEqual({ maxLongSide: 2048, quality: 0.85 });
    expect(IMAGE.thumb).toEqual({ maxLongSide: 480, quality: 0.8 });
  });
});
