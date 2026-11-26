import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { listRoutines, reorderRoutines, type Routine } from '../../repo/routines';
import { colors } from '../../theme/colors';
import { Card, styles } from '../ui';
import { DAYS, startOrResume, WodCard } from '../widgets/WodCard';

/** All routines with every exercise listed; start, edit, reorder. */
export function RoutinesView() {
  const db = useSQLiteContext();
  const [routines, setRoutines] = useState<Routine[]>([]);
  useFocusEffect(useCallback(() => { listRoutines(db).then(setRoutines); }, [db]));

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= routines.length) return;
    const next = [...routines];
    [next[i], next[j]] = [next[j], next[i]];
    setRoutines(next);
    await reorderRoutines(db, next.map((r) => r.id));
  };

  return (
    <View style={{ gap: 12 }}>
      <WodCard />
      <Pressable onPress={() => router.push('/routine/new')}
        style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed', paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ color: colors.accent, fontWeight: '800' }}>+ New routine</Text>
      </Pressable>
      {routines.map((r, i) => (
        <Card key={r.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.text, { fontWeight: '800', fontSize: 18 }]}>{r.name}</Text>
              <Text style={{ color: colors.accent, fontSize: 13 }}>{r.weekdays.map((d) => DAYS[d]).join(' + ') || 'No days assigned'}</Text>
            </View>
            <Small label="▲" disabled={i === 0} onPress={() => move(i, -1)} />
            <Small label="▼" disabled={i === routines.length - 1} onPress={() => move(i, 1)} />
            <Small label="Edit" onPress={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })} />
          </View>
          {r.exercises.map((e, n) => (
            <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
              <Text style={styles.text}><Text style={styles.dim}>{n + 1}. </Text>{e.exerciseName}</Text>
              <Text style={styles.dim}>{e.targetSets} × {e.targetReps}</Text>
            </View>
          ))}
          {r.exercises.length === 0 && <Text style={styles.dim}>No exercises yet — tap Edit.</Text>}
          <Pressable onPress={() => startOrResume(db, r.id)}
            style={{ marginTop: 4, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.accentDim }}>
            <Text style={{ color: colors.accent, fontWeight: '800' }}>Start {r.name}</Text>
          </Pressable>
        </Card>
      ))}
    </View>
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
