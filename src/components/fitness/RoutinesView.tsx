import { useCallback, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { WorkoutChips } from './WorkoutChips';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { createGroup, listGroups, reorderGroups, type RoutineGroup } from '../../repo/routines';
import { colors } from '../../theme/colors';
import { Card, inputStyle, styles } from '../ui';
import { DAYS, WodCard } from '../widgets/WodCard';
import { RoutineBody } from './RoutineMuscles';

/** Routines (groups of workouts). Tap one to see its muscles, volume and workouts. */
export function RoutinesView() {
  const db = useSQLiteContext();
  const [groups, setGroups] = useState<RoutineGroup[]>([]);
  const [newName, setNewName] = useState('');
  const reload = useCallback(() => { listGroups(db).then(setGroups); }, [db]);
  useFocusEffect(reload);

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= groups.length) return;
    const next = [...groups];
    [next[i], next[j]] = [next[j], next[i]];
    setGroups(next);
    await reorderGroups(db, next.map((g) => g.id));
  };

  const add = async () => {
    if (!newName.trim()) return;
    const id = await createGroup(db, newName);
    setNewName('');
    router.push({ pathname: '/program/[id]', params: { id } });
  };

  return (
    <View style={{ gap: 12 }}>
      <WodCard />
      {groups.map((g, i) => (
        <Pressable key={g.id} onPress={() => router.push({ pathname: '/program/[id]', params: { id: g.id } })}>
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.text, { fontWeight: '800', fontSize: 19 }]}>{g.name}</Text>
                <Text style={styles.dim}>{g.workouts.length} {g.workouts.length === 1 ? 'workout' : 'workouts'}</Text>
              </View>
              {g.isActive && (
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.success + '26' }}>
                  <Text style={{ color: colors.success, fontWeight: '800', fontSize: 12 }}>ACTIVE</Text>
                </View>
              )}
              <Small label="▲" disabled={i === 0} onPress={() => move(i, -1)} />
              <Small label="▼" disabled={i === groups.length - 1} onPress={() => move(i, 1)} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 150 }}>
                <RoutineBody workouts={g.workouts} height={150} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                {g.workouts.map((w) => (
                  <View key={w.id}>
                    <Text style={[styles.text, { fontWeight: '700' }]} numberOfLines={1}>{w.name}</Text>
                    <Text style={{ color: colors.accent, fontSize: 12 }}>{w.weekdays.map((d) => DAYS[d]).join(' + ') || 'No days'}</Text>
                    <WorkoutChips w={w} />
                  </View>
                ))}
                {g.workouts.length === 0 && <Text style={styles.dim}>No workouts yet</Text>}
              </View>
            </View>
          </Card>
        </Pressable>
      ))}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={newName} onChangeText={setNewName} onSubmitEditing={add} placeholder="New routine name, e.g. PPL"
          placeholderTextColor={colors.textDim} style={[inputStyle, { flex: 1, minWidth: 0 }]} />
        <Pressable onPress={add} style={{ paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center' }}>
          <Text style={{ color: '#06121F', fontWeight: '800' }}>+ Routine</Text>
        </Pressable>
      </View>
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
