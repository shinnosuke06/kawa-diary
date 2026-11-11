import { expect, test, type Page } from '@playwright/test';
import { createItem, finishSetup, makeJpeg } from './helpers';

type FakeWindow = {
  __kawaFake: {
    repo: {
      files: Map<string, Blob>;
      peekData(): { items: { photos: Record<string, string>[]; care: { photoId: string | null }[] }[] };
    };
  };
};

async function photoFromPage(page: Page, which: 'fileId' | 'thumbFileId') {
  return page.evaluate(async (key) => {
    const repo = (window as unknown as FakeWindow).__kawaFake.repo;
    const blob = repo.files.get(repo.peekData().items[0].photos[0][key])!;
    const bmp = await createImageBitmap(blob);
    return { width: bmp.width, height: bmp.height, type: blob.type };
  }, which);
}

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await finishSetup(page);
});

test('写真を追加すると長辺 2048 / 480 の JPEG で保存され、記録に出る', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await page.getByRole('link', { name: '写真を追加' }).click();
  await expect(page.getByRole('heading', { name: '写真を追加' })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存' })).toBeDisabled();
  await page
    .getByLabel('写真を選ぶ')
    .setInputFiles({ name: 'a.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, 3000, 2000, '#663300') });
  await expect(page.getByLabel('撮影日')).not.toHaveValue('');
  await page.getByLabel('メモ').fill('初日');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('link', { name: /初日/ })).toBeVisible();
  expect(await photoFromPage(page, 'fileId')).toEqual({ width: 2048, height: 1365, type: 'image/jpeg' });
  expect(await photoFromPage(page, 'thumbFileId')).toEqual({ width: 480, height: 320, type: 'image/jpeg' });
});

test('写真のメモを編集し、削除できる', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await page.getByRole('link', { name: '写真を追加' }).click();
  await page
    .getByLabel('写真を選ぶ')
    .setInputFiles({ name: 'a.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, 800, 600, '#663300') });
  await expect(page.getByLabel('撮影日')).not.toHaveValue('');
  await page.getByLabel('メモ').fill('最初');
  await page.getByRole('button', { name: '保存' }).click();
  await page.getByRole('link', { name: /最初/ }).click();
  await expect(page.getByRole('heading', { name: '写真を編集' })).toBeVisible();
  await expect(page.getByLabel('メモ')).toHaveValue('最初');
  await page.getByLabel('撮影日').fill('2025-05-05');
  await page.getByLabel('メモ').fill('色が濃くなった');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('link', { name: /色が濃くなった/ })).toBeVisible();
  await expect(page.getByText('2025/05/05')).toBeVisible();
  await page.getByRole('link', { name: /色が濃くなった/ }).click();
  await page.getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('まだ記録がありません')).toBeVisible();
  const files = await page.evaluate(() => (window as unknown as FakeWindow).__kawaFake.repo.files.size);
  expect(files).toBe(0);
});

test('読み込めない画像はエラーを表示', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await page.getByRole('link', { name: '写真を追加' }).click();
  await page
    .getByLabel('写真を選ぶ')
    .setInputFiles({ name: 'x.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') });
  await expect(page.getByText('この形式の画像は読み込めません')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存' })).toBeDisabled();
});

test('写真付きの手入れは記録に1件だけ出て、写真としても数えられる', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await page.getByRole('link', { name: '手入れを記録' }).click();
  await expect(page.getByRole('heading', { name: '手入れを記録' })).toBeVisible();
  await page.getByLabel('種類').selectOption({ label: 'オイル・クリーム' });
  await page.getByLabel('メモ').fill('ミンクオイル');
  await page
    .getByLabel('写真（任意）')
    .setInputFiles({ name: 'b.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, 800, 600, '#331100') });
  await expect(page.locator('.picker-preview img')).toBeVisible();
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('link', { name: /ミンクオイル/ })).toBeVisible();
  await expect(page.getByText('オイル・クリーム')).toHaveCount(1);
  const counts = await page.evaluate(() => {
    const i = (window as unknown as FakeWindow).__kawaFake.repo.peekData().items[0];
    return [i.photos.length, i.care.length, i.care[0].photoId === i.photos[0].id];
  });
  expect(counts).toEqual([1, 1, true]);
});

test('手入れを編集・削除できる', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await page.getByRole('link', { name: '手入れを記録' }).click();
  await page.getByLabel('種類').selectOption({ label: 'ブラッシング' });
  await page.getByRole('button', { name: '保存' }).click();
  await page.getByRole('link', { name: /ブラッシング/ }).click();
  await expect(page.getByRole('heading', { name: '手入れを編集' })).toBeVisible();
  await page.getByLabel('種類').selectOption({ label: '防水' });
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('link', { name: /防水/ })).toBeVisible();
  await page.getByRole('link', { name: /防水/ }).click();
  await page.getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('まだ記録がありません')).toBeVisible();
});
