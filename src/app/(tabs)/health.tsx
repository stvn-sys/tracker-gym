import { ScrollView, Text, View } from 'react-native';
import { CardList } from '../../components/CardList';
import { useSubTab } from '../../components/SubTabs';
import { styles } from '../../components/ui';
import { MetricCard } from '../../components/widgets/MetricCard';
import { SleepCard } from '../../components/widgets/SleepCard';
import { WeightCard } from '../../components/widgets/WeightCard';
import { METRICS, VITALS } from '../../data/metrics';

export default function Health() {
  const sub = useSubTab('health');
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 40 }]}>
      {sub === 'Overview' && (
        <CardList
          page="health"
          cards={[
            { id: 'steps', title: 'Steps', render: () => <MetricCard type="steps" /> },
            { id: 'weight', title: 'Weight', render: () => <WeightCard /> },
            { id: 'sleep', title: 'Sleep', render: () => <SleepCard /> },
            { id: 'vitals-title', title: 'Vitals heading', render: () => <Text style={[styles.section, { marginTop: 4 }]}>Vitals</Text> },
            ...VITALS.map((v) => ({ id: v, title: METRICS[v].label, render: () => <MetricCard type={v} /> })),
          ]}
        />
      )}
      {sub === 'Activity' && <MetricCard type="steps" />}
      {sub === 'Weight' && <WeightCard />}
      {sub === 'Sleep' && <SleepCard />}
      {sub === 'Vitals' && <View style={{ gap: 12 }}>{VITALS.map((v) => <MetricCard key={v} type={v} />)}</View>}
    </ScrollView>
  );
}
