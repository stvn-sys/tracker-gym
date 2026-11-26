import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { mealForTime, MEAL_LABEL, sumMacros, type Meal } from '../../domain/meals';
import { foodForDate } from '../../repo/food';
import { getGoals } from '../../repo/kv';
import { colors } from '../../theme/colors';
import { styles } from '../ui';
import { Bar, useLoad, WidgetCard } from './common';
import { FoodEntry } from './FoodEntry';

export const MACRO_COLORS = { protein: '#FF7A90', fat: '#F5B400', carbs: '#4FA8FF' };

/** Calories + macros vs goals. With quickAdd, a button logs to the meal for the current time. */
export function CaloriesCard({ date, quickAdd = false, title = 'Calories' }: { date: string; quickAdd?: boolean; title?: string }) {
  const db = useSQLiteContext();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [data, bump] = useLoad(async () => ({ food: await foodForDate(db, date), goals: await getGoals(db) }), [db, date]);
  if (!data) return <WidgetCard title={title}><View style={{ height: 80 }} /></WidgetCard>;

  const t = sumMacros(data.food);
  const g = data.goals;
  const left = g.calories - t.calories;

  return (
    <WidgetCard title={title} action={quickAdd ? `+ ${MEAL_LABEL[mealForTime()]}` : undefined} onAction={() => setMeal(mealForTime())}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>
          {Math.round(t.calories)}<Text style={{ fontSize: 15, color: colors.textDim }}> / {g.calories} kcal</Text>
        </Text>
        <Text style={{ color: left >= 0 ? colors.success : colors.danger, fontWeight: '700' }}>
          {Math.abs(Math.round(left))} {left >= 0 ? 'left' : 'over'}
        </Text>
      </View>
      <Bar value={t.calories / g.calories} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Macro label="Protein" value={t.proteinG} goal={g.proteinG} color={MACRO_COLORS.protein} />
        <Macro label="Fat" value={t.fatG} goal={g.fatG} color={MACRO_COLORS.fat} />
        <Macro label="Carbs" value={t.carbsG} goal={g.carbsG} color={MACRO_COLORS.carbs} />
      </View>
      <FoodEntry date={date} meal={meal} onClose={() => setMeal(null)} onSaved={() => { setMeal(null); bump(); }} />
    </WidgetCard>
  );
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.dim}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{Math.round(value)}<Text style={{ color: colors.textDim, fontWeight: '400' }}> / {goal} g</Text></Text>
      <Bar value={value / goal} color={color} height={6} />
    </View>
  );
}
