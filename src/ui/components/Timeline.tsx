import { formatDate } from '../../domain/dates';
import type { TimelineEntry } from '../../domain/stats';
import { CARE_LABELS } from '../../domain/types';
import { href } from '../router';
import { Thumb } from './Thumb';

export function Timeline(props: { itemId: string; entries: TimelineEntry[] }) {
  if (props.entries.length === 0) return <p className="empty">まだ記録がありません</p>;
  const base = `/items/${encodeURIComponent(props.itemId)}`;
  return (
    <ol className="timeline">
      {props.entries.map((e) =>
        e.kind === 'photo' ? (
          <li key={`p-${e.photo.id}`}>
            <a className="timeline-entry" href={href(`${base}/photos/${encodeURIComponent(e.photo.id)}`)}>
              <Thumb fileId={e.photo.thumbFileId} alt="" className="timeline-thumb" />
              <div>
                <p className="timeline-date">{formatDate(e.date)}</p>
                {e.photo.memo && <p>{e.photo.memo}</p>}
              </div>
            </a>
          </li>
        ) : (
          <li key={`c-${e.care.id}`}>
            <a className="timeline-entry" href={href(`${base}/care/${encodeURIComponent(e.care.id)}`)}>
              {e.photo ? (
                <Thumb fileId={e.photo.thumbFileId} alt="" className="timeline-thumb" />
              ) : (
                <div className="timeline-thumb timeline-icon" aria-hidden="true">
                  ✦
                </div>
              )}
              <div>
                <p className="timeline-date">{formatDate(e.date)}</p>
                <p className="timeline-care">{CARE_LABELS[e.care.type]}</p>
                {e.care.memo && <p>{e.care.memo}</p>}
              </div>
            </a>
          </li>
        ),
      )}
    </ol>
  );
}
