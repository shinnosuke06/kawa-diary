import { useState } from 'react';
import { daysBetween, formatDate } from '../../domain/dates';
import { latestPhoto, oldestPhoto, photosByDate } from '../../domain/stats';
import type { DiaryData, Item, Photo } from '../../domain/types';
import { usePhotoUrl } from '../../state/useImageUrl';
import { IDENTITY, type Transform } from '../compare/alignTransform';
import { CompareSlider } from '../compare/CompareSlider';
import { Header } from '../components/Header';
import { Thumb } from '../components/Thumb';
import { NotFoundPage } from './NotFoundPage';

export function ComparePage(props: { data: DiaryData; itemId: string }) {
  const item = props.data.items.find((i) => i.id === props.itemId);
  if (!item) return <NotFoundPage message="この持ち物は見つかりません" />;
  const base = `/items/${encodeURIComponent(item.id)}`;
  if (item.photos.length < 2) {
    return (
      <main className="page">
        <Header title="比較" back={base} />
        <p>比較するには写真が2枚以上必要です</p>
      </main>
    );
  }
  return <Comparison item={item} back={base} />;
}

function Comparison(props: { item: Item; back: string }) {
  const photos = photosByDate(props.item);
  const [beforeId, setBeforeId] = useState(() => oldestPhoto(props.item)!.id);
  const [afterId, setAfterId] = useState(() => latestPhoto(props.item)!.id);
  const [mode, setMode] = useState<'slider' | 'align'>('slider');
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [divider, setDivider] = useState(50);

  const before = photos.find((p) => p.id === beforeId) ?? photos[0];
  const after = photos.find((p) => p.id === afterId) ?? photos[photos.length - 1];
  const beforeUrl = usePhotoUrl(before).url;
  const afterUrl = usePhotoUrl(after).url;

  const chooseAfter = (id: string) => {
    setAfterId(id);
    setTransform(IDENTITY);
  };

  return (
    <main className="page">
      <Header title="比較" back={props.back} />
      <p className="compare-dates">
        <span>前 {formatDate(before.takenAt)}</span>
        <span>後 {formatDate(after.takenAt)}</span>
        <strong>{Math.abs(daysBetween(before.takenAt, after.takenAt))}日経過</strong>
      </p>
      <CompareSlider
        beforeUrl={beforeUrl}
        afterUrl={afterUrl}
        aspectRatio={before.width / before.height}
        mode={mode}
        transform={transform}
        onTransformChange={setTransform}
        divider={divider}
        onDividerChange={setDivider}
      />
      <div className="actions">
        <button
          type="button"
          aria-pressed={mode === 'align'}
          onClick={() => setMode((m) => (m === 'align' ? 'slider' : 'align'))}
        >
          位置合わせ
        </button>
        <button type="button" onClick={() => setTransform(IDENTITY)}>
          位置をリセット
        </button>
      </div>
      <PhotoChoices label="前" photos={photos} selectedId={before.id} onSelect={setBeforeId} />
      <PhotoChoices label="後" photos={photos} selectedId={after.id} onSelect={chooseAfter} />
    </main>
  );
}

function PhotoChoices(props: { label: string; photos: Photo[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <section>
      <h2>{props.label}</h2>
      <div className="choices">
        {props.photos.map((p) => (
          <button
            key={p.id}
            type="button"
            className="choice"
            aria-pressed={p.id === props.selectedId}
            aria-label={`${props.label}: ${formatDate(p.takenAt)}`}
            onClick={() => props.onSelect(p.id)}
          >
            <Thumb fileId={p.thumbFileId} alt="" className="choice-thumb" />
            <span>{formatDate(p.takenAt)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
