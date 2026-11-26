import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from '../repo/prefs';
import { applyTheme } from '../theme/colors';

interface Ctx { prefs: Prefs; setPrefs: (patch: Partial<Prefs>) => void }
const PrefsContext = createContext<Ctx>({ prefs: DEFAULT_PREFS, setPrefs: () => {} });

/** Loads preferences before rendering the app, so the chosen look applies from the first frame. */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [prefs, setState] = useState<Prefs | null>(null);

  useEffect(() => {
    loadPrefs(db).then((p) => { applyTheme(p.theme, p.accent); setState(p); });
  }, [db]);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setState((cur) => {
      const next = { ...(cur ?? DEFAULT_PREFS), ...patch };
      applyTheme(next.theme, next.accent);
      savePrefs(db, next);
      return next;
    });
  }, [db]);

  if (!prefs) return null;
  return <PrefsContext.Provider value={{ prefs, setPrefs }}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);
