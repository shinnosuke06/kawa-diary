import { CATEGORIES, CATEGORY_LABELS, type Category } from '../../domain/types';

export function CategoryFilter(props: { value: Category | 'all'; onChange: (v: Category | 'all') => void }) {
  const options: { value: Category | 'all'; label: string }[] = [
    { value: 'all', label: 'すべて' },
    ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
  ];
  return (
    <div className="chips" role="group" aria-label="カテゴリ">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chip"
          aria-pressed={props.value === o.value}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
