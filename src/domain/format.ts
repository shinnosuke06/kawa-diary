// 金額の入力を整数にする。全角数字・カンマ・円記号を受け付ける
export function parsePrice(text: string): number | null | 'invalid' {
  const normalized = text
    .trim()
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[¥￥,，]/g, '');
  if (normalized === '') return null;
  if (!/^\d+$/.test(normalized)) return 'invalid';
  return Number(normalized);
}

export function formatYen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`;
}
