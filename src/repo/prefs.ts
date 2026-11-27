import type { SQLiteDatabase } from 'expo-sqlite';
import { BAR_TYPES, BAR_WEIGHTS_KG, EQUIPMENT, type Equipment } from '../data/equipment';
import type { Accent, ThemeName } from '../theme/colors';
import { getJSON, setJSON } from './kv';

/** App preferences (Settings). Stored as one JSON value under "prefs". */
export interface Prefs {
  name: string;
  // First-launch questionnaire done
  onboarded: boolean;
  heightCm: number | null;
  activity: 'sedentary' | 'light' | 'moderate' | 'very';
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
  // Equipment you have access to (no longer shown in Settings)
  equipment: Equipment[];
  /** @deprecated old cable-only list; migrated into attachmentsByEq.cable */
  attachments?: string[];
  // Attachments per equipment type (Settings › Equipment). None = no attachment field.
  attachmentsByEq: Partial<Record<Equipment, string[]>>;
  // Bar types for the Bar equipment (editable)
  barTypes: string[];
  // Empty weight per bar type (kg), used as the starting weight
  barWeights: Record<string, number>;
  // Gym locations (editable in Settings); asked for when starting a workout
  gyms: string[];
  // Android Health Connect sync
  healthConnect: { enabled: boolean; lastSync: number | null };
  // Calorie/macro targets that follow the weight trend (weekly)
  autoMacros: { on: boolean; rateKgWeek: number; lastRun: number | null; tdee: number | null; slopeKgWeek: number | null };
  // Look
  theme: ThemeName;
  accent: Accent;
  // Reminders
  remindWorkout: { on: boolean; hour: number; minute: number };
  remindWeigh: { on: boolean; hour: number; minute: number };
  remindWater: { on: boolean; everyHours: number; from: number; to: number };
  remindMeals: Record<'breakfast' | 'lunch' | 'dinner', { on: boolean; hour: number; minute: number }>;
}

export const DEFAULT_PREFS: Prefs = {
  name: '',
  onboarded: false, heightCm: null, activity: 'moderate',
  autoRest: true, prefill: true, keepAwake: true,
  vibrate: true, sound: false, warn10: false,
  schedule: 'weekdays', weekStart: 1,
  lengthUnit: 'cm',
  equipment: [...EQUIPMENT],
  attachmentsByEq: {},
  barTypes: [...BAR_TYPES],
  barWeights: { ...BAR_WEIGHTS_KG },
  gyms: [],
  healthConnect: { enabled: false, lastSync: null },
  autoMacros: { on: false, rateKgWeek: 0, lastRun: null, tdee: null, slopeKgWeek: null },
  theme: 'dark', accent: 'blue',
  remindWorkout: { on: false, hour: 17, minute: 30 },
  remindWeigh: { on: false, hour: 7, minute: 30 },
  remindWater: { on: false, everyHours: 2, from: 9, to: 21 },
  remindMeals: {
    breakfast: { on: false, hour: 9, minute: 0 }, lunch: { on: false, hour: 13, minute: 0 }, dinner: { on: false, hour: 19, minute: 0 },
  },
};

export async function loadPrefs(db: SQLiteDatabase): Promise<Prefs> {
  const stored = await getJSON<Partial<Prefs>>(db, 'prefs', {});
  const p = { ...DEFAULT_PREFS, ...stored };
  if (!stored.attachmentsByEq && stored.attachments) p.attachmentsByEq = { cable: stored.attachments };
  delete p.attachments;
  return p;
}

export const savePrefs = (db: SQLiteDatabase, p: Prefs) => setJSON(db, 'prefs', p);
