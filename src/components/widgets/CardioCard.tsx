import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { localDate } from '../../domain/meals';
import { CARDIO_KINDS, cardioBetween, deleteCardio, upsertCardio } from '../../repo/cardio';
import { getGoals } from '../../repo/kv';
import { colors } from '../../theme/colors';
import { showAlert } from '../Dialog';
import { Button, Chip, ChipRow, inputStyle, styles } from '../ui';
import { useKeyboardHeight } from '../useKeyboardHeight';
import { usePrefs } from '../Prefs';
import { Bar, BigValue, useLoad, WidgetCard } from './common';

/** Cardio minutes today and this week (vs weekly goal), recent sessions, quick log. */
export function CardioCard({ date = localDate() }: { date?: string }) {
  const db = useSQLiteContext();
  const { prefs } = usePrefs();
  const [open, setOpen] = useState(false);
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  const back = (day.getDay() - prefs.weekStart + 7) % 7;
  const weekStart = localDate(day, -back);
  const [data, bump] = useLoad(async () => ({
    week: await cardioBetween(db, weekStart, localDate(day, 6 - back)),
    goals: await getGoals(db),
  }), [db, date, weekStart]);
  const week = data?.week ?? [];
  const today = week.filter((c) => c.date === date).reduce((a, c) => a + c.minutes, 0);
  const total = week.reduce((a, c) => a + c.minutes, 0);
  const goal = data?.goals.cardioMinWeek ?? 150;

  return (
    <WidgetCard title="Cardio" action="+ Log" onAction={() => setOpen(true)}>
      <BigValue value={String(Math.round(today))} unit="min" sub={`${Math.round(total)} / ${goal} min this week`} />
      <Bar value={total / goal} color={colors.success} />
      {week.slice(0, 3).map((c) => (
        <Pressable key={c.id} onLongPress={() => showAlert(`Delete ${c.kind}?`, undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCardio(db, c.id); bump(); } },
        ])} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.text} numberOfLines={1}>{c.kind}</Text>
          <Text style={styles.dim}>{new Date(c.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })} · {Math.round(c.minutes)} min</Text>
        </Pressable>
      ))}
      {open && <LogCardio date={date} onClose={() => setOpen(false)} onDone={() => { setOpen(false); bump(); }} />}
    </WidgetCard>
  );
}

function LogCardio({ date, onClose, onDone }: { date: string; onClose: () => void; onDone: () => void }) {
  const db = useSQLiteContext();
  const keyboard = useKeyboardHeight();
  const [kind, setKind] = useState('Walking');
  const [minutes, setMinutes] = useState('');
  const save = async () => {
    const n = parseFloat(minutes.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > 1440) return;
    await upsertCardio(db, { date, startTime: null, minutes: n, kind, kcal: null, distanceM: null, source: 'manual' });
    onDone();
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000a' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12, marginBottom: keyboard }}>
        <Text style={[styles.section, { marginTop: 0 }]}>Log cardio</Text>
        <ChipRow wrap>{CARDIO_KINDS.map((k) => <Chip key={k} label={k} active={kind === k} onPress={() => setKind(k)} />)}</ChipRow>
        <TextInput value={minutes} onChangeText={setMinutes} keyboardType="decimal-pad" placeholder="Minutes" placeholderTextColor={colors.textDim} style={inputStyle} autoFocus />
        <Button label="Save" onPress={save} />
      </View>
    </Modal>
  );
}
