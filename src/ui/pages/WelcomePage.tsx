import { useController } from '../../state/AppContext';
import { useAsyncAction } from '../useAsyncAction';

export function WelcomePage() {
  const controller = useController();
  const signIn = useAsyncAction(() => controller.signIn());
  return (
    <main className="page welcome">
      <h1>Kawa Diary</h1>
      <p>革製品やジーンズなど、育てていく持ち物の記録帳です。写真と記録は Google ドライブに保存されます。</p>
      <button type="button" className="primary" onClick={() => void signIn.run()} disabled={signIn.busy}>
        Google で続ける
      </button>
      {signIn.error !== null && <p role="alert">ログインできませんでした。もう一度お試しください。</p>}
    </main>
  );
}
