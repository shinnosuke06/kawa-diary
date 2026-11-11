import { expect, test } from '@playwright/test';
import { createItem, finishSetup } from './helpers';

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await finishSetup(page);
});

test('今日着たで回数と1回あたりが変わり、もう一度押すと取り消せる', async ({ page }) => {
  await createItem(page, { name: 'ライダース', price: '12000' });
  await expect(page.getByText('1回あたり')).toHaveCount(0);
  const wear = page.getByRole('button', { name: '今日着た', exact: true });
  await expect(wear).toHaveAttribute('aria-pressed', 'false');
  await wear.click();
  await expect(page.getByRole('button', { name: '今日着た ✓', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('1回あたり')).toBeVisible();
  await expect(page.getByText('¥12,000')).toHaveCount(2); // 金額 と 1回あたり
  await expect(page.getByRole('link', { name: '1回', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '今日着た ✓', exact: true }).click();
  await expect(page.getByRole('button', { name: '今日着た', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('1回あたり')).toHaveCount(0);
});

test('着用履歴で過去の日付を追加・削除できる', async ({ page }) => {
  await createItem(page, { name: 'ライダース' });
  await page.getByRole('link', { name: '0回', exact: true }).click();
  await expect(page.getByRole('heading', { name: '着用履歴' })).toBeVisible();
  await expect(page.getByText('まだ着用の記録がありません')).toBeVisible();
  await page.getByLabel('着た日').fill('2026-01-05');
  await page.getByRole('button', { name: '追加' }).click();
  await expect(page.getByText('着用 1回')).toBeVisible();
  await expect(page.getByText('2026/01/05')).toBeVisible();
  await page.getByRole('button', { name: '2026/01/05 を削除' }).click();
  await expect(page.getByText('まだ着用の記録がありません')).toBeVisible();
});

test('写真が無いと比較できない・記録は空', async ({ page }) => {
  await createItem(page, { name: 'ライダース', purchaseDate: '2024-08-11' });
  await expect(page.getByRole('button', { name: '比較する' })).toBeDisabled();
  await expect(page.getByText('まだ記録がありません')).toBeVisible();
  await expect(page.getByText('使用期間')).toBeVisible();
  await expect(page.getByText('2024/08/11')).toBeVisible();
});

test('存在しない持ち物', async ({ page }) => {
  await page.goto('./#/items/nope');
  await expect(page.getByText('この持ち物は見つかりません')).toBeVisible();
});
