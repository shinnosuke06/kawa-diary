import { errorMessage } from '../../errors';
import { useAppState, useController } from '../../state/AppContext';
import { useAsyncAction } from '../useAsyncAction';

export function SetupPage() {
  const controller = useController();
  const { loadError } = useAppState();
  const choose = useAsyncAction(() => controller.chooseFolder());
  return (
    <main className="page">
      <h1>保存先フォルダを選んでください</h1>
      <p>Google ドライブの「Kawa Diary」フォルダを選んでください。初回設定は PC で行うのがおすすめです。</p>
      <button type="button" className="primary" onClick={() => void choose.run()} disabled={choose.busy}>
        フォルダを選ぶ
      </button>
      {loadError !== null && (
        <p className="error" role="alert">
          {errorMessage(loadError)}
        </p>
      )}
    </main>
  );
}
