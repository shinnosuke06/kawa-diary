import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { AppController, AppState } from './controller';

const ControllerContext = createContext<AppController | null>(null);

export function AppProvider(props: { controller: AppController; children: ReactNode }) {
  return <ControllerContext.Provider value={props.controller}>{props.children}</ControllerContext.Provider>;
}

export function useController(): AppController {
  const c = useContext(ControllerContext);
  if (!c) throw new Error('AppProvider is missing');
  return c;
}

export function useAppState(): AppState {
  const c = useController();
  return useSyncExternalStore(c.subscribe, c.getState);
}
