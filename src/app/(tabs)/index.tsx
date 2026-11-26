import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LineChart } from '../../components/LineChart';
import { useProfile } from '../../components/ProfileContext';
import { Card, inputStyle, SectionTitle, styles } from '../../components/ui';
import { formatWeight, fromDisplay } from '../../domain/units';
import { listBodyweight, logBodyweight, type BodyweightEntry } from '../../repo/bodyweight';
import { listRoutines, reorderRoutines, routineForWeekday, type Routine } from '../../repo/routines';
import { getActiveWorkout, startWorkout, type Workout } from '../../repo/workouts';
import { colors } from '../../theme/colors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Home() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [active, setActive] = useState<Workout | null>(null);
  const [bw, setBw] = useState<BodyweightEntry[]>([]);
  const [bwText, setBwText] = useState('');

  const reload = useCallback(() => {
    listRoutines(db).then(setRoutines);
    getActiveWorkout(db).then(setActive);
    listBodyweight(db).then(setBw);
  }, [db]);
  useFocusEffect(reload);

  const today = new Date().getDay();
  const wod = routineForWeekday(routines, today);

  const start = async (routineId: string | null) => {
    if (active) {
      Alert.alert('Workout in progress', 'Resume it, or finish/discard it first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume', onPress: () => openWorkout(active.id) },
      ]);
      return;
    }
    openWorkout(await startWorkout(db, routineId));
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= routines.length) return;
    const next = [...routines];
    [next[i], next[j]] = [next[j], next[i]];
    setRoutines(next);
    await reorderRoutines(db, next.map((r) => r.id));
  };

  const saveBw = async () => {
    const v = parseFloat(bwText.replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) return;
    await logBodyweight(db, Math.round(fromDisplay(v, profile.unit) * 100) / 100);
    setBwText('');
    listBodyweight(db).then(setBw);
  };

  const latest = bw[bw.length - 1];
  const first = bw[0];
  const change = latest && first && bw.length > 1 ? latest.weightKg - first.weightKg : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      {active && (
        <Pressable onPress={() => openWorkout(active.id)}>
          <Card style={{ borderColor: colors.success, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.success, fontWeight: '700' }}>Workout in progress</Text>
              <Text style={styles.text}>{active.name}</Text>
            </View>
            <Text style={{ color: colors.success, fontWeight: '800', fontSize: 16 }}>Resume ›</Text>
          </Card>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, borderColor: colors.accent, gap: 6 }}>
          <Text style={styles.dim}>Workout of the day · {DAYS[today]}</Text>
          <Text style={[styles.text, { fontSize: 24, fontWeight: '800' }]}>{wod ? wod.name : 'Rest day'}</Text>
          <Text style={styles.dim} numberOfLines={3}>
            {wod ? wod.exercises.map((e) => e.exerciseName).join(' · ') : 'Nothing scheduled. You can still start an empty workout.'}
          </Text>
          <Pressable onPress={() => start(wod?.id ?? null)}
            style={{ marginTop: 6, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: '#06121F', fontWeight: '800', fontSize: 16 }}>{wod ? 'Start workout' : 'Start empty workout'}</Text>
          </Pressable>
        </Card>
        <Pressable onPress={() => router.push('/history')}
          style={{ width: 84, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Text style={{ fontSize: 26, color: colors.text }}>⟲</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>History</Text>
        </Pressable>
      </View>

      <SectionTitle>Bodyweight</SectionTitle>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={[styles.text, { fontSize: 26, fontWeight: '800' }]}>{latest ? formatWeight(latest.weightKg, profile.unit) : '–'}</Text>
            <Text style={styles.dim}>{latest ? `Last logged ${latest.date}` : 'Log your weight to unlock rankings'}</Text>
          </View>
          {change != null && (
            <Text style={{ color: colors.textDim }}>{change >= 0 ? '+' : '−'}{formatWeight(Math.abs(change), profile.unit)} over {bw.length} logs</Text>
          )}
        </View>
        {bw.length > 1 && <LineChart points={bw.map((b, i) => ({ x: i, y: b.weightKg }))} height={56} />}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={bwText} onChangeText={setBwText} keyboardType="decimal-pad" onSubmitEditing={saveBw}
            placeholder={`Today's weight (${profile.unit})`} placeholderTextColor={colors.textDim} style={[inputStyle, { flex: 1, minWidth: 0 }]} />
          <Pressable onPress={saveBw} style={{ paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.surfaceAlt, justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.accent, fontWeight: '800' }}>Log</Text>
          </Pressable>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionTitle>Routines</SectionTitle>
        <Pressable onPress={() => router.push('/routine/new')} hitSlop={10}>
          <Text style={{ color: colors.accent, fontWeight: '700', marginTop: 8 }}>+ New</Text>
        </Pressable>
      </View>
      {routines.map((r, i) => (
        <Pressable key={r.id} onPress={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ gap: 2 }}>
              <Arrow label="▲" disabled={i === 0} onPress={() => move(i, -1)} />
              <Arrow label="▼" disabled={i === routines.length - 1} onPress={() => move(i, 1)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.text, { fontWeight: '700' }]}>{r.name}</Text>
              <Text style={{ color: colors.accent, fontSize: 13 }}>{r.weekdays.map((d) => DAYS[d]).join(' + ') || 'No days assigned'}</Text>
              <Text style={styles.dim}>{r.exercises.length} exercises</Text>
            </View>
            <Pressable onPress={() => start(r.id)} hitSlop={8}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.accent }}>
              <Text style={{ color: colors.accent, fontWeight: '700' }}>Start</Text>
            </Pressable>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const openWorkout = (id: string) => router.push({ pathname: '/workout/[id]', params: { id } });

function Arrow({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={{ opacity: disabled ? 0.2 : 1, paddingHorizontal: 4 }}>
      <Text style={{ color: colors.textDim, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}
