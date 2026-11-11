import { useState, type FormEvent } from 'react';
import { formatDate, todayLocal } from '../../domain/dates';
import type { DiaryData } from '../../domain/types';
import { useController } from '../../state/AppContext';
import { Header } from '../components/Header';
import { SaveError } from '../components/SaveError';
import { useAsyncAction } from '../useAsyncAction';
import { NotFoundPage } from './NotFoundPage';

export function WearsPage(props: { data: DiaryData; itemId: string }) {
  const controller = useController();
  const [date, setDate] = useState(todayLocal());
  const [removing, setRemoving] = useState<string | null>(null);
  const add = useAsyncAction((itemId: string, d: string) => controller.addWear(itemId, d));
  const remove = useAsyncAction((itemId: string, d: string) => controller.removeWear(itemId, d));
  const item = props.data.items.find((i) => i.id === props.itemId);
  if (!item) return <NotFoundPage message="この持ち物は見つかりません" />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (date) void add.run(item.id, date);
  };
  const dates = item.wearDates.slice().reverse();

  return (
    <main className="page">
      <Header title="着用履歴" back={`/items/${encodeURIComponent(item.id)}`} />
      <p className="lead">着用 {item.wearDates.length}回</p>
      <form className="inline-form" onSubmit={onSubmit}>
        <label>
          着た日
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button type="submit" className="primary" disabled={add.busy || !date}>
          追加
        </button>
      </form>
      <SaveError error={add.error} onRetry={() => void add.run(item.id, date)} />
      <SaveError error={remove.error} onRetry={() => removing && void remove.run(item.id, removing)} />
      {dates.length === 0 ? (
        <p className="empty">まだ着用の記録がありません</p>
      ) : (
        <ul className="wear-list">
          {dates.map((d) => (
            <li key={d}>
              <span>{formatDate(d)}</span>
              <button
                type="button"
                className="danger"
                aria-label={`${formatDate(d)} を削除`}
                disabled={remove.busy}
                onClick={() => {
                  setRemoving(d);
                  void remove.run(item.id, d);
                }}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
