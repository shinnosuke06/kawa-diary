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

// ホームの「＋」から持ち物を登録し、詳細ページが出るまで待つ
export async function createItem(
  page: Page,
  opts: { name: string; brand?: string; category?: string; price?: string; purchaseDate?: string },
): Promise<void> {
  await page.goto('./#/');
  await page.getByRole('link', { name: '持ち物を登録' }).click();
  await page.getByLabel('製品名').fill(opts.name);
  if (opts.brand !== undefined) await page.getByLabel('ブランド').fill(opts.brand);
  if (opts.category !== undefined) await page.getByLabel('カテゴリ').selectOption({ label: opts.category });
  if (opts.purchaseDate !== undefined) await page.getByLabel('購入日').fill(opts.purchaseDate);
  if (opts.price !== undefined) await page.getByLabel('金額（円）').fill(opts.price);
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('heading', { name: opts.name, exact: true })).toBeVisible();
}
