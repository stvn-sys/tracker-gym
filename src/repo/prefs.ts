import type { SQLiteDatabase } from 'expo-sqlite';
import { EQUIPMENT, type Equipment } from '../data/equipment';
import type { Accent, ThemeName } from '../theme/colors';
import { getJSON, setJSON } from './kv';

/** App preferences (Settings). Stored as one JSON value under "prefs". */
export interface Prefs {
  name: string;
  // Workout
  autoRest: boolean;        // start the rest timer when a set is checked
  prefill: boolean;         // pre-fill weight/reps from the last session
  keepAwake: boolean;       // not used on web
  // Timer alerts
  vibrate: boolean;
  sound: boolean;
  warn10: boolean;          // extra buzz 10 s before rest ends
  // Plan & schedule
  schedule: 'weekdays' | 'rotation';
  weekStart: 0 | 1;         // 0 = Sunday, 1 = Monday
  // Units
  lengthUnit: 'cm' | 'in';
  // Equipment you have access to
  equipment: Equipment[];
  // Look
  theme: ThemeName;
  accent: Accent;
  // Reminders
  remindWorkout: { on: boolean; hour: number; minute: number };
  remindWeigh: { on: boolean; hour: number; minute: number };
  remindWater: { on: boolean; everyHours: number; from: number; to: number };
}

export const DEFAULT_PREFS: Prefs = {
  name: '',
  autoRest: true, prefill: true, keepAwake: true,
  vibrate: true, sound: false, warn10: false,
  schedule: 'weekdays', weekStart: 1,
  lengthUnit: 'cm',
  equipment: [...EQUIPMENT],
  theme: 'dark', accent: 'blue',
  remindWorkout: { on: false, hour: 17, minute: 30 },
  remindWeigh: { on: false, hour: 7, minute: 30 },
  remindWater: { on: false, everyHours: 2, from: 9, to: 21 },
};

export async function loadPrefs(db: SQLiteDatabase): Promise<Prefs> {
  return { ...DEFAULT_PREFS, ...(await getJSON<Partial<Prefs>>(db, 'prefs', {})) };
}

export const savePrefs = (db: SQLiteDatabase, p: Prefs) => setJSON(db, 'prefs', p);
