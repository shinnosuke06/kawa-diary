import { useState } from 'react';
import { todayLocal } from '../../domain/dates';
import { itemsForHome, latestPhoto, usagePeriod, wearCount } from '../../domain/stats';
import type { Category, DiaryData } from '../../domain/types';
import { CategoryFilter } from '../components/CategoryFilter';
import { Header } from '../components/Header';
import { Thumb } from '../components/Thumb';
import { href } from '../router';

export function HomePage(props: { data: DiaryData }) {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const today = todayLocal();
  const items = itemsForHome(props.data, filter);

  return (
    <main className="page wide">
      <Header title="Kawa Diary" />
      {props.data.items.length === 0 ? (
        <p className="empty">まだ持ち物がありません。「＋」から登録しましょう。</p>
      ) : (
        <>
          <CategoryFilter value={filter} onChange={setFilter} />
          {items.length === 0 && <p className="empty">このカテゴリの持ち物はありません</p>}
          <ul className="card-grid">
            {items.map((item) => {
              const period = usagePeriod(item, today);
              return (
                <li key={item.id}>
                  <a className="card" href={href(`/items/${encodeURIComponent(item.id)}`)}>
                    <Thumb fileId={latestPhoto(item)?.thumbFileId ?? null} alt="" className="card-thumb" />
                    <div className="card-body">
                      <p className="card-name">{item.name}</p>
                      {item.brand && <p className="card-brand">{item.brand}</p>}
                      <p className="card-meta">
                        {period && <span>{period}</span>}
                        <span>着用 {wearCount(item)}回</span>
                      </p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <a className="fab" href={href('/items/new')} aria-label="持ち物を登録">
        ＋
      </a>
    </main>
  );
}
