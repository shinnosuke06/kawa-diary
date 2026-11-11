import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { todayLocal } from '../../domain/dates';
import { errorMessage } from '../../errors';
import { preparePhoto, type PreparedPhoto } from '../../images/preparePhoto';

type PickerState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; previewUrl: string }
  | { status: 'error'; error: unknown };

// 写真を選んで縮小し、プレビューを出す
export function PhotoPicker(props: {
  label: string;
  onPrepared: (p: PreparedPhoto | null) => void;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [state, setState] = useState<PickerState>({ status: 'idle' });
  const latest = useRef(0);
  const previewUrl = state.status === 'ready' ? state.previewUrl : null;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ticket = ++latest.current;
    setState({ status: 'loading' });
    props.onPrepared(null);
    props.onLoadingChange?.(true);
    try {
      const prepared = await preparePhoto(file, todayLocal());
      if (ticket !== latest.current) return;
      setState({ status: 'ready', previewUrl: URL.createObjectURL(prepared.thumb) });
      props.onPrepared(prepared);
    } catch (error) {
      if (ticket !== latest.current) return;
      setState({ status: 'error', error });
      props.onPrepared(null);
    } finally {
      if (ticket === latest.current) props.onLoadingChange?.(false);
    }
  };

  return (
    <div className="picker">
      <label>
        {props.label}
        <input type="file" accept="image/*" onChange={(e) => void onChange(e)} />
      </label>
      {state.status === 'loading' && <p>読み込み中…</p>}
      {state.status === 'ready' && (
        <div className="picker-preview">
          <img src={state.previewUrl} alt="選んだ写真" />
        </div>
      )}
      {state.status === 'error' && (
        <p className="error" role="alert">
          {errorMessage(state.error)}
        </p>
      )}
    </div>
  );
}
