import { expect, it } from 'vitest';
import {
  AuthRequiredError,
  DriveApiError,
  FileNotFoundError,
  FolderNotWritableError,
  ImageDecodeError,
  MissingRecordError,
  errorMessage,
} from './errors';

it('エラーごとの文言', () => {
  expect(errorMessage(new FolderNotWritableError())).toBe('このフォルダには保存できません。');
  expect(errorMessage(new ImageDecodeError())).toBe('この形式の画像は読み込めません');
  expect(errorMessage(new FileNotFoundError())).toBe('画像が見つかりません');
  expect(errorMessage(new MissingRecordError())).toBe('この記録は他の端末で削除されたようです。');
  expect(errorMessage(new AuthRequiredError())).toBe('Google のログインが切れました。');
  expect(errorMessage(new DriveApiError(500, null))).toBe('Google ドライブでエラーが発生しました（500）。');
  expect(errorMessage(new Error('x'))).toBe('予期しないエラーが発生しました。');
});

it('エラーの name はクラス名', () => {
  expect(new FolderNotWritableError().name).toBe('FolderNotWritableError');
  expect(new DriveApiError(403, 'x')).toMatchObject({ status: 403, reason: 'x' });
});
