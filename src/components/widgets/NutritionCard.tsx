import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { showAlert } from '../Dialog';
import { useSQLiteContext } from 'expo-sqlite';
import { localDate, mealForTime, MEAL_LABEL, MEALS, sumMacros, type Meal } from '../../domain/meals';
import { clearMeal, copyFood, deleteFood, foodForDate, listFavorites, toggleFavorite, updateFood, type FoodEntry as LoggedFood } from '../../repo/food';
import { saveRecipe } from '../../repo/recipes';
import { EntryModal } from '../EntryModal';
import { Icon } from '../Icon';
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

  const [saveFor, setSaveFor] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<LoggedFood | null>(null);
  const [favs, bumpFavs] = useLoad(() => listFavorites(db), [db]);
  const itemMenu = (f: LoggedFood) => {
    const fav = (favs ?? []).some((x) => x.name === f.name);
    showAlert(f.name, `${Math.round(f.calories)} kcal · P ${Math.round(f.proteinG)} · F ${Math.round(f.fatG)} · C ${Math.round(f.carbsG)}`, [
      { text: 'Edit amount', onPress: () => setEditing(f) },
      { text: fav ? 'Remove from favorites' : '★ Add to favorites', onPress: async () => { await toggleFavorite(db, f); bumpFavs(); } },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteFood(db, f.id); bump(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const shift = (days: number) => {
    const [y, mo, d] = date.split('-').map(Number);
    return localDate(new Date(y, mo - 1, d), days);
  };
  const today = localDate();
  const copy = async (from: string, to: string, m?: Meal) => {
    const n = await copyFood(db, from, to, m);
    if (!n) showAlert('Nothing to copy', m ? `${MEAL_LABEL[m]} is empty on that day.` : 'Nothing was logged that day.');
    bump();
  };
  const menu = (m: Meal, hasItems: boolean) => showAlert(MEAL_LABEL[m], undefined, [
    { text: `Copy ${MEAL_LABEL[m].toLowerCase()} from the day before`, onPress: () => copy(shift(-1), date, m) },
    ...(hasItems ? [
      ...(date !== today ? [{ text: 'Copy to today', onPress: () => copy(date, today, m) }] : [{ text: 'Copy to tomorrow', onPress: () => copy(date, shift(1), m) }]),
      { text: 'Save as meal', onPress: () => setSaveFor(m) },
      { text: 'Clear meal', style: 'destructive' as const, onPress: async () => { await clearMeal(db, date, m); bump(); } },
    ] : []),
    { text: 'Cancel', style: 'cancel' as const },
  ]);

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
      {food && food.length === 0 && (
        <Pressable onPress={() => copy(shift(-1), date)} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Copy everything from the day before</Text>
        </Pressable>
      )}
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
              <Pressable onPress={() => menu(m, items.length > 0)} hitSlop={8} style={{ width: 32, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                <Icon name="more" size={20} color={colors.textDim} />
              </Pressable>
              <Pressable onPress={() => setMeal(m)} hitSlop={8}
                style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.accent, fontSize: 20, fontWeight: '700' }}>+</Text>
              </Pressable>
            </View>
            {isOpen && items.map((f) => (
              <Pressable key={f.id} onPress={() => itemMenu(f)} onLongPress={() => remove(f.id, f.name)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 8 }}>
                <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{(favs ?? []).some((x) => x.name === f.name) ? '★ ' : ''}{f.name}</Text>
                <Text style={styles.dim}>
                  {Math.round(f.calories)} kcal · P{Math.round(f.proteinG)} F{Math.round(f.fatG)} C{Math.round(f.carbsG)}
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
      {(food?.length ?? 0) > 0 && <Text style={[styles.dim, { fontSize: 12, textAlign: 'center' }]}>Tap a meal to see its foods · tap a food to edit, favorite or delete it</Text>}
      <EntryModal
        visible={saveFor != null}
        title="Save as meal"
        fields={[{ key: 'name', label: 'Name', initial: saveFor ? `My ${MEAL_LABEL[saveFor].toLowerCase()}` : '' }]}
        onClose={() => setSaveFor(null)}
        onSave={async (v) => {
          const items = (food ?? []).filter((f) => f.meal === saveFor);
          await saveRecipe(db, null, { name: v.name?.trim() || 'Meal', servings: 1, ingredients: items.map(({ name, calories, proteinG, fatG, carbsG }) => ({ name, calories, proteinG, fatG, carbsG })) });
          setSaveFor(null);
          bump();
          showAlert('Saved', 'Find it under Saved meals & recipes to log it in one tap.');
        }}
      />
      <EntryModal
        visible={editing != null}
        title={editing ? `Edit ${editing.name}` : ''}
        fields={editing ? [
          { key: 'x', label: 'Amount (× what you logged, e.g. 1.5 or 0.5)', numeric: true, initial: '1' },
          { key: 'kcal', label: 'Calories (kcal)', numeric: true, initial: String(Math.round(editing.calories)) },
          { key: 'p', label: 'Protein (g)', numeric: true, initial: String(Math.round(editing.proteinG * 10) / 10) },
          { key: 'f', label: 'Fat (g)', numeric: true, initial: String(Math.round(editing.fatG * 10) / 10) },
          { key: 'c', label: 'Carbs (g)', numeric: true, initial: String(Math.round(editing.carbsG * 10) / 10) },
        ] : []}
        onClose={() => setEditing(null)}
        onSave={async (v) => {
          if (!editing) return;
          const n = (k: string) => { const x = parseFloat((v[k] ?? '').replace(',', '.')); return Number.isFinite(x) && x >= 0 ? x : null; };
          const x = n('x') ?? 1;
          await updateFood(db, editing.id, {
            name: editing.name, calories: (n('kcal') ?? editing.calories) * x,
            proteinG: (n('p') ?? editing.proteinG) * x, fatG: (n('f') ?? editing.fatG) * x, carbsG: (n('c') ?? editing.carbsG) * x,
          });
          setEditing(null);
          bump();
        }}
      />
      <FoodEntry date={date} meal={meal} onClose={() => setMeal(null)} onSaved={() => { setMeal(null); bump(); }} />
    </WidgetCard>
  );
}
