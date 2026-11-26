import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors } from '../theme/colors';

/**
 * In-app replacement for Alert.alert. Same call shape, but rendered by the app
 * itself so it also works in a browser (where native alerts are unavailable).
 */
export interface DialogButton { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }
interface DialogState { title: string; message?: string; buttons: DialogButton[] }

let push: ((d: DialogState) => void) | null = null;

export function showAlert(title: string, message?: string, buttons?: DialogButton[]) {
  push?.({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] });
}

/** Mount once near the root of the app. */
export function DialogHost() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  useEffect(() => {
    push = setDialog;
    return () => { push = null; };
  }, []);
  if (!dialog) return null;

  const close = (b?: DialogButton) => { setDialog(null); b?.onPress?.(); };
  const cancel = dialog.buttons.find((b) => b.style === 'cancel');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => close(cancel)}>
      <Pressable style={{ flex: 1, backgroundColor: '#000b', justifyContent: 'center', padding: 28 }} onPress={() => close(cancel)}>
        <Pressable style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{dialog.title}</Text>
          {dialog.message ? <Text style={{ color: colors.textDim, fontSize: 15, lineHeight: 21 }}>{dialog.message}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {dialog.buttons.map((b) => (
              <Pressable key={b.text} onPress={() => close(b)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: b.style === 'cancel' ? 'transparent' : b.style === 'destructive' ? colors.danger : colors.accent }}>
                <Text style={{ fontWeight: '800', color: b.style === 'cancel' ? colors.textDim : '#0B0D17' }}>{b.text}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
