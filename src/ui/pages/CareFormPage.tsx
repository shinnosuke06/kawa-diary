import { useState, type FormEvent } from 'react';
import { todayLocal } from '../../domain/dates';
import { CARE_LABELS, CARE_TYPES, type CareInput, type CareRecord, type CareType, type DiaryData, type Item } from '../../domain/types';
import { MissingRecordError, errorMessage } from '../../errors';
import type { PreparedPhoto } from '../../images/preparePhoto';
import { useController } from '../../state/AppContext';
import { Header } from '../components/Header';
import { PhotoPicker } from '../components/PhotoPicker';
import { SaveError } from '../components/SaveError';
import { Thumb } from '../components/Thumb';
import { navigate } from '../router';
import { useAsyncAction } from '../useAsyncAction';
import { NotFoundPage } from './NotFoundPage';

export function CareFormPage(props: { data: DiaryData; itemId: string; careId?: string }) {
  const item = props.data.items.find((i) => i.id === props.itemId);
  if (!item) return <NotFoundPage message="この持ち物は見つかりません" />;
  if (!props.careId) return <CareForm item={item} />;
  const care = item.care.find((c) => c.id === props.careId);
  if (!care) return <NotFoundPage message={errorMessage(new MissingRecordError())} />;
  return <CareForm key={care.id} item={item} care={care} />;
}

function CareForm(props: { item: Item; care?: CareRecord }) {
  const controller = useController();
  const { item, care } = props;
  const base = `/items/${encodeURIComponent(item.id)}`;
  const [date, setDate] = useState(care?.date ?? todayLocal());
  const [type, setType] = useState<CareType>(care?.type ?? 'oil');
  const [memo, setMemo] = useState(care?.memo ?? '');
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const linkedPhoto = care?.photoId ? item.photos.find((p) => p.id === care.photoId) : undefined;

  const save = useAsyncAction(async (input: CareInput, photo: PreparedPhoto | null) => {
    await controller.saveCare(item.id, input, photo, care?.id);
    navigate(base, { replace: true });
  });
  const remove = useAsyncAction(async (careId: string) => {
    await controller.deleteCare(item.id, careId);
    navigate(base, { replace: true });
  });

  const submit = () => {
    if (date) void save.run({ date, type, memo }, care ? null : prepared);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };
  const onDelete = () => {
    if (care && window.confirm('この手入れの記録を削除しますか？')) void remove.run(care.id);
  };

  return (
    <main className="page">
      <Header title={care ? '手入れを編集' : '手入れを記録'} back={base} />
      <form onSubmit={onSubmit}>
        <label>
          日付
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          種類
          <select value={type} onChange={(e) => setType(e.target.value as CareType)}>
            {CARE_TYPES.map((t) => (
              <option key={t} value={t}>
                {CARE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          メモ
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        {care ? (
          linkedPhoto && <Thumb fileId={linkedPhoto.thumbFileId} alt="手入れの写真" className="care-photo" />
        ) : (
          <PhotoPicker label="写真（任意）" onPrepared={setPrepared} onLoadingChange={setPhotoLoading} />
        )}
        <SaveError error={save.error} onRetry={submit} />
        <SaveError error={remove.error} onRetry={() => care && void remove.run(care.id)} />
        <div className="actions">
          <button type="submit" className="primary" disabled={!date || photoLoading || save.busy}>
            保存
          </button>
          {care && (
            <button type="button" className="danger" onClick={onDelete} disabled={remove.busy}>
              削除
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
