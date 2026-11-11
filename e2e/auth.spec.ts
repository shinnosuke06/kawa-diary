import { expect, test } from '@playwright/test';
import { createItem, finishSetup, type FakeWindow } from './helpers';

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await finishSetup(page);
});

test('ログインが切れても入力が残り、「Google で続けて再試行」で保存できる', async ({ page }) => {
  await createItem(page, { name: '旧名' });
  await page.getByRole('link', { name: '編集' }).click();
  await page.evaluate(() => (window as unknown as FakeWindow).__kawaFake.auth.expire());
  await page.getByLabel('製品名').fill('新名');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('保存できませんでした。')).toBeVisible();
  await expect(page.getByLabel('製品名')).toHaveValue('新名');
  await expect(page.getByText('ログインの有効期限が切れました')).toBeVisible();
  await page.getByRole('button', { name: 'Google で続けて再試行' }).click();
  await expect(page.getByRole('heading', { name: '新名', exact: true })).toBeVisible();
  await expect(page.getByText('ログインの有効期限が切れました')).toHaveCount(0);
});

test('ログインに失敗したら、そのことを表示する', async ({ page }) => {
  await createItem(page, { name: 'ライダース' });
  await page.evaluate(() => {
    const fake = (window as unknown as FakeWindow).__kawaFake;
    fake.auth.expire();
    fake.auth.signInFails = true;
  });
  await page.getByRole('button', { name: '今日着た', exact: true }).click();
  await page.getByRole('button', { name: 'Google で続けて再試行' }).click();
  await expect(page.getByText('ログインできませんでした。もう一度お試しください。')).toBeVisible();
  await page.getByRole('status').getByRole('button', { name: 'Google で続ける' }).click();
  await expect(page.getByRole('status').getByText('ログインできませんでした。もう一度お試しください。')).toBeVisible();
});
