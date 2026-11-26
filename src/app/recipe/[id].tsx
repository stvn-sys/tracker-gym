import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { showAlert } from '../../components/Dialog';
import { EntryModal, num } from '../../components/EntryModal';
import { Button, Card, inputStyle, SectionTitle, styles } from '../../components/ui';
import { sumMacros } from '../../domain/meals';
import { deleteRecipe, getRecipe, perServing, saveRecipe, type Ingredient } from '../../repo/recipes';
import { colors } from '../../theme/colors';

const line = (m: { calories: number; proteinG: number; fatG: number; carbsG: number }) =>
  `${Math.round(m.calories)} kcal · P${Math.round(m.proteinG)} F${Math.round(m.fatG)} C${Math.round(m.carbsG)}`;

export default function RecipeEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isNew) return;
    getRecipe(db, id).then((r) => {
      if (!r) return;
      setName(r.name);
      setServings(String(r.servings));
      setIngredients(r.ingredients);
    });
  }, [db, id, isNew]);

  const n = num(servings) ?? 1;
  const total = sumMacros(ingredients);
  const each = perServing({ servings: n, ingredients });

  const save = async () => {
    if (!name.trim()) { showAlert('Give the recipe a name'); return; }
    if (!ingredients.length) { showAlert('Add at least one ingredient'); return; }
    await saveRecipe(db, isNew ? null : id, { name, servings: n > 0 ? n : 1, ingredients });
    router.back();
  };

  const remove = () => showAlert(`Delete ${name}?`, 'Meals you already logged stay in your diary.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRecipe(db, id); router.back(); } },
  ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'New recipe' : 'Edit recipe' }} />
      <TextInput value={name} onChangeText={setName} placeholder="Recipe name" placeholderTextColor={colors.textDim}
        style={[inputStyle, { fontSize: 18, fontWeight: '700' }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[styles.text, { flex: 1 }]}>Servings this makes</Text>
        <TextInput value={servings} onChangeText={setServings} keyboardType="decimal-pad" style={[inputStyle, { width: 90, textAlign: 'right' }]} />
      </View>

      <SectionTitle>Ingredients</SectionTitle>
      {ingredients.map((ing, i) => (
        <Card key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.text, { fontWeight: '700' }]}>{ing.name}</Text>
            <Text style={styles.dim}>{line(ing)}</Text>
          </View>
          <Pressable onPress={() => setIngredients((l) => l.filter((_, j) => j !== i))} hitSlop={8}
            style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.danger, fontWeight: '800' }}>✕</Text>
          </Pressable>
        </Card>
      ))}
      <Button label="+ Add ingredient" variant="ghost" onPress={() => setAdding(true)} />

      {ingredients.length > 0 && (
        <Card style={{ gap: 4 }}>
          <Text style={styles.dim}>Whole recipe</Text>
          <Text style={styles.text}>{line(total)}</Text>
          <Text style={[styles.dim, { marginTop: 6 }]}>Per serving</Text>
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>{line(each)}</Text>
        </Card>
      )}

      <View style={{ gap: 10, marginTop: 12 }}>
        <Button label={isNew ? 'Create recipe' : 'Save'} onPress={save} />
        {!isNew && <Button label="Delete recipe" variant="danger" onPress={remove} />}
      </View>

      <EntryModal
        visible={adding}
        title="Add ingredient"
        fields={[
          { key: 'name', label: 'Ingredient', placeholder: 'e.g. 200 g chicken breast' },
          { key: 'kcal', label: 'Calories (kcal)', numeric: true },
          { key: 'p', label: 'Protein (g)', numeric: true },
          { key: 'f', label: 'Fat (g)', numeric: true },
          { key: 'c', label: 'Carbs (g)', numeric: true },
        ]}
        onClose={() => setAdding(false)}
        onSave={(v) => {
          const p = num(v.p) ?? 0, f = num(v.f) ?? 0, c = num(v.c) ?? 0;
          const kcal = num(v.kcal) ?? Math.round(p * 4 + f * 9 + c * 4);
          if (!v.name?.trim() || kcal < 0) return;
          setIngredients((l) => [...l, { name: v.name.trim(), calories: kcal, proteinG: p, fatG: f, carbsG: c }]);
          setAdding(false);
        }}
      />
    </ScrollView>
  );
}
