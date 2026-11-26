import { ScrollView, View } from 'react-native';
import { CardList } from '../../components/CardList';
import { RoutinesView } from '../../components/fitness/RoutinesView';
import { useSubTab } from '../../components/SubTabs';
import { SectionTitle, styles } from '../../components/ui';
import { CaloriesCard } from '../../components/widgets/CaloriesCard';
import { MetricCard } from '../../components/widgets/MetricCard';
import { SleepCard } from '../../components/widgets/SleepCard';
import { WaterCard } from '../../components/widgets/WaterCard';
import { WeightCard } from '../../components/widgets/WeightCard';
import { WodCard } from '../../components/widgets/WodCard';
import { localDate } from '../../domain/meals';

export default function Today() {
  const today = localDate();
  const sub = useSubTab('index');
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 40 }]}>
      {sub === 'Overview' && (
        <CardList
          page="today"
          cards={[
            { id: 'wod', title: 'Workout of the day', render: () => <WodCard /> },
            { id: 'calories', title: 'Calories', render: () => <CaloriesCard date={today} quickAdd /> },
            { id: 'steps', title: 'Steps', render: () => <MetricCard type="steps" /> },
            { id: 'weight', title: 'Weight', render: () => <WeightCard /> },
            { id: 'sleep', title: 'Sleep', render: () => <SleepCard /> },
            { id: 'water', title: 'Water', render: () => <WaterCard date={today} /> },
          ]}
        />
      )}
      {sub === 'Workout' && (
        <View style={{ gap: 12 }}>
          <WodCard />
          <SectionTitle>Other routines</SectionTitle>
          <RoutinesView />
        </View>
      )}
      {sub === 'Nutrition' && (
        <View style={{ gap: 12 }}>
          <CaloriesCard date={today} quickAdd />
          <WaterCard date={today} />
        </View>
      )}
      {sub === 'Body' && (
        <View style={{ gap: 12 }}>
          <MetricCard type="steps" />
          <WeightCard />
          <SleepCard />
        </View>
      )}
    </ScrollView>
  );
}
