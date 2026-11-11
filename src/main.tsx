import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createIdbCache } from './cache/localCache';
import { DRIVE_SCOPE, GOOGLE_API_KEY, GOOGLE_APP_ID, GOOGLE_CLIENT_ID } from './config';
import { createGisAuth } from './drive/auth';
import { DriveApi } from './drive/driveApi';
import { pickFolder } from './drive/picker';
import { AppProvider } from './state/AppContext';
import { AppController, type ControllerDeps } from './state/controller';
import { createDriveRepository } from './storage/driveRepository';
import { App } from './ui/App';
import './ui/styles.css';

function createRealServices(): ControllerDeps {
  const auth = createGisAuth({ clientId: GOOGLE_CLIENT_ID, scope: DRIVE_SCOPE });
  const api = new DriveApi({ getToken: () => auth.getToken(), onUnauthorized: () => auth.clear() });
  return {
    repo: createDriveRepository(api),
    auth,
    pickFolder: () => pickFolder({ apiKey: GOOGLE_API_KEY, appId: GOOGLE_APP_ID, getToken: () => auth.getToken() }),
    cache: createIdbCache(),
  };
}

async function main() {
  let services: ControllerDeps;
  // この条件はビルド時に確定するため、本番ビルドにフェイクは含まれない
  if (import.meta.env.VITE_FAKE_DRIVE === '1') {
    const { createFakeServices } = await import('./dev/fakeServices');
    services = createFakeServices();
  } else {
    services = createRealServices();
  }
  const controller = new AppController(services);
  void controller.start();
  // ホーム画面のアプリや開いたままのタブに戻ったとき、日付と他の端末の変更を反映する
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void controller.resume();
  });
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProvider controller={controller}>
        <App />
      </AppProvider>
    </StrictMode>,
  );
}

void main();
