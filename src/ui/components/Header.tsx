import { useAppState } from '../../state/AppContext';
import { href } from '../router';

export function Header(props: { title: string; back?: string }) {
  const { syncing } = useAppState();
  return (
    <header className="header">
      <div className="header-row">
        {props.back !== undefined && (
          <a className="back" href={href(props.back)}>
            ‹ 戻る
          </a>
        )}
        {syncing && <span className="syncing">同期中…</span>}
      </div>
      <h1>{props.title}</h1>
    </header>
  );
}
