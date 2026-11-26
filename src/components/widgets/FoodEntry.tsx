import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { FoodSearch } from '../food/FoodSearch';
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

  const [search, setSearch] = useState<'search' | 'scan' | null>(null);

  const save = async (f: FoodInput, toMeal: Meal | null = meal) => {
    if (!toMeal) return;
    await addFood(db, date, toMeal, f);
    setSearch(null);
    onSaved();
  };

  if (meal && search) {
    return <FoodSearch meal={meal} scan={search === 'scan'} onAdd={(m, f) => save(f, m)} onClose={() => setSearch(null)} />;
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
      onClose={onClose}
      onSave={(v) => {
        const p = num(v.p) ?? 0, f = num(v.f) ?? 0, c = num(v.c) ?? 0;
        // If calories are left empty, estimate them from macros (4/9/4 kcal per g).
        const kcal = num(v.kcal) ?? Math.round(p * 4 + f * 9 + c * 4);
        if (kcal <= 0) return;
        save({ name: v.name ?? '', calories: kcal, proteinG: p, fatG: f, carbsG: c });
      }}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setSearch('search')} style={bigBtn()}>
          <Text style={{ color: '#0B0B0D', fontWeight: '800' }}>Search food database</Text>
        </Pressable>
        {Platform.OS !== 'web' && (
          <Pressable onPress={() => setSearch('scan')} style={[bigBtn(), { flex: 0, paddingHorizontal: 16, backgroundColor: colors.surfaceAlt }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>Scan</Text>
          </Pressable>
        )}
      </View>
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
      <Text style={[styles.dim, { marginTop: 4 }]}>Or enter it yourself</Text>
    </EntryModal>
  );
}

const bigBtn = () => ({ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accent } as const);
