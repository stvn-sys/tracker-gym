import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { showAlert } from '../Dialog';
import { useSQLiteContext } from 'expo-sqlite';
import { mealForTime, MEAL_LABEL, MEALS, sumMacros, type Meal } from '../../domain/meals';
import { deleteFood, foodForDate } from '../../repo/food';
import { colors } from '../../theme/colors';
import { styles } from '../ui';
import { useLoad, WidgetCard } from './common';
import { FoodEntry } from './FoodEntry';

const MEAL_HINT: Record<Meal, string> = {
  breakfast: 'before 12:00', lunch: '12:00–17:00', dinner: '17:00–20:00', snacks: '20:00–00:00',
};

export function NutritionCard({ date }: { date: string }) {
  const db = useSQLiteContext();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [open, setOpen] = useState<Meal | null>(null);
  const [food, bump] = useLoad(() => foodForDate(db, date), [db, date]);

  const remove = (id: string, name: string) => showAlert(`Delete ${name}?`, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteFood(db, id); bump(); } },
  ]);

  return (
    <WidgetCard title="Meals">
      <Pressable onPress={() => setMeal(mealForTime())}
        style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ color: '#06121F', fontWeight: '800', fontSize: 16 }}>Quick Add · {MEAL_LABEL[mealForTime()]}</Text>
      </Pressable>
      {MEALS.map((m) => {
        const items = (food ?? []).filter((f) => f.meal === m);
        const t = sumMacros(items);
        const isOpen = open === m;
        return (
          <View key={m} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable style={{ flex: 1 }} onPress={() => setOpen(isOpen ? null : m)} disabled={!items.length}>
                <Text style={[styles.text, { fontWeight: '700' }]}>
                  {MEAL_LABEL[m]}
                  {items.length ? <Text style={{ color: colors.textDim, fontWeight: '400', fontSize: 13 }}>  {isOpen ? '▾' : '▸'} {items.length} {items.length === 1 ? 'item' : 'items'}</Text> : null}
                </Text>
                {items.length ? (
                  <Text style={{ color: colors.textDim, fontSize: 13, marginTop: 2 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{Math.round(t.calories)} kcal</Text>
                    {'  '}P {Math.round(t.proteinG)} g · F {Math.round(t.fatG)} g · C {Math.round(t.carbsG)} g
                  </Text>
                ) : (
                  <Text style={{ color: colors.textDim, fontSize: 12 }}>{MEAL_HINT[m]} · nothing logged</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setMeal(m)} hitSlop={8}
                style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.accent, fontSize: 20, fontWeight: '700' }}>+</Text>
              </Pressable>
            </View>
            {isOpen && items.map((f) => (
              <Pressable key={f.id} onLongPress={() => remove(f.id, f.name)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 8 }}>
                <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{f.name}</Text>
                <Text style={styles.dim}>
                  {Math.round(f.calories)} kcal · P{Math.round(f.proteinG)} F{Math.round(f.fatG)} C{Math.round(f.carbsG)}
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
      {(food?.length ?? 0) > 0 && <Text style={[styles.dim, { fontSize: 12, textAlign: 'center' }]}>Tap a meal to see its foods · long-press a food to delete it</Text>}
      <FoodEntry date={date} meal={meal} onClose={() => setMeal(null)} onSaved={() => { setMeal(null); bump(); }} />
    </WidgetCard>
  );
}
