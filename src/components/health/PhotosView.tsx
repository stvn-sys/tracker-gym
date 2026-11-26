import { useState } from 'react';
import { Image, Modal, Platform, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { localDate } from '../../domain/meals';
import { addPhoto, deletePhoto, listPhotos, POSE_LABEL, POSES, type Pose, type ProgressPhoto } from '../../repo/photos';
import { colors } from '../../theme/colors';
import { showAlert } from '../Dialog';
import { Chip, ChipRow, styles } from '../ui';
import { PhotoCompare } from './PhotoCompare';
import { prettyDate, useLoad } from '../widgets/common';

const MAX_SIDE = 1080;

/** On web the picker ignores `quality`, so shrink big photos with a canvas before storing. */
async function shrinkOnWeb(dataUri: string): Promise<string> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return dataUri;
  const img = new window.Image();
  img.src = dataUri;
  await img.decode();
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

/** Progress photos stored in the local database, with a first-vs-latest comparison per pose. */
export function PhotosView() {
  const db = useSQLiteContext();
  const [pose, setPose] = useState<Pose>('front');
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null);
  const [photos, bump] = useLoad(() => listPhotos(db), [db]);

  const pick = async (camera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.5, base64: true };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { showAlert('Camera access needed', 'Allow camera access in your phone settings, or choose a photo from your gallery.'); return; }
    }
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const uri = a.uri.startsWith('data:') ? a.uri : a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri;
    await addPhoto(db, localDate(), pose, await shrinkOnWeb(uri));
    bump();
  };

  const ofPose = (photos ?? []).filter((p) => p.pose === pose);
  const byDate = new Map<string, ProgressPhoto[]>();
  for (const p of photos ?? []) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);

  return (
    <View style={{ gap: 12 }}>
      <ChipRow>
        {POSES.map((p) => <Chip key={p} label={POSE_LABEL[p]} active={pose === p} onPress={() => setPose(p)} />)}
      </ChipRow>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Big label={`+ ${POSE_LABEL[pose]} photo`} onPress={() => pick(false)} />
        {Platform.OS !== 'web' && <Big label="Take photo" onPress={() => pick(true)} />}
      </View>

      {ofPose.length >= 2 && <PhotoCompare key={pose} photos={ofPose} title={POSE_LABEL[pose]} />}

      {(photos?.length ?? 0) === 0 && (
        <Text style={styles.dim}>No photos yet. Pick a pose and add one. Photos stay on this device.</Text>
      )}
      {[...byDate.entries()].map(([date, list]) => (
        <View key={date} style={{ gap: 6 }}>
          <Text style={[styles.text, { fontWeight: '700' }]}>{prettyDate(date)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {list.map((p) => (
              <Pressable key={p.id} onPress={() => setViewing(p)} style={{ width: '31.5%' }}>
                <Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 10, backgroundColor: colors.surfaceAlt }} />
                <Text style={{ color: colors.textDim, fontSize: 11, textAlign: 'center', marginTop: 2 }}>{POSE_LABEL[p.pose]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        {viewing && (
          <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 12, gap: 12 }}>
            <Image source={{ uri: viewing.uri }} style={{ width: '100%', flex: 1 }} resizeMode="contain" />
            <Text style={[styles.text, { textAlign: 'center' }]}>{POSE_LABEL[viewing.pose]} · {prettyDate(viewing.date)}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Big label="Close" onPress={() => setViewing(null)} />
              <Big label="Delete" danger onPress={() => showAlert('Delete this photo?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => { await deletePhoto(db, viewing.id); setViewing(null); bump(); } },
              ])} />
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

function Big({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: danger ? colors.danger : colors.accentDim }}>
      <Text style={{ color: danger ? '#0B0D17' : colors.accent, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}
