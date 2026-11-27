import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ExerciseForm } from '../../components/ExerciseForm';

export default function ExerciseEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New exercise' : 'Edit exercise' }} />
      <ExerciseForm
        id={isNew ? null : id}
        onSaved={() => router.back()}
        onDeleted={() => router.back()}
        onDuplicated={(nid) => router.replace({ pathname: '/exercise/[id]', params: { id: nid } })}
        onViewProgress={isNew ? undefined : () => router.push({ pathname: '/progress/[id]', params: { id } })}
      />
    </>
  );
}
