import { AuthRequiredError, errorMessage } from '../../errors';
import { useController } from '../../state/AppContext';

// 保存に失敗したときの表示。入力内容は呼び出し側に残したまま再試行させる
export function SaveError(props: { error: unknown; onRetry: () => void }) {
  const controller = useController();
  if (!props.error) return null;
  const needsLogin = props.error instanceof AuthRequiredError;
  const retry = () => {
    // ログインのポップアップを出すため、タップ処理の中で直接 signIn を呼ぶ
    if (needsLogin) controller.signIn().then(props.onRetry, () => {});
    else props.onRetry();
  };
  return (
    <div className="save-error" role="alert">
      <p className="save-error-title">保存できませんでした。</p>
      <p>{errorMessage(props.error)}</p>
      <button type="button" onClick={retry}>
        {needsLogin ? 'Google で続けて再試行' : '再試行'}
      </button>
    </div>
  );
}
