/** Health metrics stored in the health_metrics table (one value per day). */
export const METRICS = {
  steps: { label: 'Steps', unit: 'steps', decimals: 0, min: 0, max: 100000 },
  sleep_min: { label: 'Sleep duration', unit: 'min', decimals: 0, min: 0, max: 1440 },
  sleep_score: { label: 'Sleep score', unit: '/100', decimals: 0, min: 0, max: 100 },
  vo2max: { label: 'VO₂ max', unit: 'ml/kg/min', decimals: 1, min: 10, max: 95 },
  breathing_rate: { label: 'Breathing rate', unit: 'br/min', decimals: 1, min: 4, max: 40 },
  spo2: { label: 'Blood oxygen (SpO₂)', unit: '%', decimals: 0, min: 70, max: 100 },
  rhr: { label: 'Resting heart rate', unit: 'bpm', decimals: 0, min: 25, max: 150 },
  hrv: { label: 'Heart rate variability', unit: 'ms', decimals: 0, min: 1, max: 300 },
  skin_temp: { label: 'Skin temp. variation', unit: '°C', decimals: 1, min: -5, max: 5 },
  // Body measurements
  body_fat: { label: 'Body fat', unit: '%', decimals: 1, min: 2, max: 70 },
  neck: { label: 'Neck', unit: 'cm', decimals: 1, min: 15, max: 80 },
  shoulders: { label: 'Shoulders', unit: 'cm', decimals: 1, min: 50, max: 200 },
  chest: { label: 'Chest', unit: 'cm', decimals: 1, min: 50, max: 200 },
  waist: { label: 'Waist', unit: 'cm', decimals: 1, min: 40, max: 200 },
  hips: { label: 'Hips', unit: 'cm', decimals: 1, min: 50, max: 200 },
  arm: { label: 'Upper arm', unit: 'cm', decimals: 1, min: 15, max: 70 },
  forearm: { label: 'Forearm', unit: 'cm', decimals: 1, min: 15, max: 60 },
  thigh: { label: 'Thigh', unit: 'cm', decimals: 1, min: 25, max: 100 },
  calf: { label: 'Calf', unit: 'cm', decimals: 1, min: 20, max: 70 },
} as const;

export type MetricType = keyof typeof METRICS;

export const VITALS: MetricType[] = ['vo2max', 'breathing_rate', 'spo2', 'rhr', 'hrv', 'skin_temp'];
export const MEASUREMENTS: MetricType[] = ['body_fat', 'neck', 'shoulders', 'chest', 'waist', 'hips', 'arm', 'forearm', 'thigh', 'calf'];

export function formatMetric(type: MetricType, value: number | null | undefined): string {
  if (value == null) return '–';
  if (type === 'sleep_min') return formatSleep(value);
  const m = METRICS[type];
  const v = value.toFixed(m.decimals);
  const signed = type === 'skin_temp' && value > 0 ? `+${v}` : v;
  return type === 'steps' ? Number(v).toLocaleString() : signed;
}

export const formatSleep = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;
