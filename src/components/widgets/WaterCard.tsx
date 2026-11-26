import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { bottlesToGoal } from '../../domain/meals';
import { getGoals } from '../../repo/kv';
import { addBottle, deleteBottle, listBottles, logWater, undoWater, waterOn } from '../../repo/water';
import { colors } from '../../theme/colors';
import { EntryModal, num } from '../EntryModal';
import { styles } from '../ui';
import { Bar, useLoad, WidgetCard } from './common';

const WATER = '#38BDF8';
const fmtMl = (ml: number) => (ml >= 1000 ? `${Math.round(ml / 100) / 10} L` : `${Math.round(ml)} ml`);

/** Tap a bottle to log it. Shows how many of each bottle are left to hit the goal. */
export function WaterCard({ date }: { date: string }) {
  const db = useSQLiteContext();
  const [adding, setAdding] = useState(false);
  const [data, bump] = useLoad(async () => ({
    total: await waterOn(db, date), bottles: await listBottles(db), goals: await getGoals(db),
  }), [db, date]);
  if (!data) return <WidgetCard title="Water"><View style={{ height: 80 }} /></WidgetCard>;

  const goal = data.goals.waterMl;
  const remaining = goal - data.total;

  const removeBottle = (id: string, name: string) => Alert.alert(`Remove "${name}"?`, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { await deleteBottle(db, id); bump(); } },
  ]);

  return (
    <WidgetCard title="Water" action="Undo" onAction={async () => { await undoWater(db, date); bump(); }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>
          {fmtMl(data.total)}<Text style={{ fontSize: 15, color: colors.textDim }}> / {fmtMl(goal)}</Text>
        </Text>
        <Text style={{ color: remaining > 0 ? colors.textDim : colors.success, fontWeight: '700' }}>
          {remaining > 0 ? `${fmtMl(remaining)} to go` : 'Goal reached 💧'}
        </Text>
      </View>
      <Bar value={Math.min(1, data.total / goal)} color={WATER} height={10} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {data.bottles.map((b) => (
          <Pressable key={b.id} onPress={async () => { await logWater(db, date, b.ml); bump(); }} onLongPress={() => removeBottle(b.id, b.name)}
            style={{ flexGrow: 1, minWidth: '45%', padding: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: WATER, fontWeight: '800' }}>+ {fmtMl(b.ml)}</Text>
            <Text style={{ color: colors.text, fontSize: 13 }}>{b.name}</Text>
            {remaining > 0 && (
              <Text style={{ color: colors.textDim, fontSize: 12 }}>{bottlesToGoal(remaining, b.ml)}× to hit goal</Text>
            )}
          </Pressable>
        ))}
        <Pressable onPress={() => setAdding(true)}
          style={{ flexGrow: 1, minWidth: '45%', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textDim, fontWeight: '700' }}>+ Custom bottle</Text>
        </Pressable>
      </View>
      <Text style={[styles.dim, { fontSize: 12, textAlign: 'center' }]}>Long-press a bottle to remove it</Text>

      <EntryModal
        visible={adding}
        title="New bottle size"
        fields={[{ key: 'name', label: 'Name', placeholder: 'e.g. Gym shaker' }, { key: 'ml', label: 'Size (ml)', numeric: true }]}
        onClose={() => setAdding(false)}
        onSave={async (v) => {
          const ml = num(v.ml);
          if (!ml || ml <= 0) return;
          await addBottle(db, v.name ?? '', ml);
          setAdding(false);
          bump();
        }}
      />
    </WidgetCard>
  );
}
