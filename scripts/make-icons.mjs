// public/icon.svg から PWA 用の PNG アイコンを作る。使い方: node scripts/make-icons.mjs
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8');
const sizes = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
];
// iOS は角を自動で丸め、透明部分を黒く塗るため、Apple 用は四角いまま塗りつぶす
const fullBleed = (name) => name.startsWith('apple');

const browser = await chromium.launch();
try {
  for (const [name, size] of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const source = fullBleed(name) ? svg.replace('rx="112"', 'rx="0"') : svg;
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${source.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
    );
    await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname, omitBackground: true });
    await page.close();
    console.log(`wrote public/${name}`);
  }
} finally {
  await browser.close();
}
