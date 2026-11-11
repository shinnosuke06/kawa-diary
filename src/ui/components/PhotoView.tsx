import type { Photo } from '../../domain/types';
import { usePhotoUrl } from '../../state/useImageUrl';

// 写真を大きく表示する。枠の比率を先に確保してレイアウトのずれを防ぐ
export function PhotoView(props: { photo: Photo; alt: string }) {
  const { url, notFound } = usePhotoUrl(props.photo);
  return (
    <div className="photo-view" style={{ aspectRatio: `${props.photo.width} / ${props.photo.height}` }}>
      {url && <img src={url} alt={props.alt} />}
      {!url && notFound && <span className="thumb-missing">画像が見つかりません</span>}
    </div>
  );
}
