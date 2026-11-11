import { expect, test } from '@playwright/test';
import { createItem, finishSetup, makeJpeg, type FakeWindow } from './helpers';

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await finishSetup(page);
});

test('登録するとホームに出る', async ({ page }) => {
  await createItem(page, { name: '501XX', brand: "Levi's", category: 'ジーンズ' });
  await page.goto('./#/');
  const card = page.getByRole('link', { name: /501XX/ });
  await expect(card).toContainText("Levi's");
  await expect(card).toContainText('着用 0回');
});

test('カテゴリで絞り込める', async ({ page }) => {
  await createItem(page, { name: '501XX', category: 'ジーンズ' });
  await createItem(page, { name: 'エンジニア', category: '靴' });
  await page.goto('./#/');
  await page.getByRole('button', { name: '靴' }).click();
  await expect(page.getByRole('button', { name: '靴' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: /エンジニア/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /501XX/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'すべて' }).click();
  await expect(page.getByRole('link', { name: /501XX/ })).toBeVisible();
});

test('入力エラー', async ({ page }) => {
  await page.goto('./#/items/new');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('製品名を入力してください')).toBeVisible();
  await page.getByLabel('製品名').fill('a');
  await page.getByLabel('金額（円）').fill('abc');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('金額は0以上の整数で入力してください')).toBeVisible();
  await expect(page.getByLabel('製品名')).toHaveValue('a');
});

test('全角の金額も保存できる', async ({ page }) => {
  await createItem(page, { name: 'ライダース', price: '￥１２，０００' });
  const price = await page.evaluate(
    () => (window as unknown as { __kawaFake: { repo: { peekData(): { items: { price: number }[] } } } }).__kawaFake.repo.peekData().items[0].price,
  );
  expect(price).toBe(12000);
});

test('編集と削除', async ({ page }) => {
  await createItem(page, { name: '旧名' });
  await page.getByRole('link', { name: '編集' }).click();
  await expect(page.getByRole('heading', { name: '持ち物を編集' })).toBeVisible();
  await expect(page.getByLabel('製品名')).toHaveValue('旧名');
  await page.getByLabel('製品名').fill('新名');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('heading', { name: '新名', exact: true })).toBeVisible();
  await page.goto('./#/');
  await expect(page.getByRole('link', { name: /新名/ })).toBeVisible();
  await page.getByRole('link', { name: /新名/ }).click();
  await page.getByRole('link', { name: '編集' }).click();
  await page.getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('まだ持ち物がありません。「＋」から登録しましょう。')).toBeVisible();
});

test('写真のある持ち物を削除すると、ゴミ箱への移動を待たずにホームへ戻る', async ({ page }) => {
  await createItem(page, { name: '旧名' });
  await page.getByRole('link', { name: '写真を追加' }).click();
  await page
    .getByLabel('写真を選ぶ')
    .setInputFiles({ name: 'a.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, 800, 600, '#663300') });
  await expect(page.getByLabel('撮影日')).not.toHaveValue('');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('heading', { name: '旧名', exact: true })).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as FakeWindow).__kawaFake.repo.trashFiles = () => new Promise((r) => setTimeout(r, 4000));
  });
  await page.getByRole('link', { name: '編集' }).click();
  await page.getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('まだ持ち物がありません。「＋」から登録しましょう。')).toBeVisible({ timeout: 1500 });
  await expect(page.getByText('この持ち物は見つかりません')).toHaveCount(0);
});
