// アプリで使うエラーと、画面に出す日本語メッセージ（設計書 5 章）
class AppError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthRequiredError extends AppError {}
export class NetworkError extends AppError {}
export class QuotaExceededError extends AppError {}
export class FileNotFoundError extends AppError {}
export class FolderNotWritableError extends AppError {}
export class DataFormatError extends AppError {}
export class MissingRecordError extends AppError {}
export class ImageDecodeError extends AppError {}

export class DriveApiError extends AppError {
  constructor(
    readonly status: number,
    readonly reason: string | null,
  ) {
    super(`Drive API error ${status}${reason ? ` (${reason})` : ''}`);
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof AuthRequiredError) return 'Google のログインが切れました。';
  if (e instanceof NetworkError) return '通信できませんでした。電波の良い場所で再試行してください。';
  if (e instanceof QuotaExceededError) return 'Google ドライブの容量が不足しています。';
  if (e instanceof FileNotFoundError) return '画像が見つかりません';
  if (e instanceof FolderNotWritableError) return 'このフォルダには保存できません。';
  if (e instanceof DataFormatError)
    return 'data.json の形式が正しくないため読み込めません。Google ドライブの「版を管理」から以前の版に戻してください。';
  if (e instanceof MissingRecordError) return 'この記録は他の端末で削除されたようです。';
  if (e instanceof ImageDecodeError) return 'この形式の画像は読み込めません';
  if (e instanceof DriveApiError) return `Google ドライブでエラーが発生しました（${e.status}）。`;
  return '予期しないエラーが発生しました。';
}
