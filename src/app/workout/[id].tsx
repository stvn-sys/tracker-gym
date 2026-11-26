import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { restAlert } from '../../components/alerts';
import { showAlert } from '../../components/Dialog';
import { ExercisePicker } from '../../components/ExercisePicker';
import { NumPad, RIR_COLORS } from '../../components/NumPad';
import { usePrefs } from '../../components/Prefs';
import { useProfile } from '../../components/ProfileContext';
import { SwipeRow } from '../../components/SwipeRow';
import { useKeyboardHeight } from '../../components/useKeyboardHeight';
import { Button, inputStyle, styles } from '../../components/ui';
import { equipmentDetail, loadMode, type LoadMode } from '../../data/equipment';
import { formatWeight, fromDisplay, toDisplay } from '../../domain/units';
import { formatDuration } from '../../domain/workout';
import { mixHex } from '../../domain/volume';
import { listBrands, type Brand } from '../../repo/brands';
import { setExerciseNotes } from '../../repo/exercises';
import {
  addExerciseToWorkout, addSet, addWarmups, deleteSet, discardWorkout, finishWorkout, getWorkout,
  linkSuperset, removeWorkoutExercise, setExerciseNote, swapExercise, unlinkSuperset, updateRoutineFromWorkout, updateSet,
  type WorkoutDetail, type WorkoutExercise, type WorkoutSet,
} from '../../repo/workouts';
import { colors } from '../../theme/colors';

type Field = 'weight' | 'reps';

const nowTs = () => Date.now();

/** Light tick like a keyboard key press (ignored where not supported). */
const tick = () => { Haptics.selectionAsync().catch(() => {}); };

/** Exercises grouped into pages: a superset is one page, everything else one exercise per page. */
function toPages(exercises: WorkoutExercise[]): WorkoutExercise[][] {
  const pages: WorkoutExercise[][] = [];
  for (const e of exercises) {
    const last = pages[pages.length - 1];
    if (last && e.supersetId && last[0].supersetId === e.supersetId) last.push(e);
    else pages.push([e]);
  }
  return pages;
}

export default function ActiveWorkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const { prefs } = usePrefs();
  const unit = profile.unit;

  const [w, setW] = useState<WorkoutDetail | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<{ setId: string; field: Field } | null>(null);
  const [draft, setDraft] = useState({ text: '', fresh: true });
  const [picker, setPicker] = useState<{ kind: 'swap' | 'add'; we?: WorkoutExercise } | null>(null);
  const [noteFor, setNoteFor] = useState<WorkoutExercise | null>(null);
  const [noteText, setNoteText] = useState('');
  const [keepText, setKeepText] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const keyboard = useKeyboardHeight();
  const buzzed = useRef(false);
  const warned = useRef(false);

  const reload = useCallback(async () => { setW(await getWorkout(db, id)); }, [db, id]);

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

  const pages = toPages(w.exercises);
  const pageIdx = Math.min(page, Math.max(0, pages.length - 1));
  const members = pages[pageIdx] ?? [];
  const pageOf = (e: WorkoutExercise) => pages.findIndex((p) => p.includes(e));
  const goTo = (i: number) => { setSel(null); setPage(Math.max(0, Math.min(i, pages.length - 1))); };

  const supersetIds = [...new Set(w.exercises.map((e) => e.supersetId).filter((x): x is string => !!x))];
  const letterOf = (sid: string) => String.fromCharCode(65 + Math.max(0, supersetIds.indexOf(sid)));

  const ownerOf = (setId: string) => w.exercises.find((e) => e.sets.some((s) => s.id === setId));
  const selWe = sel ? ownerOf(sel.setId) : undefined;
  const selectedSet = sel ? selWe?.sets.find((s) => s.id === sel.setId) : undefined;

  const patchLocal = (setId: string, patch: Partial<WorkoutSet>) =>
    setW((cur) => cur && ({
      ...cur,
      exercises: cur.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })),
    }));

  const writeSet = (setId: string, patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rir' | 'completedAt'>>) => {
    patchLocal(setId, patch);
    updateSet(db, setId, patch);
  };

  const select = (s: WorkoutSet, field: Field) => {
    tick();
    const v = field === 'weight' ? (s.weightKg != null ? round(toDisplay(s.weightKg, unit)) : '') : (s.reps ?? '');
    setSel({ setId: s.id, field });
    setDraft({ text: String(v), fresh: true });
  };

  const onKey = (k: string) => {
    if (!sel) return;
    tick();
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
    tick();
    const next = Math.max(0, Math.round(((selectedSet.weightKg ?? 0) + deltaKg) * 100) / 100);
    writeSet(sel.setId, { weightKg: next });
    setDraft({ text: round(toDisplay(next, unit)), fresh: true });
  };

  const restFor = (e: WorkoutExercise) => e.exercise.restSeconds ?? profile.restSeconds;
  const startRest = (seconds: number) => {
    buzzed.current = false;
    warned.current = false;
    setRest({ endsAt: nowTs() + seconds * 1000, total: seconds });
  };

  /** Checks off a set. In a superset, rest only starts after the last exercise of the round. */
  const complete = (s: WorkoutSet, owner: WorkoutExercise) => {
    writeSet(s.id, { completedAt: nowTs() });
    setSel(null);
    const group = pages[pageOf(owner)] ?? [owner];
    const isLast = group.indexOf(owner) === group.length - 1;
    if (prefs.autoRest && isLast) startRest(restFor(owner));
  };

  const toggleComplete = (s: WorkoutSet, owner: WorkoutExercise) => {
    tick();
    if (s.completedAt) writeSet(s.id, { completedAt: null });
    else complete(s, owner);
  };

  const onDone = () => {
    if (!sel || !selectedSet) return;
    if (sel.field === 'weight') select(selectedSet, 'reps');
    else setSel(null);
  };

  /** Picking RIR finishes the set when weight (if needed) and reps are filled in. */
  const onRir = (rir: number | null) => {
    if (!selectedSet || !selWe) return;
    tick();
    writeSet(selectedSet.id, { rir });
    const needsWeight = loadMode(selWe.exercise) !== 'none';
    if (rir != null && !selectedSet.completedAt && selectedSet.reps != null && (!needsWeight || selectedSet.weightKg != null)) {
      complete({ ...selectedSet, rir }, selWe);
    }
  };

  const removeSet = async (s: WorkoutSet) => {
    setSel(null);
    patchLocal(s.id, {});
    setW((cur) => cur && ({ ...cur, exercises: cur.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.id !== s.id) })) }));
    await deleteSet(db, s.id);
  };

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

  const steps = selWe && sel?.field === 'weight' && selWe.exercise.incrementKg > 0
    ? [
        { label: `−${round(toDisplay(selWe.exercise.incrementKg, unit))}`, deltaKg: -selWe.exercise.incrementKg },
        { label: `+${round(toDisplay(selWe.exercise.incrementKg, unit))}`, deltaKg: selWe.exercise.incrementKg },
        ...selWe.exercise.addonPlatesKg.map((p) => ({ label: `+${round(toDisplay(p, unit))}`, deltaKg: p })),
      ]
    : [];

  const title = [w.name, w.gym, formatDuration(nowMs - w.startedAt)].filter(Boolean).join(' · ');
  const isLastPage = pageIdx >= pages.length - 1;

  return (
    <View style={styles.screen}>
      {prefs.keepAwake && <KeepAwake />}
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 16, maxWidth: 260 }}>{title}</Text>
          ),
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
        {w.exercises.map((e) => {
          const all = e.sets.filter((s) => !s.isWarmup);
          const done = all.length > 0 && all.every((s) => s.completedAt);
          const on = members.includes(e);
          return (
            <Pressable key={e.id} onPress={() => goTo(pageOf(e))}
              style={{ width: 92, height: 64, borderRadius: 12, padding: 8, justifyContent: 'space-between',
                backgroundColor: on ? colors.accentDim : colors.surface,
                borderWidth: 1, borderColor: on ? colors.accent : done ? colors.success : colors.border }}>
              <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{e.exercise.name}</Text>
              {e.supersetId && (
                <View style={{ position: 'absolute', top: -6, right: -4, paddingHorizontal: 5, borderRadius: 6, backgroundColor: colors.accent }}>
                  <Text style={{ color: '#0B0B0D', fontSize: 10, fontWeight: '900' }}>{letterOf(e.supersetId)}{(pages[pageOf(e)] ?? []).indexOf(e) + 1}</Text>
                </View>
              )}
              <Text style={{ color: done ? colors.success : colors.textDim, fontSize: 11 }}>{all.filter((s) => s.completedAt).length}/{all.length}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setPicker({ kind: 'add' })}
          style={{ width: 64, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
          <Text style={{ color: colors.textDim, fontSize: 26 }}>+</Text>
        </Pressable>
      </ScrollView>

      {members.length === 0 ? (
        <View style={styles.content}><Text style={styles.dim}>No exercises yet. Tap + to add one.</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
          {members.length > 1 && (
            <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>
              SUPERSET {letterOf(members[0].supersetId!)} · one set of each, then rest
            </Text>
          )}
          {members.map((we) => {
            const i = w.exercises.indexOf(we);
            const prevEx = w.exercises[i - 1];
            const nextEx = w.exercises[i + 1];
            return (
              <ExerciseBlock
                key={we.id}
                we={we}
                unit={unit}
                meta={[equipmentDetail(we.exercise, brands), we.exercise.laterality === 'unilateral' ? 'Unilateral' : null].filter(Boolean).join(' · ')}
                sel={sel}
                onSelect={select}
                onToggle={(s) => toggleComplete(s, we)}
                onDelete={removeSet}
                actions={[
                  { label: 'Warm-up', onPress: async () => {
                    if (we.sets.some((s) => s.isWarmup)) { showAlert('Warm-ups already added'); return; }
                    if (!(await addWarmups(db, we))) showAlert('Enter a working weight first');
                    reload();
                  } },
                  ...(!prefs.autoRest ? [{ label: 'Rest timer', onPress: () => startRest(restFor(we)) }] : []),
                  { label: 'Edit', onPress: () => router.push({ pathname: '/exercise/[id]', params: { id: we.exercise.id } }) },
                  ...(prevEx && !(we.supersetId && prevEx.supersetId === we.supersetId)
                    ? [{ label: 'Superset with previous', onPress: async () => { await linkSuperset(db, prevEx, we); setPage(pageOf(prevEx)); reload(); } }] : []),
                  ...(nextEx && !(we.supersetId && nextEx.supersetId === we.supersetId)
                    ? [{ label: 'Superset with next', onPress: async () => { await linkSuperset(db, we, nextEx); reload(); } }] : []),
                  ...(we.supersetId ? [{ label: 'Unlink superset', onPress: async () => { await unlinkSuperset(db, we); reload(); } }] : []),
                  { label: 'Swap', onPress: () => setPicker({ kind: 'swap', we }) },
                  { label: we.note || we.exercise.notes ? 'Edit notes' : 'Notes', onPress: () => { setNoteText(we.note ?? ''); setKeepText(we.exercise.notes ?? ''); setNoteFor(we); } },
                  { label: 'Remove', onPress: () => showAlert(`Remove ${we.exercise.name}?`, undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: async () => { setSel(null); await removeWorkoutExercise(db, we.id); reload(); } },
                  ]) },
                ]}
                onAddSet={async () => { await addSet(db, we.id); reload(); }}
              />
            );
          })}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable disabled={pageIdx === 0} onPress={() => goTo(pageIdx - 1)}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: colors.surfaceAlt, opacity: pageIdx === 0 ? 0.35 : 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>‹ Previous exercise</Text>
            </Pressable>
            <Pressable onPress={() => (isLastPage ? finish() : goTo(pageIdx + 1))}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: isLastPage ? colors.success : colors.accent }}>
              <Text style={{ color: '#0B0B0D', fontWeight: '800' }}>{isLastPage ? 'Finish workout' : 'Next exercise ›'}</Text>
            </Pressable>
          </View>
          <Text style={[styles.dim, { textAlign: 'center', fontSize: 12 }]}>Swipe a set left to delete it</Text>
        </ScrollView>
      )}

      {sel && selectedSet && (
        <NumPad field={sel.field} rir={selectedSet.rir} onKey={onKey} onRir={onRir} onDone={onDone} steps={steps} onStep={onStep} />
      )}

      <ExercisePicker
        visible={picker !== null}
        title={picker?.kind === 'swap' ? `Swap ${picker.we?.exercise.name ?? ''}` : 'Add exercise'}
        preferMuscle={picker?.kind === 'swap' ? picker.we?.exercise.primaryMuscle : undefined}
        excludeId={picker?.kind === 'swap' ? picker.we?.exercise.id : undefined}
        onClose={() => setPicker(null)}
        onPick={async (ex) => {
          if (picker?.kind === 'swap' && picker.we) await swapExercise(db, picker.we, ex.id);
          else {
            await addExerciseToWorkout(db, w.id, ex.id, 3, null, prefs.prefill);
            setPage(pages.length);
          }
          setPicker(null);
          setSel(null);
          reload();
        }}
      />

      <Modal visible={!!noteFor} transparent animationType="fade" onRequestClose={() => setNoteFor(null)}>
        <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 24, paddingBottom: 24 + keyboard }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={styles.section}>Notes</Text>
            <Text style={styles.dim}>Exercise notes · shown every time</Text>
            <TextInput value={keepText} onChangeText={setKeepText} multiline placeholder="Seat height 4, grip just outside shoulders…"
              placeholderTextColor={colors.textDim} style={[inputStyle, { minHeight: 70, textAlignVertical: 'top' }]} />
            <Text style={styles.dim}>Today only</Text>
            <TextInput value={noteText} onChangeText={setNoteText} multiline placeholder="Felt strong, left shoulder a bit tight…"
              placeholderTextColor={colors.textDim} style={[inputStyle, { minHeight: 70, textAlignVertical: 'top' }]} />
            <Button label="Save notes" onPress={async () => {
              if (noteFor) {
                await setExerciseNote(db, noteFor.id, noteText);
                await setExerciseNotes(db, noteFor.exercise.id, keepText);
              }
              setNoteFor(null);
              reload();
            }} />
            <Button label="Cancel" variant="ghost" onPress={() => setNoteFor(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** "−20 kg", "+10 kg", "80 kg" or "" (reps only) for a set's weight. */
function weightText(kg: number | null, mode: LoadMode, unit: 'kg' | 'lbs', withUnit = false): string {
  if (mode === 'none' || kg == null) return '';
  const v = formatWeight(kg, unit, withUnit);
  return mode === 'assisted' ? `−${v}` : mode === 'added' ? `+${v}` : v;
}

function ExerciseBlock({ we, unit, meta, sel, onSelect, onToggle, onDelete, actions, onAddSet }: {
  we: WorkoutExercise; unit: 'kg' | 'lbs'; meta: string;
  sel: { setId: string; field: Field } | null;
  onSelect: (s: WorkoutSet, f: Field) => void;
  onToggle: (s: WorkoutSet) => void;
  onDelete: (s: WorkoutSet) => void;
  actions: { label: string; onPress: () => void }[];
  onAddSet: () => void;
}) {
  const mode = loadMode(we.exercise);
  const working = we.sets.filter((s) => !s.isWarmup);
  const doneCount = working.filter((s) => s.completedAt).length;
  const weightHead = mode === 'assisted' ? `−${unit}` : mode === 'added' ? `+${unit}` : unit;
  return (
    <View>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{we.exercise.name}</Text>
      <Text style={styles.dim}>{meta}</Text>
      <Text style={[styles.dim, { marginTop: 2 }]}>Set {Math.min(doneCount + 1, working.length)} of {working.length}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
        {actions.map((a) => <Action key={a.label} label={a.label} onPress={a.onPress} />)}
      </ScrollView>

      {we.exercise.notes && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: colors.accent }}>
          <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>EXERCISE NOTES</Text>
          <Text style={{ color: colors.text, marginTop: 2 }}>{we.exercise.notes}</Text>
        </View>
      )}
      {we.note && <Text style={{ color: colors.textDim, fontStyle: 'italic', marginBottom: 8 }}>Today: {we.note}</Text>}

      <View style={rowStyle}>
        <Text style={[head, { width: 36 }]}>Set</Text>
        <Text style={[head, { flex: 1.3 }]}>Previous</Text>
        {mode !== 'none' && <Text style={[head, { flex: 1 }]}>{weightHead}{we.exercise.laterality === 'unilateral' ? '/side' : ''}</Text>}
        <Text style={[head, { flex: 1 }]}>Reps</Text>
        <Text style={[head, { width: 44 }]}>✓</Text>
      </View>

      {we.sets.map((s) => {
        const workingIdx = working.indexOf(s);
        const prev = s.isWarmup ? undefined : we.previous[workingIdx];
        const isSel = (f: Field) => sel?.setId === s.id && sel.field === f;
        const prevW = prev ? weightText(prev.weightKg, mode, unit) : '';
        return (
          <SwipeRow key={s.id} onDelete={() => onDelete(s)}>
            <View style={[rowStyle, { backgroundColor: s.completedAt ? mixHex(colors.success, colors.bg, 0.86) : colors.bg, borderRadius: 10 }]}>
              <View style={{ width: 36, alignItems: 'center' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: s.isWarmup ? '#F5B400' : colors.text, fontWeight: '700' }}>{s.isWarmup ? 'W' : workingIdx + 1}</Text>
                </View>
              </View>
              <Text style={{ flex: 1.3, color: colors.textDim, fontSize: 13, textAlign: 'center' }}>
                {prev ? `${prevW ? `${prevW} × ` : ''}${prev.reps}${prevW ? '' : ' reps'}` : '–'}
              </Text>
              {mode !== 'none' && (
                <View style={{ flex: 1 }}>
                  <Cell value={s.weightKg != null ? weightText(s.weightKg, mode, unit) : ''} active={isSel('weight')} onPress={() => onSelect(s, 'weight')} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Cell value={s.reps != null ? String(s.reps) : ''} active={isSel('reps')} onPress={() => onSelect(s, 'reps')} />
                {s.rir != null && (
                  <View style={{ position: 'absolute', right: 0, bottom: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: RIR_COLORS[s.rir], alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#0B0D17' }}>{s.rir === 5 ? '5+' : s.rir}</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => onToggle(s)} hitSlop={6} style={{ width: 44, alignItems: 'center' }}>
                <View style={{ width: 30, height: 30, borderRadius: 8, borderWidth: 2, borderColor: s.completedAt ? colors.success : colors.border, backgroundColor: s.completedAt ? colors.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {s.completedAt ? <Text style={{ color: '#0B0D17', fontWeight: '900' }}>✓</Text> : null}
                </View>
              </Pressable>
            </View>
          </SwipeRow>
        );
      })}

      <Pressable onPress={onAddSet} style={{ paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ color: colors.accent, fontWeight: '700' }}>+ Add set</Text>
      </Pressable>
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
