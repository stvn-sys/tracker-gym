import { ScrollView, View } from 'react-native';
import { LibraryView } from '../../components/fitness/LibraryView';
import { LogView } from '../../components/fitness/LogView';
import { RoutinesView } from '../../components/fitness/RoutinesView';
import { useSubTab } from '../../components/SubTabs';
import { styles } from '../../components/ui';

export default function Fitness() {
  const section = useSubTab('fitness');
  if (section === 'Library') return <View style={styles.screen}><LibraryView /></View>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      {section === 'Log' ? <LogView /> : <RoutinesView />}
    </ScrollView>
  );
}
