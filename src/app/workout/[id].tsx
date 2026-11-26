import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { restAlert } from '../../components/alerts';
import { usePrefs } from '../../components/Prefs';
import { showAlert } from '../../components/Dialog';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ExercisePicker } from '../../components/ExercisePicker';
import { NumPad, RIR_COLORS } from '../../components/NumPad';
import { useProfile } from '../../components/ProfileContext';
import { Button, inputStyle, styles } from '../../components/ui';
import { EQUIPMENT_LABEL } from '../../data/equipment';
import { formatWeight, fromDisplay, toDisplay } from '../../domain/units';
import { formatDuration, volumeKg } from '../../domain/workout';
import { listBrands, type Brand } from '../../repo/brands';
import {
  addExerciseToWorkout, addSet, addWarmups, deleteSet, discardWorkout, finishWorkout, getWorkout,
  linkSuperset, removeWorkoutExercise, setExerciseNote, swapExercise, unlinkSuperset, updateRoutineFromWorkout, updateSet,
  type WorkoutExercise,
  type WorkoutDetail, type WorkoutSet,
} from '../../repo/workouts';
import { colors } from '../../theme/colors';

type Field = 'weight' | 'reps';

export default function ActiveWorkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const unit = profile.unit;

  const [w, setW] = useState<WorkoutDetail | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<{ setId: string; field: Field } | null>(null);
  const [draft, setDraft] = useState({ text: '', fresh: true });
  const [picker, setPicker] = useState<'swap' | 'add' | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const buzzed = useRef(false);
  const warned = useRef(false);
  const { prefs } = usePrefs();

  const reload = useCallback(async () => {
    const d = await getWorkout(db, id);
    setW(d);
    if (d) setIdx((i) => Math.min(i, Math.max(d.exercises.length - 1, 0)));
  }, [db, id]);

  // Reload when coming back (e.g. after editing an exercise from here).
  useFocusEffect(useCallback(() => {
    getWorkout(db, id).then(setW);
    listBrands(db).then(setBrands);
  }, [db, id]));

  // One ticking clock drives both the workout duration and the rest timer.
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const restLeft = rest ? Math.max(0, rest.endsAt - nowMs) : 0;
  useEffect(() => {
    if (!rest) return;
    const opts = { vibrate: prefs.vibrate, sound: prefs.sound };
    if (prefs.warn10 && restLeft > 0 && restLeft <= 10_000 && !warned.current && rest.total > 15) {
      warned.current = true;
      restAlert('warn', opts);
    }
    if (restLeft === 0 && !buzzed.current) {
      buzzed.current = true;
      restAlert('done', opts);
    }
  }, [rest, restLeft, prefs.vibrate, prefs.sound, prefs.warn10]);

  if (!w) return <View style={styles.screen} />;
  const we = w.exercises[idx];

  const patchLocal = (setId: string, patch: Partial<WorkoutSet>) =>
    setW((cur) => cur && ({
      ...cur,
      exercises: cur.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })),
    }));

  const writeSet = (setId: string, patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rir' | 'completedAt'>>) => {
    patchLocal(setId, patch);
    updateSet(db, setId, patch);
  };

  const selectedSet = sel ? we?.sets.find((s) => s.id === sel.setId) : undefined;

  const select = (setId: string, field: Field) => {
    const s = we.sets.find((x) => x.id === setId);
    const v = field === 'weight' ? (s?.weightKg != null ? round(toDisplay(s.weightKg, unit)) : '') : (s?.reps ?? '');
    setSel({ setId, field });
    setDraft({ text: String(v), fresh: true });
  };

  const onKey = (k: string) => {
    if (!sel) return;
    let text = draft.fresh ? '' : draft.text;
    if (k === '⌫') text = draft.fresh ? '' : text.slice(0, -1);
    else if (k === '.') { if (!text.includes('.')) text = (text || '0') + '.'; }
    else text = (text + k).replace(/^0+(?=\d)/, '');
    setDraft({ text, fresh: false });
    const num = text === '' ? null : Number(text);
    if (sel.field === 'weight') writeSet(sel.setId, { weightKg: num == null ? null : fromDisplay(num, unit) });
    else writeSet(sel.setId, { reps: num == null ? null : Math.round(num) });
  };

  const onStep = (deltaKg: number) => {
    if (!sel || !selectedSet) return;
    const next = Math.max(0, Math.round(((selectedSet.weightKg ?? 0) + deltaKg) * 100) / 100);
    writeSet(sel.setId, { weightKg: next });
    setDraft({ text: round(toDisplay(next, unit)), fresh: true });
  };

  const onDone = () => {
    if (!sel) return;
    if (sel.field === 'weight') select(sel.setId, 'reps');
    else setSel(null);
  };

  const restFor = (e: WorkoutExercise) => e.exercise.restSeconds ?? profile.restSeconds;

  const startRest = (seconds = we ? restFor(we) : profile.restSeconds) => {
    buzzed.current = false;
    warned.current = false;
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds });
  };

  /** Superset members of an exercise, in workout order (just itself when not in a superset). */
  const groupOf = (e: WorkoutExercise) => (e.supersetId ? w.exercises.filter((x) => x.supersetId === e.supersetId) : [e]);

  const toggleComplete = (s: WorkoutSet) => {
    if (s.completedAt) { writeSet(s.id, { completedAt: null }); return; }
    writeSet(s.id, { completedAt: Date.now() });
    setSel(null);
    const group = groupOf(we);
    const pos = group.indexOf(we);
    if (group.length > 1 && pos < group.length - 1) {
      // Superset: go straight to the next exercise, rest comes after the round.
      setIdx(w.exercises.indexOf(group[pos + 1]));
      return;
    }
    if (prefs.autoRest) startRest(restFor(we));
    if (group.length > 1) {
      const first = group[0];
      const firstLeft = first.sets.some((x) => !x.isWarmup && !x.completedAt);
      if (firstLeft) setIdx(w.exercises.indexOf(first));
    }
  };

  const removeSet = (s: WorkoutSet) =>
    showAlert('Delete set?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { setSel(null); await deleteSet(db, s.id); reload(); } },
    ]);

  const finish = () => {
    const done = w.exercises.some((e) => e.sets.some((s) => s.completedAt));
    const discard = { text: 'Discard', style: 'destructive' as const, onPress: async () => { await discardWorkout(db, w.id); router.back(); } };
    const save = async (updateRoutine: boolean) => {
      if (updateRoutine) await updateRoutineFromWorkout(db, w.id);
      await finishWorkout(db, w.id);
      router.replace({ pathname: '/history/[id]', params: { id: w.id } });
    };
    if (!done) {
      showAlert('No sets checked off', 'Discard this workout?', [{ text: 'Keep going', style: 'cancel' }, discard]);
      return;
    }
    showAlert('End workout?', w.routineId
      ? 'Save it to your history. "Save & update routine" also makes the routine match today: exercise order, supersets, and sets and reps for what you trained. Exercises you skipped keep their plan. Unchecked sets are dropped from the log.'
      : 'Save it to your history. Unchecked sets are dropped.', [
      { text: 'Cancel', style: 'cancel' },
      discard,
      { text: 'Save', onPress: () => save(false) },
      ...(w.routineId ? [{ text: 'Save & update routine', onPress: () => save(true) }] : []),
    ]);
  };

  const steps = we && sel?.field === 'weight' && we.exercise.incrementKg > 0
    ? [
        { label: `−${round(toDisplay(we.exercise.incrementKg, unit))}`, deltaKg: -we.exercise.incrementKg },
        { label: `+${round(toDisplay(we.exercise.incrementKg, unit))}`, deltaKg: we.exercise.incrementKg },
        ...we.exercise.addonPlatesKg.map((p) => ({ label: `+${round(toDisplay(p, unit))}`, deltaKg: p })),
      ]
    : [];

  const brand = we && brands.find((b) => b.id === we.exercise.brandId);
  const series = brand?.series.find((s) => s.id === we?.exercise.seriesId);
  const meta = we ? [
    EQUIPMENT_LABEL[we.exercise.equipment],
    we.exercise.pulleys ? `${we.exercise.pulleys} ${we.exercise.pulleys === 1 ? 'pulley' : 'pulleys'}` : null,
    we.exercise.attachment,
    brand && [brand.name, series?.name].filter(Boolean).join(' '),
    we.exercise.laterality === 'unilateral' ? 'Unilateral' : null,
  ].filter(Boolean).join(' · ') : '';

  const supersetIds = [...new Set(w.exercises.map((e) => e.supersetId).filter((x): x is string => !!x))];
  const letterOf = (sid: string) => String.fromCharCode(65 + Math.max(0, supersetIds.indexOf(sid)));
  const working = we?.sets.filter((s) => !s.isWarmup) ?? [];
  const doneCount = working.filter((s) => s.completedAt).length;
  const totalVolume = volumeKg(w.exercises.flatMap((e) => e.sets));

  return (
    <View style={styles.screen}>
      {prefs.keepAwake && <KeepAwake />}
      <Stack.Screen
        options={{
          title: formatDuration(nowMs - w.startedAt),
          headerRight: () => (
            <Pressable onPress={finish} hitSlop={10}>
              <Text style={{ color: colors.success, fontWeight: '800', fontSize: 16 }}>Finish</Text>
            </Pressable>
          ),
        }}
      />

      {rest && (
        <Pressable onPress={() => setRest(null)} style={{ backgroundColor: colors.surfaceAlt }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(restLeft / 1000 / rest.total) * 100}%`, backgroundColor: restLeft ? colors.accentDim : colors.success + '55' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, flex: 1 }}>
              {restLeft ? `Rest ${formatDuration(restLeft)}` : 'Rest done — go!'}
            </Text>
            <Pressable onPress={() => setRest({ ...rest, endsAt: rest.endsAt - 15000 })} hitSlop={8}><Text style={styles.dim}>−15s</Text></Pressable>
            <Pressable onPress={() => setRest({ ...rest, endsAt: rest.endsAt + 15000, total: rest.total + 15 })} hitSlop={8}><Text style={styles.dim}>+15s</Text></Pressable>
            <Text style={{ color: colors.accent }}>Skip</Text>
          </View>
        </Pressable>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 12, gap: 8 }}>
        {w.exercises.map((e, i) => {
          const all = e.sets.filter((s) => !s.isWarmup);
          const complete = all.length > 0 && all.every((s) => s.completedAt);
          return (
            <Pressable key={e.id} onPress={() => { setIdx(i); setSel(null); }}
              style={{ width: 92, height: 64, borderRadius: 12, padding: 8, justifyContent: 'space-between',
                backgroundColor: i === idx ? colors.accentDim : colors.surface,
                borderWidth: 1, borderColor: i === idx ? colors.accent : complete ? colors.success : colors.border }}>
              <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{e.exercise.name}</Text>
              {e.supersetId && (
                <View style={{ position: 'absolute', top: -6, right: -4, paddingHorizontal: 5, borderRadius: 6, backgroundColor: colors.accent }}>
                  <Text style={{ color: '#0B0B0D', fontSize: 10, fontWeight: '900' }}>{letterOf(e.supersetId)}{groupOf(e).indexOf(e) + 1}</Text>
                </View>
              )}
              <Text style={{ color: complete ? colors.success : colors.textDim, fontSize: 11 }}>
                {all.filter((s) => s.completedAt).length}/{all.length}
              </Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setPicker('add')}
          style={{ width: 64, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
          <Text style={{ color: colors.textDim, fontSize: 26 }}>+</Text>
        </Pressable>
      </ScrollView>

      {!we ? (
        <View style={styles.content}>
          <Text style={styles.dim}>No exercises yet. Tap + to add one.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {we.supersetId && (
            <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>
              SUPERSET {letterOf(we.supersetId)} · {groupOf(we).map((x) => x.exercise.name).join(' → ')}
            </Text>
          )}
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{we.exercise.name}</Text>
          <Text style={styles.dim}>{meta}</Text>
          <Text style={[styles.dim, { marginTop: 2 }]}>Set {Math.min(doneCount + 1, working.length)} of {working.length} · Volume {formatWeight(totalVolume, unit)}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
            <Action label="Warm-up" onPress={async () => {
              if (we.sets.some((s) => s.isWarmup)) { showAlert('Warm-ups already added'); return; }
              if (!(await addWarmups(db, we))) showAlert('Enter a working weight first');
              reload();
            }} />
            {!prefs.autoRest && <Action label="Rest timer" onPress={() => startRest(restFor(we))} />}
            <Action label="Edit" onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: we.exercise.id } })} />
            {we.supersetId
              ? <Action label="Unlink superset" onPress={async () => { await unlinkSuperset(db, we); reload(); }} />
              : <Action label="Superset" onPress={() => setPairOpen(true)} />}
            <Action label="Swap" onPress={() => setPicker('swap')} />
            <Action label={we.note ? 'Edit note' : 'Note'} onPress={() => { setNoteText(we.note ?? ''); setNoteOpen(true); }} />
            <Action label="Remove" onPress={() => showAlert(`Remove ${we.exercise.name}?`, undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: async () => { setSel(null); await removeWorkoutExercise(db, we.id); reload(); } },
            ])} />
          </ScrollView>

          {we.note && (
            <Text style={{ color: colors.textDim, fontStyle: 'italic', marginBottom: 8 }}>📝 {we.note}</Text>
          )}

          <View style={rowStyle}>
            <Text style={[head, { width: 36 }]}>Set</Text>
            <Text style={[head, { flex: 1.3 }]}>Previous</Text>
            <Text style={[head, { flex: 1 }]}>{unit}{we.exercise.laterality === 'unilateral' ? '/side' : ''}</Text>
            <Text style={[head, { flex: 1 }]}>Reps</Text>
            <Text style={[head, { width: 44 }]}>✓</Text>
          </View>

          {we.sets.map((s) => {
            const workingIdx = working.indexOf(s);
            const prev = s.isWarmup ? undefined : we.previous[workingIdx];
            const isSel = (f: Field) => sel?.setId === s.id && sel.field === f;
            return (
              <Pressable key={s.id} onLongPress={() => removeSet(s)}
                style={[rowStyle, { opacity: s.completedAt ? 0.75 : 1, backgroundColor: s.completedAt ? colors.success + '14' : 'transparent', borderRadius: 10 }]}>
                <View style={{ width: 36, alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: s.isWarmup ? '#F5B400' : colors.text, fontWeight: '700' }}>{s.isWarmup ? 'W' : workingIdx + 1}</Text>
                  </View>
                </View>
                <Text style={{ flex: 1.3, color: colors.textDim, fontSize: 13, textAlign: 'center' }}>
                  {prev ? `${formatWeight(prev.weightKg, unit, false)} × ${prev.reps}` : '–'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Cell value={s.weightKg != null ? round(toDisplay(s.weightKg, unit)) : ''} active={isSel('weight')} onPress={() => select(s.id, 'weight')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Cell value={s.reps != null ? String(s.reps) : ''} active={isSel('reps')} onPress={() => select(s.id, 'reps')} />
                  {s.rir != null && (
                    <View style={{ position: 'absolute', right: 0, bottom: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: RIR_COLORS[s.rir], alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#0B0D17' }}>{s.rir === 5 ? '5+' : s.rir}</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => toggleComplete(s)} hitSlop={6} style={{ width: 44, alignItems: 'center' }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, borderWidth: 2, borderColor: s.completedAt ? colors.success : colors.border, backgroundColor: s.completedAt ? colors.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {s.completedAt ? <Text style={{ color: '#0B0D17', fontWeight: '900' }}>✓</Text> : null}
                  </View>
                </Pressable>
              </Pressable>
            );
          })}

          <Pressable onPress={async () => { await addSet(db, we.id); reload(); }} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>+ Add set</Text>
          </Pressable>
          <Text style={[styles.dim, { textAlign: 'center', fontSize: 12 }]}>Long-press a set to delete it</Text>
        </ScrollView>
      )}

      {sel && selectedSet && (
        <NumPad
          field={sel.field}
          rir={selectedSet.rir}
          onKey={onKey}
          onRir={(rir) => writeSet(selectedSet.id, { rir })}
          onDone={onDone}
          steps={steps}
          onStep={onStep}
        />
      )}

      <Modal visible={pairOpen} transparent animationType="fade" onRequestClose={() => setPairOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 24 }} onPress={() => setPairOpen(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 8 }}>
            <Text style={styles.section}>Superset {we?.exercise.name} with…</Text>
            <Text style={styles.dim}>You do one set of each, then rest.</Text>
            {w.exercises.filter((e) => e.id !== we?.id).map((e) => (
              <Pressable key={e.id} onPress={async () => { if (we) await linkSuperset(db, we, e); setPairOpen(false); reload(); }}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={styles.text}>{e.exercise.name}{e.supersetId ? `  (superset ${letterOf(e.supersetId)})` : ''}</Text>
              </Pressable>
            ))}
            {w.exercises.length < 2 && <Text style={styles.dim}>Add another exercise first.</Text>}
          </Pressable>
        </Pressable>
      </Modal>

      <ExercisePicker
        visible={picker !== null}
        title={picker === 'swap' ? `Swap ${we?.exercise.name ?? ''}` : 'Add exercise'}
        preferMuscle={picker === 'swap' ? we?.exercise.primaryMuscle : undefined}
        excludeId={picker === 'swap' ? we?.exercise.id : undefined}
        onClose={() => setPicker(null)}
        onPick={async (ex) => {
          if (picker === 'swap' && we) await swapExercise(db, we, ex.id);
          else {
            await addExerciseToWorkout(db, w.id, ex.id, 3, null, prefs.prefill);
            setIdx(w.exercises.length);
          }
          setPicker(null);
          setSel(null);
          reload();
        }}
      />

      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={styles.section}>Note</Text>
            <TextInput value={noteText} onChangeText={setNoteText} multiline autoFocus placeholder="Seat height 4, felt strong…"
              placeholderTextColor={colors.textDim} style={[inputStyle, { minHeight: 90, textAlignVertical: 'top' }]} />
            <Button label="Save note" onPress={async () => { if (we) await setExerciseNote(db, we.id, noteText); setNoteOpen(false); reload(); }} />
            <Button label="Cancel" variant="ghost" onPress={() => setNoteOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Keeps the screen on while mounted. */
function KeepAwake() {
  useEffect(() => {
    const tag = 'workout';
    // Errors are ignored: some browsers refuse a wake lock, and leaving quickly can cancel it.
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => { deactivateKeepAwake(tag).catch(() => {}); };
  }, []);
  return null;
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function Cell({ value, active, onPress }: { value: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ marginHorizontal: 4, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: active ? colors.text : 'transparent' }}>
      <Text style={{ color: value ? colors.text : colors.textDim, fontSize: 17, fontWeight: '600' }}>{value || '–'}</Text>
    </Pressable>
  );
}

const round = (n: number) => String(Math.round(n * 100) / 100);
const rowStyle = { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 } as const;
const head = { color: colors.textDim, fontSize: 12, textAlign: 'center', fontWeight: '600' } as const;
