// アプリ全体の設定値。Drive の権限はここだけで定義する（設計書 3.1.1）
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const APP_PROPERTY_KEY = 'kawaDiary';

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const GOOGLE_API_KEY: string = import.meta.env.VITE_GOOGLE_API_KEY ?? '';
export const GOOGLE_APP_ID: string = import.meta.env.VITE_GOOGLE_APP_ID ?? '';
export const USE_FAKE_DRIVE: boolean = import.meta.env.VITE_FAKE_DRIVE === '1';

export const IMAGE = {
  full: { maxLongSide: 2048, quality: 0.85 },
  thumb: { maxLongSide: 480, quality: 0.8 },
} as const;
