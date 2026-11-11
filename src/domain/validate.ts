import { DataFormatError } from '../errors';
import type { DiaryData } from './types';

export function emptyData(): DiaryData {
  return { version: 1, items: [] };
}

// data.json を読む。形が違えば DataFormatError（上書きを防ぐため）
export function parseDiaryData(text: string): DiaryData {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new DataFormatError('data.json is not valid JSON');
  }
  if (typeof value !== 'object' || value === null) throw new DataFormatError('data.json is not an object');
  const obj = value as { version?: unknown; items?: unknown };
  if (obj.version !== 1) throw new DataFormatError(`unsupported version: ${String(obj.version)}`);
  if (!Array.isArray(obj.items)) throw new DataFormatError('items is not an array');
  return value as DiaryData;
}
