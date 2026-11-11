import { useState, type FormEvent } from 'react';
import type { DiaryData, Item, Photo, PhotoMeta } from '../../domain/types';
import { MissingRecordError, errorMessage } from '../../errors';
import type { PreparedPhoto } from '../../images/preparePhoto';
import { useController } from '../../state/AppContext';
import { Header } from '../components/Header';
import { PhotoPicker } from '../components/PhotoPicker';
import { PhotoView } from '../components/PhotoView';
import { SaveError } from '../components/SaveError';
import { navigate } from '../router';
import { useAsyncAction } from '../useAsyncAction';
import { NotFoundPage } from './NotFoundPage';

export function PhotoFormPage(props: { data: DiaryData; itemId: string; photoId?: string }) {
  const item = props.data.items.find((i) => i.id === props.itemId);
  if (!item) return <NotFoundPage message="この持ち物は見つかりません" />;
  if (!props.photoId) return <NewPhotoForm item={item} />;
  const photo = item.photos.find((p) => p.id === props.photoId);
  if (!photo) return <NotFoundPage message={errorMessage(new MissingRecordError())} />;
  return <EditPhotoForm key={photo.id} item={item} photo={photo} />;
}

const itemPath = (item: Item) => `/items/${encodeURIComponent(item.id)}`;

function NewPhotoForm(props: { item: Item }) {
  const controller = useController();
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [takenAt, setTakenAt] = useState('');
  const [memo, setMemo] = useState('');
  const save = useAsyncAction(async (p: PreparedPhoto, meta: PhotoMeta) => {
    await controller.addPhoto(props.item.id, p, meta);
    navigate(itemPath(props.item), { replace: true });
  });

  const onPrepared = (p: PreparedPhoto | null) => {
    setPrepared(p);
    if (p) setTakenAt(p.takenAt);
  };
  const submit = () => {
    if (prepared && takenAt) void save.run(prepared, { takenAt, memo });
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <main className="page">
      <Header title="写真を追加" back={itemPath(props.item)} />
      <form onSubmit={onSubmit}>
        <PhotoPicker label="写真を選ぶ" onPrepared={onPrepared} />
        <label>
          撮影日
          <input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
        </label>
        <label>
          メモ
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        <SaveError error={save.error} onRetry={submit} />
        <div className="actions">
          <button type="submit" className="primary" disabled={!prepared || !takenAt || save.busy}>
            保存
          </button>
        </div>
      </form>
    </main>
  );
}

function EditPhotoForm(props: { item: Item; photo: Photo }) {
  const controller = useController();
  const [takenAt, setTakenAt] = useState(props.photo.takenAt);
  const [memo, setMemo] = useState(props.photo.memo);
  const save = useAsyncAction(async (meta: PhotoMeta) => {
    await controller.updatePhoto(props.item.id, props.photo.id, meta);
    navigate(itemPath(props.item), { replace: true });
  });
  const remove = useAsyncAction(async () => {
    await controller.deletePhoto(props.item.id, props.photo.id);
    navigate(itemPath(props.item), { replace: true });
  });

  const submit = () => {
    if (takenAt) void save.run({ takenAt, memo });
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };
  const onDelete = () => {
    if (window.confirm('この写真を削除しますか？')) void remove.run();
  };

  return (
    <main className="page">
      <Header title="写真を編集" back={itemPath(props.item)} />
      <PhotoView photo={props.photo} alt={props.item.name} />
      <form onSubmit={onSubmit}>
        <label>
          撮影日
          <input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
        </label>
        <label>
          メモ
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        <SaveError error={save.error} onRetry={submit} />
        <SaveError error={remove.error} onRetry={() => void remove.run()} />
        <div className="actions">
          <button type="submit" className="primary" disabled={!takenAt || save.busy}>
            保存
          </button>
          <button type="button" className="danger" onClick={onDelete} disabled={remove.busy}>
            削除
          </button>
        </div>
      </form>
    </main>
  );
}
