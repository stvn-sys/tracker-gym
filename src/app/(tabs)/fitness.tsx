import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LibraryView } from '../../components/fitness/LibraryView';
import { LogView } from '../../components/fitness/LogView';
import { RanksView } from '../../components/fitness/RanksView';
import { RoutinesView } from '../../components/fitness/RoutinesView';
import { Chip, ChipRow, styles } from '../../components/ui';

const SECTIONS = ['Routines', 'Log', 'Library', 'Ranks'] as const;
type Section = (typeof SECTIONS)[number];

export default function Fitness() {
  const [section, setSection] = useState<Section>('Routines');
  return (
    <View style={styles.screen}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <ChipRow>
          {SECTIONS.map((s) => <Chip key={s} label={s} active={section === s} onPress={() => setSection(s)} />)}
        </ChipRow>
      </View>
      {section === 'Library' && <LibraryView />}
      {section === 'Ranks' && <RanksView />}
      {(section === 'Routines' || section === 'Log') && (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: 4, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
          {section === 'Routines' ? <RoutinesView /> : <LogView />}
        </ScrollView>
      )}
    </View>
  );
}
