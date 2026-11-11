import { expect, type Page } from '@playwright/test';

// 初回設定（フォルダ選択）を済ませてホームを表示する
export async function finishSetup(page: Page): Promise<void> {
  await page.goto('./');
  await page.getByRole('button', { name: 'フォルダを選ぶ' }).click();
  await expect(page.getByRole('heading', { name: 'Kawa Diary' })).toBeVisible();
}

// ページ内の canvas で単色の JPEG を作る
export async function makeJpeg(page: Page, width: number, height: number, color: string): Promise<Buffer> {
  const base64 = await page.evaluate(
    ({ width, height, color }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    },
    { width, height, color },
  );
  return Buffer.from(base64, 'base64');
}
