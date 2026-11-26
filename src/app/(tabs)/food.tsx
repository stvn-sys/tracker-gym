import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { DateStrip } from '../../components/DateStrip';
import { TargetsBanner } from '../../components/widgets/TargetsBanner';
import { RecipesView } from '../../components/food/RecipesView';
import { CardList } from '../../components/CardList';
import { styles } from '../../components/ui';
import { CaloriesCard } from '../../components/widgets/CaloriesCard';
import { NutritionCard } from '../../components/widgets/NutritionCard';
import { WaterCard } from '../../components/widgets/WaterCard';
import { localDate } from '../../domain/meals';

export default function Nutrition() {
  const [base] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const date = localDate(base, offset);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <DateStrip offset={offset} onChange={setOffset} />
      <TargetsBanner />
      <CardList
        page="nutrition"
        cards={[
          { id: 'summary', title: 'Summary', render: () => <CaloriesCard date={date} title="Summary" /> },
          { id: 'intake', title: 'Meals', render: () => <NutritionCard date={date} /> },
          { id: 'water', title: 'Water tracker', render: () => <WaterCard date={date} /> },
          { id: 'recipes', title: 'Saved meals & recipes', render: () => (
            <View style={{ gap: 10 }}>
              <Text style={[styles.section, { marginTop: 4 }]}>Saved meals & recipes</Text>
              <RecipesView date={date} />
            </View>
          ) },
        ]}
      />
    </ScrollView>
  );
}

