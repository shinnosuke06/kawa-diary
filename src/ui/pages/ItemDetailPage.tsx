import { formatDate, todayLocal } from '../../domain/dates';
import { formatYen } from '../../domain/format';
import { costPerWear, lastCareDate, latestPhoto, timeline, usagePeriod, wearCount } from '../../domain/stats';
import { CATEGORY_LABELS, type DiaryData } from '../../domain/types';
import { useController } from '../../state/AppContext';
import { Header } from '../components/Header';
import { PhotoView } from '../components/PhotoView';
import { SaveError } from '../components/SaveError';
import { Timeline } from '../components/Timeline';
import { href, navigate } from '../router';
import { useAsyncAction } from '../useAsyncAction';
import { NotFoundPage } from './NotFoundPage';

export function ItemDetailPage(props: { data: DiaryData; itemId: string }) {
  const controller = useController();
  const today = todayLocal();
  const wear = useAsyncAction((itemId: string) => controller.toggleWear(itemId, today));
  const item = props.data.items.find((i) => i.id === props.itemId);
  if (!item) return <NotFoundPage message="この持ち物は見つかりません" />;

  const base = `/items/${encodeURIComponent(item.id)}`;
  const photo = latestPhoto(item);
  const wornToday = item.wearDates.includes(today);
  const lastCare = lastCareDate(item);
  const period = usagePeriod(item, today);
  const perWear = costPerWear(item);

  return (
    <main className="page">
      <Header title={item.name} back="/" />
      {photo && <PhotoView photo={photo} alt={item.name} />}

      <dl className="info">
        {item.brand && (
          <div>
            <dt>ブランド</dt>
            <dd>{item.brand}</dd>
          </div>
        )}
        <div>
          <dt>カテゴリ</dt>
          <dd>{CATEGORY_LABELS[item.category]}</dd>
        </div>
        {item.purchaseDate && (
          <div>
            <dt>購入日</dt>
            <dd>{formatDate(item.purchaseDate)}</dd>
          </div>
        )}
        {item.price !== null && (
          <div>
            <dt>金額</dt>
            <dd>{formatYen(item.price)}</dd>
          </div>
        )}
      </dl>
      {item.memo && <p className="memo">{item.memo}</p>}

      <dl className="stats">
        <div>
          <dt>着用回数</dt>
          <dd>
            <a href={href(`${base}/wears`)}>{wearCount(item)}回</a>
          </dd>
        </div>
        {lastCare && (
          <div>
            <dt>最後の手入れ</dt>
            <dd>{formatDate(lastCare)}</dd>
          </div>
        )}
        {period && (
          <div>
            <dt>使用期間</dt>
            <dd>{period}</dd>
          </div>
        )}
        {perWear !== null && (
          <div>
            <dt>1回あたり</dt>
            <dd>{formatYen(perWear)}</dd>
          </div>
        )}
      </dl>

      <div className="actions">
        <button
          type="button"
          className="wear-button"
          aria-pressed={wornToday}
          disabled={wear.busy}
          onClick={() => void wear.run(item.id)}
        >
          {wornToday ? '今日着た ✓' : '今日着た'}
        </button>
        <a className="button" href={href(`${base}/photos/new`)}>
          写真を追加
        </a>
        <a className="button" href={href(`${base}/care/new`)}>
          手入れを記録
        </a>
        <button type="button" disabled={item.photos.length < 2} onClick={() => navigate(`${base}/compare`)}>
          比較する
        </button>
        <a className="button" href={href(`${base}/edit`)}>
          編集
        </a>
      </div>
      <SaveError error={wear.error} onRetry={() => void wear.run(item.id)} />

      <h2>記録</h2>
      <Timeline itemId={item.id} entries={timeline(item)} />
    </main>
  );
}
