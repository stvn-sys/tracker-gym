import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { mealForTime, MEAL_LABEL, MEALS, type Meal } from '../../domain/meals';
import { addFood } from '../../repo/food';
import { listRecipes, perServing, type Recipe } from '../../repo/recipes';
import { colors } from '../../theme/colors';
import { showAlert } from '../Dialog';
import { Button, Card, Chip, ChipRow, inputStyle, styles } from '../ui';
import { useLoad } from '../widgets/common';

const macroLine = (m: { calories: number; proteinG: number; fatG: number; carbsG: number }) =>
  `${Math.round(m.calories)} kcal · P${Math.round(m.proteinG)} F${Math.round(m.fatG)} C${Math.round(m.carbsG)}`;

/** Saved recipes; log a number of servings to a meal in one tap. */
export function RecipesView({ date }: { date: string }) {
  const db = useSQLiteContext();
  const [recipes, bump] = useLoad(() => listRecipes(db), [db]);
  const [logging, setLogging] = useState<Recipe | null>(null);

  return (
    <View style={{ gap: 12 }}>
      <Pressable onPress={() => router.push('/recipe/new')}
        style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed', paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ color: colors.accent, fontWeight: '800' }}>+ New recipe</Text>
      </Pressable>
      {recipes?.length === 0 && (
        <Text style={styles.dim}>No recipes yet. Add the ingredients once, then log servings of it whenever you eat it.</Text>
      )}
      {recipes?.map((r) => (
        <Card key={r.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.text, { fontWeight: '800', fontSize: 17 }]}>{r.name}</Text>
              <Text style={styles.dim}>{r.ingredients.length} ingredients · {r.servings} {r.servings === 1 ? 'serving' : 'servings'}</Text>
            </View>
            <Pressable onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} hitSlop={8}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surfaceAlt }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Edit</Text>
            </Pressable>
          </View>
          <Text style={{ color: colors.accent }}>Per serving: {macroLine(perServing(r))}</Text>
          <Pressable onPress={() => setLogging(r)}
            style={{ marginTop: 4, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.accentDim }}>
            <Text style={{ color: colors.accent, fontWeight: '800' }}>Log a serving</Text>
          </Pressable>
        </Card>
      ))}
      {logging && <LogRecipe recipe={logging} date={date} onClose={() => setLogging(null)} onDone={() => { setLogging(null); bump(); }} />}
    </View>
  );
}

function LogRecipe({ recipe, date, onClose, onDone }: { recipe: Recipe; date: string; onClose: () => void; onDone: () => void }) {
  const db = useSQLiteContext();
  const [meal, setMeal] = useState<Meal>(mealForTime());
  const [servings, setServings] = useState('1');
  const n = parseFloat(servings.replace(',', '.'));
  const ps = perServing(recipe);
  const valid = Number.isFinite(n) && n > 0;

  const save = async () => {
    if (!valid) return;
    await addFood(db, date, meal, {
      name: n === 1 ? recipe.name : `${recipe.name} (${n}×)`,
      calories: ps.calories * n, proteinG: ps.proteinG * n, fatG: ps.fatG * n, carbsG: ps.carbsG * n,
    });
    showAlert('Logged', `${recipe.name} added to ${MEAL_LABEL[meal]}.`);
    onDone();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000a' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12 }}>
        <Text style={[styles.section, { marginTop: 0 }]}>Log {recipe.name}</Text>
        <Text style={styles.dim}>Meal</Text>
        <ChipRow wrap>
          {MEALS.map((m) => <Chip key={m} label={MEAL_LABEL[m]} active={meal === m} onPress={() => setMeal(m)} />)}
        </ChipRow>
        <Text style={styles.dim}>Servings</Text>
        <TextInput value={servings} onChangeText={setServings} keyboardType="decimal-pad" style={inputStyle} />
        {valid && <Text style={{ color: colors.accent }}>{macroLine({ calories: ps.calories * n, proteinG: ps.proteinG * n, fatG: ps.fatG * n, carbsG: ps.carbsG * n })}</Text>}
        <Button label="Add to log" onPress={save} />
      </View>
    </Modal>
  );
}
