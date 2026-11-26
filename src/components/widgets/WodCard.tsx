import { Pressable, Text, View } from 'react-native';
import { showAlert } from '../Dialog';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { activeWorkouts, routineForWeekday } from '../../repo/routines';
import { getActiveWorkout, startWorkout } from '../../repo/workouts';
import { colors } from '../../theme/colors';
import { styles } from '../ui';
import { useLoad, WidgetCard } from './common';

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const openWorkout = (id: string) => router.push({ pathname: '/workout/[id]', params: { id } });

/** Start a routine, or resume the workout in progress. */
export async function startOrResume(db: Parameters<typeof startWorkout>[0], routineId: string | null) {
  const active = await getActiveWorkout(db);
  if (active) {
    showAlert('Workout in progress', `Resume "${active.name}" first, or finish/discard it.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resume', onPress: () => openWorkout(active.id) },
    ]);
    return;
  }
  openWorkout(await startWorkout(db, routineId));
}

export function WodCard() {
  const db = useSQLiteContext();
  const today = new Date().getDay();
  const [data] = useLoad(async () => ({
    wod: routineForWeekday(await activeWorkouts(db), today),
    active: await getActiveWorkout(db),
  }), [db, today]);
  const wod = data?.wod;
  const active = data?.active;

  return (
    <WidgetCard title={`Workout of the day · ${DAYS[today]}`}>
      <Text style={[styles.text, { fontSize: 24, fontWeight: '800' }]}>{wod ? wod.name : 'Rest day'}</Text>
      <Text style={styles.dim} numberOfLines={3}>
        {wod ? wod.exercises.map((e) => e.exerciseName).join(' · ') : 'Nothing scheduled. You can still start an empty workout.'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {active ? (
          <Btn label={`Resume ${active.name}`} color={colors.success} onPress={() => openWorkout(active.id)} />
        ) : (
          <Btn label={wod ? 'Start workout' : 'Start empty workout'} color={colors.accent} onPress={() => startOrResume(db, wod?.id ?? null)} />
        )}
      </View>
    </WidgetCard>
  );
}

function Btn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: color, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
      <Text style={{ color: '#06121F', fontWeight: '800', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}
