import { useState } from 'react';
import { ScrollView } from 'react-native';
import { DateStrip } from '../../components/DateStrip';
import { CardList } from '../../components/CardList';
import { styles } from '../../components/ui';
import { CaloriesCard } from '../../components/widgets/CaloriesCard';
import { MetricCard } from '../../components/widgets/MetricCard';
import { SleepCard } from '../../components/widgets/SleepCard';
import { WaterCard } from '../../components/widgets/WaterCard';
import { WeightCard } from '../../components/widgets/WeightCard';
import { WodCard } from '../../components/widgets/WodCard';
import { RecoveryCard } from '../../components/widgets/RecoveryCard';
import { CardioCard } from '../../components/widgets/CardioCard';
import { localDate } from '../../domain/meals';

export default function Today() {
  const [base] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const today = localDate(base, offset);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 40 }]}>
      <DateStrip offset={offset} onChange={setOffset} />
      <CardList
        page="today"
        cards={[
          { id: 'wod', title: 'Workout of the day', render: () => <WodCard /> },
          { id: 'calories', title: 'Calories', render: () => <CaloriesCard date={today} quickAdd={offset === 0} /> },
          { id: 'steps', title: 'Steps', render: () => <MetricCard type="steps" /> },
          { id: 'weight', title: 'Weight', render: () => <WeightCard /> },
          { id: 'sleep', title: 'Sleep', render: () => <SleepCard /> },
          { id: 'water', title: 'Water', render: () => <WaterCard date={today} /> },
          { id: 'recovery', title: 'Recovery', render: () => <RecoveryCard /> },
          { id: 'cardio', title: 'Cardio', render: () => <CardioCard date={today} /> },
        ]}
      />
    </ScrollView>
  );
}
