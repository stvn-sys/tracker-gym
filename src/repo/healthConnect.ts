/**
 * Android Health Connect sync (react-native-health-connect). Reads steps, sleep,
 * heart data, SpO2, breathing rate, VO2 max, skin temperature, weight and body fat
 * written there by Samsung Health, Google Fit, watches, etc.
 *
 * The native module only exists in the installed Android app, so it is loaded
 * lazily: nothing here runs in the browser preview.
 */
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { MetricType } from '../data/metrics';
import { dailyAverage, dailyLatest, lastDays, sleepMinutesByDay } from '../domain/healthAgg';
import { logBodyweight } from './bodyweight';
import { logMetric } from './health';

type HC = typeof import('react-native-health-connect');
// Loaded on first use: the native module only exists in the Android app.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hc = (): HC => require('react-native-health-connect') as HC;

export type HcStatus = 'unsupported' | 'not-installed' | 'update-required' | 'available';

/** What we read, in the order shown in Settings. */
export const HC_TYPES = [
  { record: 'Steps', label: 'Steps' },
  { record: 'SleepSession', label: 'Sleep duration' },
  { record: 'RestingHeartRate', label: 'Resting heart rate' },
  { record: 'HeartRateVariabilityRmssd', label: 'Heart rate variability' },
  { record: 'OxygenSaturation', label: 'Blood oxygen (SpO₂)' },
  { record: 'RespiratoryRate', label: 'Breathing rate' },
  { record: 'Vo2Max', label: 'VO₂ max' },
  { record: 'SkinTemperature', label: 'Skin temperature variation' },
  { record: 'Weight', label: 'Weight' },
  { record: 'BodyFat', label: 'Body fat' },
] as const;
type HcRecord = (typeof HC_TYPES)[number]['record'];

export async function healthConnectStatus(): Promise<HcStatus> {
  if (Platform.OS !== 'android') return 'unsupported';
  try {
    const s = await hc().getSdkStatus();
    const { SdkAvailabilityStatus } = hc();
    if (s === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (s === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update-required';
    return 'not-installed';
  } catch {
    return 'unsupported';
  }
}

/** Asks for read access to everything in HC_TYPES. Returns the record types granted. */
export async function connectHealthConnect(): Promise<HcRecord[]> {
  const api = hc();
  await api.initialize();
  const granted = await api.requestPermission(HC_TYPES.map((t) => ({ accessType: 'read' as const, recordType: t.record })));
  return grantedRecords(granted);
}

function grantedRecords(list: unknown[]): HcRecord[] {
  const names = new Set(list.map((p) => (p as { recordType?: string; accessType?: string }))
    .filter((p) => p.accessType === 'read').map((p) => p.recordType));
  return HC_TYPES.map((t) => t.record).filter((r) => names.has(r));
}

export async function grantedHealthTypes(): Promise<HcRecord[]> {
  const api = hc();
  await api.initialize();
  return grantedRecords(await api.getGrantedPermissions());
}

export const openHealthConnectSettings = () => { try { hc().openHealthConnectSettings(); } catch { /* not available */ } };

/** All records of a type in a time range (follows page tokens). */
async function readAll(type: HcRecord, start: string, end: string): Promise<Record<string, unknown>[]> {
  const api = hc();
  const out: Record<string, unknown>[] = [];
  let pageToken: string | undefined;
  do {
    const res = await api.readRecords(type, { timeRangeFilter: { operator: 'between', startTime: start, endTime: end }, pageSize: 1000, pageToken });
    out.push(...(res.records as unknown as Record<string, unknown>[]));
    pageToken = res.pageToken || undefined;
  } while (pageToken);
  return out;
}

const instant = (r: Record<string, unknown>) => String(r.time ?? r.endTime);

/**
 * Pulls the last `days` days from Health Connect and stores one value per day.
 * Health Connect values replace manual entries for the same day. Returns how
 * many day-values were written per type.
 */
export async function syncHealthConnect(db: SQLiteDatabase, days = 30): Promise<Record<string, number>> {
  const api = hc();
  await api.initialize();
  const granted = new Set(await grantedHealthTypes());
  const range = lastDays(days);
  const start = range[0].start;
  const end = range[range.length - 1].end;
  const written: Record<string, number> = {};
  const save = async (type: MetricType, values: Map<string, number>) => {
    for (const [date, v] of values) await logMetric(db, type, date, v);
    written[type] = values.size;
  };

  if (granted.has('Steps')) {
    // Aggregates remove double counting when phone and watch both record steps.
    const steps = new Map<string, number>();
    for (const d of range) {
      const r = await api.aggregateRecord({ recordType: 'Steps', timeRangeFilter: { operator: 'between', startTime: d.start, endTime: d.end } });
      const n = (r as { COUNT_TOTAL?: number }).COUNT_TOTAL ?? 0;
      if (n > 0) steps.set(d.date, n);
    }
    await save('steps', steps);
  }
  if (granted.has('SleepSession')) {
    const s = await readAll('SleepSession', start, end);
    await save('sleep_min', sleepMinutesByDay(s as never));
  }
  const avg = async (rec: HcRecord, type: MetricType, value: (r: Record<string, unknown>) => number) => {
    if (!granted.has(rec)) return;
    const rows = await readAll(rec, start, end);
    await save(type, dailyAverage(rows.map((r) => ({ time: instant(r), value: value(r) }))));
  };
  await avg('RestingHeartRate', 'rhr', (r) => Number(r.beatsPerMinute));
  await avg('HeartRateVariabilityRmssd', 'hrv', (r) => Number(r.heartRateVariabilityMillis));
  await avg('OxygenSaturation', 'spo2', (r) => Number(r.percentage));
  await avg('RespiratoryRate', 'breathing_rate', (r) => Number(r.rate));
  await avg('SkinTemperature', 'skin_temp', (r) => {
    const deltas = (r.deltas as { delta: { inCelsius: number } }[] | undefined) ?? [];
    return deltas.length ? deltas.reduce((s, d) => s + d.delta.inCelsius, 0) / deltas.length : NaN;
  });

  const latest = async (rec: HcRecord, value: (r: Record<string, unknown>) => number) => {
    if (!granted.has(rec)) return new Map<string, number>();
    const rows = await readAll(rec, start, end);
    return dailyLatest(rows.map((r) => ({ time: instant(r), value: value(r) })).filter((p) => Number.isFinite(p.value)));
  };
  await save('vo2max', await latest('Vo2Max', (r) => Number(r.vo2MillilitersPerMinuteKilogram)));
  await save('body_fat', await latest('BodyFat', (r) => Number(r.percentage)));
  const weights = await latest('Weight', (r) => Number((r.weight as { inKilograms?: number })?.inKilograms));
  for (const [date, kg] of weights) await logBodyweight(db, Math.round(kg * 100) / 100, date);
  written.weight = weights.size;
  return written;
}
