import { expect, test, type Page } from '@playwright/test';
import { createItem, finishSetup, makeJpeg } from './helpers';

async function addPhoto(page: Page, date: string, color: string) {
  await page.getByRole('link', { name: '写真を追加' }).click();
  await page
    .getByLabel('写真を選ぶ')
    .setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, 1200, 900, color) });
  await expect(page.getByLabel('撮影日')).not.toHaveValue('');
  await page.getByLabel('撮影日').fill(date);
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText(date.replaceAll('-', '/'))).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await finishSetup(page);
});

test('最古と最新を重ねて比較し、境界線と位置合わせを操作できる', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await addPhoto(page, '2025-01-10', '#aa7744');
  await addPhoto(page, '2026-11-11', '#442211');
  await page.getByRole('button', { name: '比較する' }).click();
  await expect(page.getByRole('heading', { name: '比較' })).toBeVisible();
  await expect(page.getByText('670日経過')).toBeVisible();
  await expect(page.getByRole('button', { name: '前: 2025/01/10' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '後: 2026/11/11' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('after-image')).toBeVisible();

  const slider = page.getByRole('slider', { name: '境界線' });
  await expect(slider).toHaveAttribute('aria-valuenow', '50');
  const box = (await page.getByTestId('compare-frame').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
  await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuenow', '25');

  await page.getByRole('button', { name: '位置合わせ' }).click();
  await expect(page.getByRole('button', { name: '位置合わせ' })).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2);
  await page.mouse.up();
  await expect(page.getByTestId('after-image')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 30, 0)');
  await expect(slider).toHaveAttribute('aria-valuenow', '25'); // 位置合わせ中は境界線が動かない
  await page.getByRole('button', { name: '位置をリセット' }).click();
  await expect(page.getByTestId('after-image')).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, 0\)|none/);
});

test('前の写真を選び直せる', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await addPhoto(page, '2025-01-10', '#aa7744');
  await addPhoto(page, '2025-06-01', '#886633');
  await addPhoto(page, '2026-11-11', '#442211');
  await page.getByRole('button', { name: '比較する' }).click();
  await page.getByRole('button', { name: '前: 2025/06/01' }).click();
  await expect(page.getByRole('button', { name: '前: 2025/06/01' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '前: 2025/01/10' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('528日経過')).toBeVisible();
});
