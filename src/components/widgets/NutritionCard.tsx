import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
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
  const [food, bump] = useLoad(() => foodForDate(db, date), [db, date]);

  const remove = (id: string, name: string) => Alert.alert(`Delete ${name}?`, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteFood(db, id); bump(); } },
  ]);

  return (
    <WidgetCard title="Nutrition">
      <Pressable onPress={() => setMeal(mealForTime())}
        style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ color: '#06121F', fontWeight: '800', fontSize: 16 }}>Quick Add · {MEAL_LABEL[mealForTime()]}</Text>
      </Pressable>
      {MEALS.map((m) => {
        const items = (food ?? []).filter((f) => f.meal === m);
        const kcal = sumMacros(items).calories;
        return (
          <View key={m} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.text, { fontWeight: '700' }]}>{MEAL_LABEL[m]}</Text>
                <Text style={{ color: colors.textDim, fontSize: 12 }}>{MEAL_HINT[m]}{kcal ? ` · ${Math.round(kcal)} kcal` : ''}</Text>
              </View>
              <Pressable onPress={() => setMeal(m)} hitSlop={8}
                style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.accent, fontSize: 20, fontWeight: '700' }}>+</Text>
              </Pressable>
            </View>
            {items.map((f) => (
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
      {(food?.length ?? 0) > 0 && <Text style={[styles.dim, { fontSize: 12, textAlign: 'center' }]}>Long-press an item to delete it</Text>}
      <FoodEntry date={date} meal={meal} onClose={() => setMeal(null)} onSaved={() => { setMeal(null); bump(); }} />
    </WidgetCard>
  );
}
