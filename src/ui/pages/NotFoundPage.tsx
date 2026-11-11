import { Header } from '../components/Header';
import { href } from '../router';

export function NotFoundPage(props: { message?: string }) {
  return (
    <main className="page">
      <Header title="Kawa Diary" back="/" />
      <p>{props.message ?? 'ページが見つかりません'}</p>
      <a href={href('/')}>ホームへ</a>
    </main>
  );
}
