import type { DiaryData } from '../../domain/types';
import { Header } from '../components/Header';
import { href } from '../router';
import { NotFoundPage } from './NotFoundPage';

export function ItemDetailPage(props: { data: DiaryData; itemId: string }) {
  const item = props.data.items.find((i) => i.id === props.itemId);
  if (!item) return <NotFoundPage message="この持ち物は見つかりません" />;
  return (
    <main className="page">
      <Header title={item.name} back="/" />
      {item.brand && <p>{item.brand}</p>}
      <div className="actions">
        <a className="button" href={href(`/items/${encodeURIComponent(item.id)}/edit`)}>
          編集
        </a>
      </div>
    </main>
  );
}
