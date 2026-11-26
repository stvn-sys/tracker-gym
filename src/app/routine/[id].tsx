import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { showAlert } from '../../components/Dialog';
import { ExercisePicker } from '../../components/ExercisePicker';
import { Icon } from '../../components/Icon';
import { usePrefs } from '../../components/Prefs';
import { Button, Card, inputStyle, SectionTitle, styles } from '../../components/ui';
import { equipmentDetail } from '../../data/equipment';
import { listBrands, type Brand } from '../../repo/brands';
import { listExercises, type Exercise } from '../../repo/exercises';
import { createRoutine, deleteRoutine, getRoutine, updateRoutine } from '../../repo/routines';
import { colors } from '../../theme/colors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Item {
  key: string; exerciseId: string; targetSets: number; targetReps: number; targetRepsMax: number; supersetId: string | null;
}

export default function WorkoutEditor() {
  const { id, group } = useLocalSearchParams<{ id: string; group?: string }>();
  const isNew = id === 'new';
  const db = useSQLiteContext();
  const { prefs } = usePrefs();
  const [name, setName] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [picking, setPicking] = useState(false);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  // Exercise details are looked up live so names stay right after "Edit exercise".
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [brands, setBrands] = useState<Brand[]>([]);
  const WEEK_ORDER = prefs.weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];

  useEffect(() => {
    if (isNew) return;
    getRoutine(db, id).then((r) => {
      if (!r) return;
      setName(r.name);
      setWeekdays(r.weekdays);
      setItems(r.exercises.map((e) => ({
        key: e.id, exerciseId: e.exerciseId, targetSets: e.targetSets, targetReps: e.targetReps,
        targetRepsMax: e.targetRepsMax ?? e.targetReps, supersetId: e.supersetId,
      })));
    });
  }, [db, id, isNew]);

  useFocusEffect(useCallback(() => {
    listExercises(db).then((list) => setExercises(new Map(list.map((e) => [e.id, e]))));
    listBrands(db).then(setBrands);
  }, [db]));

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));
  const patch = (key: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  const move = (index: number, dir: -1 | 1) => setItems((list) => {
    const j = index + dir;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[index], next[j]] = [next[j], next[index]];
    return next;
  });

  /** Removes supersets that have only one member left. */
  const tidy = (list: Item[]) => {
    const counts = new Map<string, number>();
    for (const x of list) if (x.supersetId) counts.set(x.supersetId, (counts.get(x.supersetId) ?? 0) + 1);
    return list.map((x) => (x.supersetId && counts.get(x.supersetId) === 1 ? { ...x, supersetId: null } : x));
  };
  const linkWithNext = (i: number) => setItems((list) => {
    const next = list.map((x) => ({ ...x }));
    const sid = next[i].supersetId ?? next[i + 1].supersetId ?? newKey();
    next[i].supersetId = sid;
    next[i + 1].supersetId = sid;
    return tidy(next);
  });
  const unlink = (i: number) => setItems((list) => tidy(list.map((x, j) => (j === i ? { ...x, supersetId: null } : x))));

  const supersetIds = [...new Set(items.map((x) => x.supersetId).filter((x): x is string => !!x))];
  const letterOf = (sid: string) => String.fromCharCode(65 + Math.max(0, supersetIds.indexOf(sid)));

  const save = async () => {
    if (!name.trim()) { showAlert('Give the workout a name'); return; }
    const input = {
      groupId: group ?? null, name, weekdays,
      exercises: items.map(({ exerciseId, targetSets, targetReps, targetRepsMax, supersetId }) => ({
        exerciseId, targetSets, targetReps, targetRepsMax: Math.max(targetReps, targetRepsMax), supersetId,
      })),
    };
    if (isNew) await createRoutine(db, input);
    else await updateRoutine(db, id, input);
    router.back();
  };

  const remove = () => showAlert(`Delete ${name}?`, 'Past workouts stay in your history.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRoutine(db, id); router.back(); } },
  ]);

  const menuItem = menuFor != null ? items[menuFor] : null;
  const menuEx = menuItem ? exercises.get(menuItem.exerciseId) : undefined;
  const nextItem = menuFor != null ? items[menuFor + 1] : undefined;
  const canLinkNext = !!menuItem && !!nextItem && !(menuItem.supersetId && menuItem.supersetId === nextItem.supersetId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'New workout' : 'Edit workout' }} />
      <TextInput value={name} onChangeText={setName} placeholder="Workout name, e.g. Push" placeholderTextColor={colors.textDim}
        style={[inputStyle, { fontSize: 18, fontWeight: '700' }]} />

      <SectionTitle>Days</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {WEEK_ORDER.map((d) => {
          const on = weekdays.includes(d);
          return (
            <Pressable key={d} onPress={() => toggleDay(d)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: on ? colors.accent : colors.surfaceAlt }}>
              <Text style={{ color: on ? '#0B0B0D' : colors.text, fontWeight: '700', fontSize: 13 }}>{DAYS[d]}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Exercises</SectionTitle>
      {items.map((it, i) => {
        const ex = exercises.get(it.exerciseId);
        return (
          <Card key={it.key} style={{ gap: 10, padding: 12, borderLeftWidth: it.supersetId ? 4 : 0, borderLeftColor: colors.accent }}>
            {it.supersetId && (
              <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>SUPERSET {letterOf(it.supersetId)}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.text, { fontWeight: '700' }]}>{ex?.name ?? '…'}</Text>
                {ex && <Text style={[styles.dim, { fontSize: 12 }]} numberOfLines={1}>{equipmentDetail(ex, brands)}</Text>}
              </View>
              <IconBtn label="↑" onPress={() => move(i, -1)} disabled={i === 0} />
              <IconBtn label="↓" onPress={() => move(i, 1)} disabled={i === items.length - 1} />
              <IconBtn label="⋯" onPress={() => setMenuFor(i)} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.dim, { width: 40 }]}>Sets</Text>
              <Stepper value={it.targetSets} min={1} onChange={(v) => patch(it.key, { targetSets: v })} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.dim, { width: 40 }]}>Reps</Text>
              <Stepper value={it.targetReps} min={1}
                onChange={(v) => patch(it.key, { targetReps: v, targetRepsMax: Math.max(v, it.targetRepsMax) })} />
              <Text style={styles.dim}>to</Text>
              <Stepper value={it.targetRepsMax} min={it.targetReps} onChange={(v) => patch(it.key, { targetRepsMax: v })} />
            </View>
          </Card>
        );
      })}
      <Button label="+ Add exercise" variant="ghost" onPress={() => setPicking(true)} />

      <View style={{ gap: 10, marginTop: 16 }}>
        <Button label={isNew ? 'Create workout' : 'Save'} onPress={save} />
        {!isNew && <Button label="Delete workout" variant="danger" onPress={remove} />}
      </View>

      <Modal visible={menuItem != null} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <Pressable style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }} onPress={() => setMenuFor(null)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 8, paddingBottom: 24 }}>
            <Text style={[styles.dim, { textAlign: 'center', padding: 10 }]}>{menuEx?.name}</Text>
            {canLinkNext && <MenuRow label="Superset with next exercise" onPress={() => { linkWithNext(menuFor!); setMenuFor(null); }} />}
            {menuItem?.supersetId && <MenuRow label="Remove from superset" onPress={() => { unlink(menuFor!); setMenuFor(null); }} />}
            <MenuRow label="Edit exercise" onPress={() => { const exId = menuItem!.exerciseId; setMenuFor(null); router.push({ pathname: '/exercise/[id]', params: { id: exId } }); }} />
            <MenuRow label="Remove from workout" danger onPress={() => { const k = menuItem!.key; setItems((l) => tidy(l.filter((x) => x.key !== k))); setMenuFor(null); }} />
            <MenuRow label="Cancel" muted onPress={() => setMenuFor(null)} />
          </Pressable>
        </Pressable>
      </Modal>

      <ExercisePicker
        visible={picking}
        title="Add exercise"
        onClose={() => setPicking(false)}
        onPick={(ex) => {
          setExercises((m) => new Map(m).set(ex.id, ex));
          setItems((l) => [...l, { key: `${ex.id}-${Date.now()}`, exerciseId: ex.id, targetSets: 3, targetReps: 8, targetRepsMax: 12, supersetId: null }]);
          setPicking(false);
        }}
      />
    </ScrollView>
  );
}

const newKey = () => `ss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function MenuRow({ label, onPress, danger, muted }: { label: string; onPress: () => void; danger?: boolean; muted?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ paddingVertical: 15, alignItems: 'center', borderRadius: 12, backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })}>
      <Text style={{ fontSize: 17, fontWeight: muted ? '500' : '600', color: danger ? colors.danger : muted ? colors.textDim : colors.text }}>{label}</Text>
    </Pressable>
  );
}

function IconBtn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6}
      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      {label === '⋯'
        ? <Icon name="more" size={20} color={colors.text} />
        : <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{label}</Text>}
    </Pressable>
  );
}

function Stepper({ value, min, onChange }: { value: number; min: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <IconBtn label="−" onPress={() => onChange(Math.max(min, value - 1))} />
      <Text style={[styles.text, { minWidth: 26, textAlign: 'center', fontWeight: '700' }]}>{value}</Text>
      <IconBtn label="+" onPress={() => onChange(value + 1)} />
    </View>
  );
}
