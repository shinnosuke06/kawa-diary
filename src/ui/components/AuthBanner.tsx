import { useState } from 'react';
import { useController } from '../../state/AppContext';

export function AuthBanner() {
  const controller = useController();
  const [failed, setFailed] = useState(false);
  const signIn = () => {
    setFailed(false);
    // ポップアップを出すため、タップ処理の中で直接呼ぶ
    controller.signIn().catch(() => setFailed(true));
  };
  return (
    <div className="auth-banner" role="status">
      <span>ログインの有効期限が切れました</span>
      <button type="button" onClick={signIn}>
        Google で続ける
      </button>
      {failed && <span className="auth-banner-error">ログインできませんでした。もう一度お試しください。</span>}
    </div>
  );
}
