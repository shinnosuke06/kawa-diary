import { useState, type FormEvent } from 'react';
import { parsePrice } from '../../domain/format';
import { CATEGORIES, CATEGORY_LABELS, type Category, type Item, type ItemInput } from '../../domain/types';
import { useAppState, useController } from '../../state/AppContext';
import { Header } from '../components/Header';
import { SaveError } from '../components/SaveError';
import { navigate } from '../router';
import { useAsyncAction } from '../useAsyncAction';
import { NotFoundPage } from './NotFoundPage';

export function ItemFormPage(props: { itemId?: string }) {
  const { data } = useAppState();
  const item = props.itemId ? data?.items.find((i) => i.id === props.itemId) : undefined;
  if (props.itemId && !item) return <NotFoundPage message="この持ち物は見つかりません" />;
  return <ItemForm key={props.itemId ?? 'new'} item={item} />;
}

function ItemForm(props: { item?: Item }) {
  const controller = useController();
  const { item } = props;
  const [name, setName] = useState(item?.name ?? '');
  const [brand, setBrand] = useState(item?.brand ?? '');
  const [category, setCategory] = useState<Category>(item?.category ?? 'other');
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate ?? '');
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : '');
  const [memo, setMemo] = useState(item?.memo ?? '');
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});

  const save = useAsyncAction(async (input: ItemInput) => {
    const id = await controller.saveItem(input, item?.id);
    navigate(`/items/${encodeURIComponent(id)}`, { replace: true });
  });
  const remove = useAsyncAction(async (id: string) => {
    await controller.deleteItem(id);
    navigate('/', { replace: true });
  });

  const submit = () => {
    const parsedPrice = parsePrice(price);
    const next: typeof errors = {};
    if (name.trim() === '') next.name = '製品名を入力してください';
    if (parsedPrice === 'invalid') next.price = '金額は0以上の整数で入力してください';
    setErrors(next);
    if (next.name || next.price || parsedPrice === 'invalid') return;
    void save.run({ name, brand, category, purchaseDate: purchaseDate || null, price: parsedPrice, memo });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const onDelete = () => {
    if (!item) return;
    if (window.confirm(`「${item.name}」を削除しますか？写真もドライブのゴミ箱に移動します。`)) void remove.run(item.id);
  };

  return (
    <main className="page">
      <Header title={item ? '持ち物を編集' : '持ち物を登録'} back={item ? `/items/${encodeURIComponent(item.id)}` : '/'} />
      <form onSubmit={onSubmit} noValidate>
        <label>
          製品名
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label>
          ブランド
          <input value={brand} onChange={(e) => setBrand(e.target.value)} autoComplete="off" />
        </label>
        <label>
          カテゴリ
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          購入日
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </label>
        <label>
          金額（円）
          <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} autoComplete="off" />
          {errors.price && <span className="field-error">{errors.price}</span>}
        </label>
        <label>
          メモ
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        <SaveError error={save.error} onRetry={submit} />
        <SaveError error={remove.error} onRetry={() => item && void remove.run(item.id)} />
        <div className="actions">
          <button type="submit" className="primary" disabled={save.busy}>
            保存
          </button>
          {item && (
            <button type="button" className="danger" onClick={onDelete} disabled={remove.busy}>
              削除
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
