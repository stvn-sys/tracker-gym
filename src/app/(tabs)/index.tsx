import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Card, SectionTitle, styles } from '../../components/ui';
import { listRoutines, routineForWeekday, type Routine } from '../../repo/routines';
import { colors } from '../../theme/colors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Home() {
  const db = useSQLiteContext();
  const [routines, setRoutines] = useState<Routine[]>([]);
  useEffect(() => { listRoutines(db).then(setRoutines); }, [db]);

  const today = new Date().getDay();
  const wod = routineForWeekday(routines, today);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ borderColor: colors.accent }}>
        <Text style={styles.dim}>Workout of the day · {DAYS[today]}</Text>
        <Text style={[styles.text, { fontSize: 24, fontWeight: '800', marginVertical: 4 }]}>
          {wod ? wod.name : 'Rest day'}
        </Text>
        {wod && <Text style={styles.dim}>{wod.exercises.map((e) => e.exerciseName).join(' · ')}</Text>}
      </Card>

      <SectionTitle>Routines</SectionTitle>
      {routines.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[styles.text, { fontWeight: '700' }]}>{r.name}</Text>
            <Text style={{ color: colors.accent }}>{r.weekdays.map((d) => DAYS[d]).join(' + ') || 'Unassigned'}</Text>
          </View>
          <Text style={styles.dim}>{r.exercises.length} exercises</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
