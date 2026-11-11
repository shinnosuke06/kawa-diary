// 日付は 'YYYY-MM-DD'（端末ローカル）で扱う
const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayLocal(now: Date = new Date()): string {
  return toLocalDate(now);
}

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m, d];
}

export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = parts(from);
  const [ty, tm, td] = parts(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function formatUsagePeriod(from: string, to: string): string {
  const [fy, fm, fd] = parts(from);
  const [ty, tm, td] = parts(to);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  if (months < 1) return `${Math.max(0, daysBetween(from, to))}日`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest}ヶ月`;
  if (rest === 0) return `${years}年`;
  return `${years}年${rest}ヶ月`;
}

export function formatDate(d: string): string {
  return d.replaceAll('-', '/');
}
