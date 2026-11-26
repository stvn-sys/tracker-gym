import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { showAlert } from '../../components/Dialog';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { RIR_COLORS } from '../../components/NumPad';
import { useProfile } from '../../components/ProfileContext';
import { Button, Card, styles } from '../../components/ui';
import { formatWeight } from '../../domain/units';
import { bestE1rm, formatDuration, volumeKg } from '../../domain/workout';
import { discardWorkout, getWorkout, type WorkoutDetail } from '../../repo/workouts';
import { colors } from '../../theme/colors';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const unit = profile.unit;
  const [w, setW] = useState<WorkoutDetail | null>(null);

  useEffect(() => { getWorkout(db, id).then(setW); }, [db, id]);
  if (!w) return <View style={styles.screen} />;

  const allSets = w.exercises.flatMap((e) => e.sets);
  const date = new Date(w.startedAt);

  const remove = () =>
    showAlert('Delete this workout?', 'It is removed from history and rankings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await discardWorkout(db, w.id); router.back(); } },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]}>
      <Stack.Screen options={{ title: w.name }} />
      <Text style={styles.dim}>
        {date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat label="Duration" value={w.endedAt ? formatDuration(w.endedAt - w.startedAt) : 'In progress'} />
        <Stat label="Volume" value={formatWeight(volumeKg(allSets), unit)} />
        <Stat label="Sets" value={String(allSets.filter((s) => !s.isWarmup && s.completedAt).length)} />
      </View>

      {w.exercises.map((e) => {
        const e1rm = bestE1rm(e.sets);
        let n = 0;
        return (
          <Card key={e.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[styles.text, { fontWeight: '700', flex: 1 }]}>{e.exercise.name}</Text>
              {e1rm > 0 && <Text style={{ color: colors.accent }}>e1RM {formatWeight(e1rm, unit)}</Text>}
            </View>
            {e.note && <Text style={[styles.dim, { fontStyle: 'italic' }]}>📝 {e.note}</Text>}
            {e.sets.map((s) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ width: 22, color: s.isWarmup ? '#F5B400' : colors.textDim, fontWeight: '700' }}>{s.isWarmup ? 'W' : ++n}</Text>
                <Text style={styles.text}>{formatWeight(s.weightKg, unit)} × {s.reps ?? '–'}</Text>
                {s.rir != null && (
                  <Text style={{ color: RIR_COLORS[s.rir], fontSize: 12, fontWeight: '700' }}>RIR {s.rir === 5 ? '5+' : s.rir}</Text>
                )}
              </View>
            ))}
          </Card>
        );
      })}

      <View style={{ marginTop: 16 }}>
        <Button label="Delete workout" variant="danger" onPress={remove} />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <Text style={styles.dim}>{label}</Text>
      <Text style={[styles.text, { fontWeight: '800', fontSize: 17 }]}>{value}</Text>
    </Card>
  );
}
