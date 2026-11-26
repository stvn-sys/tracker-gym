import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { Button, inputStyle, styles } from './ui';

export interface Field {
  key: string;
  label: string;
  placeholder?: string;
  numeric?: boolean;
  initial?: string;
}

interface Props {
  visible: boolean;
  title: string;
  fields: Field[];
  onSave: (values: Record<string, string>) => void;
  onClose: () => void;
  /** Extra content above the fields (e.g. recent foods). */
  children?: ReactNode;
}

/** A small bottom-sheet form used for every quick add in the app. */
export function EntryModal(props: Props) {
  // Re-mount the form each time it opens so it starts from `initial` values.
  if (!props.visible) return null;
  return <EntryForm {...props} />;
}

function EntryForm({ title, fields, onSave, onClose, children }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, f.initial ?? ''])),
  );
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000a' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12, maxHeight: '85%' }}>
        <Text style={[styles.section, { marginTop: 0 }]}>{title}</Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
          {children}
          {fields.map((f, i) => (
            <View key={f.key} style={{ gap: 4 }}>
              <Text style={styles.dim}>{f.label}</Text>
              <TextInput
                value={values[f.key]}
                onChangeText={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                keyboardType={f.numeric ? 'decimal-pad' : 'default'}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textDim}
                autoFocus={i === 0}
                style={inputStyle}
              />
            </View>
          ))}
        </ScrollView>
        <Button label="Save" onPress={() => onSave(values)} />
      </View>
    </Modal>
  );
}

/** Parses "72,5" or "72.5"; returns null for empty/invalid input. */
export const num = (s: string | undefined): number | null => {
  if (!s) return null;
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};
