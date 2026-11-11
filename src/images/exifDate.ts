import exifr from 'exifr';
import { toLocalDate } from '../domain/dates';

// 撮影日: EXIF → ファイルの更新日 → 今日（設計書 2.4）
export async function readTakenDate(file: File, today: string): Promise<string> {
  try {
    const exif = await exifr.parse(file, { pick: ['DateTimeOriginal'] });
    const taken = exif?.DateTimeOriginal;
    if (taken instanceof Date && !Number.isNaN(taken.getTime())) return toLocalDate(taken);
  } catch {
    // EXIF が読めなくても次の手段へ
  }
  if (file.lastModified) return toLocalDate(new Date(file.lastModified));
  return today;
}
