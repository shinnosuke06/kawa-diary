import { useController } from '../../state/AppContext';

export function AuthBanner() {
  const controller = useController();
  return (
    <div className="auth-banner" role="status">
      <span>ログインの有効期限が切れました</span>
      <button type="button" onClick={() => controller.signIn().catch(() => {})}>
        Google で続ける
      </button>
    </div>
  );
}
