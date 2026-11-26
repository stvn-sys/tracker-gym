import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { showAlert } from '../../components/Dialog';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ExercisePicker } from '../../components/ExercisePicker';
import { Button, Card, Chip, ChipRow, inputStyle, SectionTitle, styles } from '../../components/ui';
import { createRoutine, deleteRoutine, getRoutine, updateRoutine } from '../../repo/routines';
import { colors } from '../../theme/colors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Item { key: string; exerciseId: string; name: string; targetSets: number; targetReps: number }

export default function RoutineEditor() {
  const { id, group } = useLocalSearchParams<{ id: string; group?: string }>();
  const isNew = id === 'new';
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (isNew) return;
    getRoutine(db, id).then((r) => {
      if (!r) return;
      setName(r.name);
      setWeekdays(r.weekdays);
      setItems(r.exercises.map((e) => ({ key: e.id, exerciseId: e.exerciseId, name: e.exerciseName, targetSets: e.targetSets, targetReps: e.targetReps })));
    });
  }, [db, id, isNew]);

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));
  const patch = (key: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  const move = (index: number, dir: -1 | 1) => setItems((list) => {
    const j = index + dir;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[index], next[j]] = [next[j], next[index]];
    return next;
  });

  const save = async () => {
    if (!name.trim()) { showAlert('Give the workout a name'); return; }
    const input = { groupId: group ?? null, name, weekdays, exercises: items.map(({ exerciseId, targetSets, targetReps }) => ({ exerciseId, targetSets, targetReps })) };
    if (isNew) await createRoutine(db, input);
    else await updateRoutine(db, id, input);
    router.back();
  };

  const remove = () => showAlert(`Delete ${name}?`, 'Past workouts stay in your history.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRoutine(db, id); router.back(); } },
  ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'New workout' : 'Edit workout' }} />
      <TextInput value={name} onChangeText={setName} placeholder="Workout name, e.g. Push" placeholderTextColor={colors.textDim}
        style={[inputStyle, { fontSize: 18, fontWeight: '700' }]} />

      <SectionTitle>Days</SectionTitle>
      <ChipRow wrap>
        {WEEK_ORDER.map((d) => <Chip key={d} label={DAYS[d]} active={weekdays.includes(d)} onPress={() => toggleDay(d)} />)}
      </ChipRow>

      <SectionTitle>Exercises</SectionTitle>
      {items.map((it, i) => (
        <Card key={it.key} style={{ gap: 10, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.text, { flex: 1, fontWeight: '700' }]}>{it.name}</Text>
            <IconBtn label="↑" onPress={() => move(i, -1)} disabled={i === 0} />
            <IconBtn label="↓" onPress={() => move(i, 1)} disabled={i === items.length - 1} />
            <IconBtn label="✕" onPress={() => setItems((l) => l.filter((x) => x.key !== it.key))} danger />
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Stepper label="Sets" value={it.targetSets} min={1} onChange={(v) => patch(it.key, { targetSets: v })} />
            <Stepper label="Reps" value={it.targetReps} min={1} onChange={(v) => patch(it.key, { targetReps: v })} />
          </View>
        </Card>
      ))}
      <Button label="+ Add exercise" variant="ghost" onPress={() => setPicking(true)} />

      <View style={{ gap: 10, marginTop: 16 }}>
        <Button label={isNew ? 'Create workout' : 'Save'} onPress={save} />
        {!isNew && <Button label="Delete workout" variant="danger" onPress={remove} />}
      </View>

      <ExercisePicker
        visible={picking}
        title="Add exercise"
        onClose={() => setPicking(false)}
        onPick={(ex) => {
          setItems((l) => [...l, { key: `${ex.id}-${Date.now()}`, exerciseId: ex.id, name: ex.name, targetSets: 3, targetReps: 10 }]);
          setPicking(false);
        }}
      />
    </ScrollView>
  );
}

function IconBtn({ label, onPress, disabled, danger }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6}
      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      <Text style={{ color: danger ? colors.danger : colors.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={styles.dim}>{label}</Text>
      <IconBtn label="−" onPress={() => onChange(Math.max(min, value - 1))} />
      <Text style={[styles.text, { minWidth: 24, textAlign: 'center', fontWeight: '700' }]}>{value}</Text>
      <IconBtn label="+" onPress={() => onChange(value + 1)} />
    </View>
  );
}
