import { Text, View } from 'react-native';
import type { Routine } from '../../repo/routines';
import { colors } from '../../theme/colors';
import { useProfile } from '../ProfileContext';

/** Estimated minutes: ~40 s per set plus the rest after it, ~1 min setup per exercise. */
export function estimateMinutes(sets: number, restSeconds: number, exercises = 0) {
  return Math.max(5, Math.round((sets * (40 + restSeconds) + exercises * 60) / 60 / 5) * 5);
}

/** Same estimate with each exercise's own rest time. */
export function estimateFromItems(items: { sets: number; rest: number }[]) {
  const sec = items.reduce((a, it) => a + it.sets * (40 + it.rest) + 60, 0);
  return Math.max(5, Math.round(sec / 300) * 5);
}

/** "6 exercises · 19 sets · ~55 min" as small chips. */
export function WorkoutChips({ w }: { w: Routine }) {
  const { profile } = useProfile();
  const sets = w.exercises.reduce((a, e) => a + e.targetSets, 0);
  const chips = [`${w.exercises.length} ${w.exercises.length === 1 ? 'exercise' : 'exercises'}`, `${sets} sets`, `~${estimateMinutes(sets, profile.restSeconds, w.exercises.length)} min`];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {chips.map((c) => (
        <View key={c} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.surfaceAlt }}>
          <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '600' }}>{c}</Text>
        </View>
      ))}
    </View>
  );
}
