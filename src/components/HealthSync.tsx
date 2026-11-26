import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { syncHealthConnect } from '../repo/healthConnect';
import { runAutoMacros } from '../repo/autoMacros';
import { useDataVersion } from './DataVersion';
import { usePrefs } from './Prefs';

const EVERY_MS = 15 * 60 * 1000;

/** Syncs Health Connect when the app starts or comes back to the foreground (at most every 15 min). */
export function HealthSync() {
  const db = useSQLiteContext();
  const { prefs, setPrefs } = usePrefs();
  const { bump } = useDataVersion();
  const busy = useRef(false);
  const enabled = prefs.healthConnect.enabled;
  const lastSync = prefs.healthConnect.lastSync;

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) return;
    const run = async () => {
      if (busy.current || (lastSync && Date.now() - lastSync < EVERY_MS)) return;
      busy.current = true;
      try {
        await syncHealthConnect(db, 7);
        setPrefs({ healthConnect: { enabled: true, lastSync: Date.now() } });
        bump();
      } catch {
        // Permission revoked or Health Connect unavailable; Settings shows the status.
      } finally {
        busy.current = false;
      }
    };
    run();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });
    return () => sub.remove();
  }, [db, enabled, lastSync, setPrefs, bump]);

  return null;
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

/** Weekly update of calorie/macro targets from the weight trend (Settings › Nutrition & goals). */
export function AutoMacrosSync() {
  const db = useSQLiteContext();
  const { prefs, setPrefs } = usePrefs();
  const { bump } = useDataVersion();
  const a = prefs.autoMacros;
  useEffect(() => {
    if (!a.on || (a.lastRun && Date.now() - a.lastRun < WEEK_MS)) return;
    runAutoMacros(db, a.rateKgWeek).then((r) => {
      setPrefs({ autoMacros: { ...a, lastRun: Date.now(), tdee: r?.tdee ?? a.tdee, slopeKgWeek: r?.slopeKgPerWeek ?? a.slopeKgWeek } });
      if (r) bump();
    });
  }, [db, a, setPrefs, bump]);
  return null;
}
