import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { FoodSearch } from '../food/FoodSearch';
import { useSQLiteContext } from 'expo-sqlite';
import { MEAL_LABEL, type Meal } from '../../domain/meals';
import { addFood, recentFoods, type FoodInput } from '../../repo/food';
import { colors } from '../../theme/colors';
import { EntryModal, num } from '../EntryModal';

/** Add-food sheet: one-tap recent foods, or type calories + macros. */
export function FoodEntry({ date, meal, onClose, onSaved }: { date: string; meal: Meal | null; onClose: () => void; onSaved: () => void }) {
  const db = useSQLiteContext();
  const [recent, setRecent] = useState<FoodInput[]>([]);
  useEffect(() => { if (meal) recentFoods(db).then(setRecent); }, [db, meal]);

  // Opens in the food database search; manual entry is a button there.
  const [manual, setManual] = useState(false);
  const [scanFirst, setScanFirst] = useState(false);

  const save = async (f: FoodInput, toMeal: Meal | null = meal) => {
    if (!toMeal) return;
    await addFood(db, date, toMeal, f);
    setManual(false);
    onSaved();
  };

  const close = () => { setManual(false); setScanFirst(false); onClose(); };
  if (meal && !manual) {
    return <FoodSearch meal={meal} scan={scanFirst} recent={recent} onAdd={(m, f) => save(f, m)} onClose={close} onManual={() => setManual(true)} />;
  }

  return (
    <EntryModal
      visible={meal !== null}
      title={meal ? `Add to ${MEAL_LABEL[meal]}` : ''}
      fields={[
        { key: 'name', label: 'Name (optional)', placeholder: 'e.g. Greek yoghurt' },
        { key: 'kcal', label: 'Calories (kcal)', numeric: true },
        { key: 'p', label: 'Protein (g)', numeric: true },
        { key: 'f', label: 'Fat (g)', numeric: true },
        { key: 'c', label: 'Carbs (g)', numeric: true },
      ]}
      onClose={close}
      onSave={(v) => {
        const p = num(v.p) ?? 0, f = num(v.f) ?? 0, c = num(v.c) ?? 0;
        // If calories are left empty, estimate them from macros (4/9/4 kcal per g).
        const kcal = num(v.kcal) ?? Math.round(p * 4 + f * 9 + c * 4);
        if (kcal <= 0) return;
        save({ name: v.name ?? '', calories: kcal, proteinG: p, fatG: f, carbsG: c });
      }}
    >
      <Pressable onPress={() => setManual(false)} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
        <Text style={{ color: colors.accent, fontWeight: '700' }}>‹ Back to food search</Text>
      </Pressable>
    </EntryModal>
  );
}

