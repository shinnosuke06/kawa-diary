import { FileNotFoundError } from '../../errors';
import { useImageUrl } from '../../state/useImageUrl';

// サムネイル。写真が無いときは色だけの枠
export function Thumb(props: { fileId: string | null; alt: string; className?: string }) {
  const { url, error } = useImageUrl(props.fileId, 'thumb');
  const className = `thumb ${props.className ?? ''}`;
  if (url) return <img className={className} src={url} alt={props.alt} />;
  return (
    <div className={`${className} thumb-empty`} aria-hidden={props.fileId === null}>
      {error instanceof FileNotFoundError && <span className="thumb-missing">画像が見つかりません</span>}
    </div>
  );
}
