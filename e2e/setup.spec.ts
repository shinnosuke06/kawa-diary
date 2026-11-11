import { expect, test } from '@playwright/test';
import { finishSetup } from './helpers';

test('初回はフォルダを選ぶとホームが表示される', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '保存先フォルダを選んでください' })).toBeVisible();
  await page.getByRole('button', { name: 'フォルダを選ぶ' }).click();
  await expect(page.getByRole('heading', { name: 'Kawa Diary' })).toBeVisible();
});

test('存在しないページ', async ({ page }) => {
  await finishSetup(page);
  await page.goto('./#/foo');
  await expect(page.getByText('ページが見つかりません')).toBeVisible();
});
