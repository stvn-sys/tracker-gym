import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CommitInput } from '../../components/CommitInput';
import { showAlert } from '../../components/Dialog';
import { RoutineBody, VolumeList } from '../../components/fitness/RoutineMuscles';
import { Button, Card, inputStyle, SectionTitle, styles } from '../../components/ui';
import { DAYS, startOrResume } from '../../components/widgets/WodCard';
import { deleteGroup, getGroup, renameGroup, reorderRoutines, setActiveGroup, type RoutineGroup } from '../../repo/routines';
import { repsLabel } from '../../repo/routines';
import { colors } from '../../theme/colors';

export default function RoutineGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [g, setG] = useState<RoutineGroup | null>(null);

  const reload = useCallback(() => {
    getGroup(db, id).then(setG);
  }, [db, id]);
  useFocusEffect(reload);

  if (!g) return <View style={styles.screen} />;

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= g.workouts.length) return;
    const next = [...g.workouts];
    [next[i], next[j]] = [next[j], next[i]];
    setG({ ...g, workouts: next });
    await reorderRoutines(db, next.map((w) => w.id));
  };

  const remove = () => showAlert(`Delete ${g.name}?`, 'Its workouts are deleted too. Your workout history is kept.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGroup(db, g.id); router.back(); } },
  ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: g.name }} />
      <Text style={styles.dim}>Routine name (tap to rename)</Text>
      <CommitInput key={g.id} initial={g.name} placeholder="Routine name" placeholderTextColor={colors.textDim}
        onCommit={async (t) => { if (t.trim()) { await renameGroup(db, g.id, t); reload(); } }}
        style={[inputStyle, { fontSize: 20, fontWeight: '800' }]} />
      {g.isActive ? (
        <Text style={{ color: colors.success, fontWeight: '700' }}>● Active routine. Workout of the day comes from here.</Text>
      ) : (
        <Button label="Make this my active routine" variant="ghost" onPress={async () => { await setActiveGroup(db, g.id); reload(); }} />
      )}

      <Card>
        <RoutineBody workouts={g.workouts} height={300} showLabels />
      </Card>

      <SectionTitle>Workouts</SectionTitle>
      {g.workouts.map((w, i) => (
        <Card key={w.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.text, { fontWeight: '800', fontSize: 17 }]}>{w.name}</Text>
              <Text style={{ color: colors.accent, fontSize: 13 }}>{w.weekdays.map((d) => DAYS[d]).join(' + ') || 'No days assigned'}</Text>
            </View>
            <Small label="▲" disabled={i === 0} onPress={() => move(i, -1)} />
            <Small label="▼" disabled={i === g.workouts.length - 1} onPress={() => move(i, 1)} />
            <Small label="Edit" onPress={() => router.push({ pathname: '/routine/[id]', params: { id: w.id } })} />
          </View>
          {w.exercises.map((e, n) => (
            <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.text}><Text style={styles.dim}>{n + 1}. </Text>{e.exerciseName}</Text>
              <Text style={styles.dim}>{e.targetSets} × {repsLabel(e.targetReps, e.targetRepsMax)}</Text>
            </View>
          ))}
          <Pressable onPress={() => startOrResume(db, w.id)}
            style={{ marginTop: 4, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.accentDim }}>
            <Text style={{ color: colors.accent, fontWeight: '800' }}>Start {w.name}</Text>
          </Pressable>
        </Card>
      ))}
      <Button label="+ Add workout" variant="ghost" onPress={() => router.push({ pathname: '/routine/[id]', params: { id: 'new', group: g.id } })} />

      <SectionTitle>Volume per muscle</SectionTitle>
      <Card>
        <VolumeList workouts={g.workouts} />
      </Card>

      <View style={{ marginTop: 16 }}>
        <Button label="Delete routine" variant="danger" onPress={remove} />
      </View>
    </ScrollView>
  );
}

function Small({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6}
      style={{ minWidth: 34, height: 34, paddingHorizontal: 8, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
