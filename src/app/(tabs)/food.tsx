import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { RecipesView } from '../../components/food/RecipesView';
import { CardList } from '../../components/CardList';
import { styles } from '../../components/ui';
import { CaloriesCard } from '../../components/widgets/CaloriesCard';
import { NutritionCard } from '../../components/widgets/NutritionCard';
import { WaterCard } from '../../components/widgets/WaterCard';
import { localDate } from '../../domain/meals';
import { colors } from '../../theme/colors';

export default function Nutrition() {
  const [base] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const date = localDate(base, offset);
  const label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : offset === 1 ? 'Tomorrow' : prettyDay(date);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Arrow label="‹" onPress={() => setOffset((o) => o - 1)} />
        <Pressable onPress={() => setOffset(0)}><Text style={[styles.text, { fontWeight: '800', fontSize: 18 }]}>{label}</Text></Pressable>
        <Arrow label="›" onPress={() => setOffset((o) => o + 1)} />
      </View>
      <CardList
        page="nutrition"
        cards={[
          { id: 'summary', title: 'Summary', render: () => <CaloriesCard date={date} title="Summary" /> },
          { id: 'intake', title: 'Meals', render: () => <NutritionCard date={date} /> },
          { id: 'water', title: 'Water tracker', render: () => <WaterCard date={date} /> },
          { id: 'recipes', title: 'Recipes', render: () => (
            <View style={{ gap: 10 }}>
              <Text style={[styles.section, { marginTop: 4 }]}>Recipes</Text>
              <RecipesView date={date} />
            </View>
          ) },
        ]}
      />
    </ScrollView>
  );
}

function prettyDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function Arrow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 26, marginTop: -3 }}>{label}</Text>
    </Pressable>
  );
}
