import { Text, View } from 'react-native';
import { styles } from '../../components/ui';

export default function Stats() {
  return (
    <View style={[styles.screen, styles.content]}>
      <Text style={styles.dim}>Rankings arrive in step 5.</Text>
    </View>
  );
}
