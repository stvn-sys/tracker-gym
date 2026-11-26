import { Text, View } from 'react-native';
import type { Routine } from '../../repo/routines';
import { colors } from '../../theme/colors';
import { useProfile } from '../ProfileContext';

/** Estimated minutes: ~40 s per set plus the default rest after each set. */
export function estimateMinutes(sets: number, restSeconds: number) {
  return Math.max(5, Math.round((sets * (40 + restSeconds)) / 60 / 5) * 5);
}

/** "6 exercises · 19 sets · ~55 min" as small chips. */
export function WorkoutChips({ w }: { w: Routine }) {
  const { profile } = useProfile();
  const sets = w.exercises.reduce((a, e) => a + e.targetSets, 0);
  const chips = [`${w.exercises.length} ${w.exercises.length === 1 ? 'exercise' : 'exercises'}`, `${sets} sets`, `~${estimateMinutes(sets, profile.restSeconds)} min`];
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
