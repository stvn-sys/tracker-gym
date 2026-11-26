import { Text, View } from 'react-native';
import { MUSCLES, MUSCLE_LABEL, type Muscle } from '../../data/muscles';
import { mixHex, weeklyVolume } from '../../domain/volume';
import type { Routine } from '../../repo/routines';
import { colors } from '../../theme/colors';
import { BodyMap } from '../BodyMap';
import { styles } from '../ui';

const LOW = '#1F4E7A';
const HIGH = '#7CC4FF';

/** Color for a muscle by its share of the most-trained muscle's volume (null = not trained). */
export function heatColor(sets: number, max: number): string | null {
  if (sets <= 0 || max <= 0) return null;
  return mixHex(LOW, HIGH, 0.25 + 0.75 * (sets / max));
}

/** Body map with only this routine's trained muscles highlighted. */
export function RoutineBody({ workouts, height = 180, showLabels = false }: { workouts: Routine[]; height?: number; showLabels?: boolean }) {
  const vol = weeklyVolume(workouts);
  const max = Math.max(...Object.values(vol));
  return <BodyMap height={height} showLabels={showLabels} colorFor={(m) => heatColor(vol[m], max)} />;
}

/** Planned sets per week for each muscle, most trained first. */
export function VolumeList({ workouts }: { workouts: Routine[] }) {
  const vol = weeklyVolume(workouts);
  const max = Math.max(1, ...Object.values(vol));
  const rows = MUSCLES.map((m) => [m, vol[m]] as [Muscle, number]).sort((a, b) => b[1] - a[1]);
  return (
    <View style={{ gap: 8 }}>
      {rows.map(([m, sets]) => (
        <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[styles.text, { width: 104, fontSize: 14, color: sets ? colors.text : colors.textDim }]}>{MUSCLE_LABEL[m]}</Text>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
            <View style={{ width: `${(sets / max) * 100}%`, height: '100%', backgroundColor: heatColor(sets, max) ?? 'transparent' }} />
          </View>
          <Text style={{ width: 44, textAlign: 'right', color: sets ? colors.text : colors.textDim, fontVariant: ['tabular-nums'], fontWeight: '700' }}>
            {Math.round(sets * 10) / 10}
          </Text>
        </View>
      ))}
      <Text style={[styles.dim, { fontSize: 12 }]}>Working sets per week. A workout counts once per assigned day; secondary muscles count as half a set.</Text>
    </View>
  );
}
