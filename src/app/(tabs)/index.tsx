import { ScrollView } from 'react-native';
import { CardList } from '../../components/CardList';
import { styles } from '../../components/ui';
import { CaloriesCard } from '../../components/widgets/CaloriesCard';
import { MetricCard } from '../../components/widgets/MetricCard';
import { SleepCard } from '../../components/widgets/SleepCard';
import { WaterCard } from '../../components/widgets/WaterCard';
import { WeightCard } from '../../components/widgets/WeightCard';
import { WodCard } from '../../components/widgets/WodCard';
import { localDate } from '../../domain/meals';

export default function Today() {
  const today = localDate();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 40 }]}>
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
    </ScrollView>
  );
}
