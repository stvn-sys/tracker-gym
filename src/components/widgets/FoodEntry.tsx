import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { MEAL_LABEL, type Meal } from '../../domain/meals';
import { addFood, recentFoods, type FoodInput } from '../../repo/food';
import { colors } from '../../theme/colors';
import { EntryModal, num } from '../EntryModal';
import { styles } from '../ui';

/** Add-food sheet: one-tap recent foods, or type calories + macros. */
export function FoodEntry({ date, meal, onClose, onSaved }: { date: string; meal: Meal | null; onClose: () => void; onSaved: () => void }) {
  const db = useSQLiteContext();
  const [recent, setRecent] = useState<FoodInput[]>([]);
  useEffect(() => { if (meal) recentFoods(db).then(setRecent); }, [db, meal]);

  const save = async (f: FoodInput) => {
    if (!meal) return;
    await addFood(db, date, meal, f);
    onSaved();
  };

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
      onClose={onClose}
      onSave={(v) => {
        const p = num(v.p) ?? 0, f = num(v.f) ?? 0, c = num(v.c) ?? 0;
        // If calories are left empty, estimate them from macros (4/9/4 kcal per g).
        const kcal = num(v.kcal) ?? Math.round(p * 4 + f * 9 + c * 4);
        if (kcal <= 0) return;
        save({ name: v.name ?? '', calories: kcal, proteinG: p, fatG: f, carbsG: c });
      }}
    >
      {recent.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={styles.dim}>Recent — tap to add</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {recent.map((r) => (
              <Pressable key={r.name} onPress={() => save(r)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.text, fontSize: 13 }}>{r.name}</Text>
                <Text style={{ color: colors.textDim, fontSize: 11 }}>{Math.round(r.calories)} kcal</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </EntryModal>
  );
}
