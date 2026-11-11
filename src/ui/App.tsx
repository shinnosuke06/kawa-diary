import { DataFormatError, errorMessage } from '../errors';
import { useAppState, useController } from '../state/AppContext';
import { AuthBanner } from './components/AuthBanner';
import type { DiaryData } from '../domain/types';
import { HomePage } from './pages/HomePage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { ItemFormPage } from './pages/ItemFormPage';
import { WearsPage } from './pages/WearsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SetupPage } from './pages/SetupPage';
import { WelcomePage } from './pages/WelcomePage';
import { useRoute, type Route } from './router';

function RoutePage(props: { route: Route; data: DiaryData }) {
  const { route, data } = props;
  switch (route.name) {
    case 'home':
      return <HomePage data={data} />;
    case 'itemNew':
      return <ItemFormPage />;
    case 'item':
      return <ItemDetailPage data={data} itemId={route.itemId} />;
    case 'itemEdit':
      return <ItemFormPage itemId={route.itemId} />;
    case 'wears':
      return <WearsPage data={data} itemId={route.itemId} />;
    default:
      return <NotFoundPage />;
  }
}

export function App() {
  const state = useAppState();
  const controller = useController();
  const route = useRoute();

  if (state.loadError instanceof DataFormatError) {
    return (
      <main className="page">
        <h1>Kawa Diary</h1>
        <p className="error" role="alert">
          {errorMessage(state.loadError)}
        </p>
      </main>
    );
  }
  if (!state.signedIn && !state.data) return <WelcomePage />;
  if (state.signedIn && state.setup === 'needsFolder') return <SetupPage />;
  if (!state.data) {
    return (
      <main className="page">
        <h1>Kawa Diary</h1>
        {state.loadError ? (
          <>
            <p className="error" role="alert">
              {errorMessage(state.loadError)}
            </p>
            <button type="button" onClick={() => void controller.refresh()}>
              再試行
            </button>
          </>
        ) : (
          <p>読み込み中…</p>
        )}
      </main>
    );
  }
  return (
    <>
      {!state.signedIn && <AuthBanner />}
      <RoutePage route={route} data={state.data} />
    </>
  );
}
