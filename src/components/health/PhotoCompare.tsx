import { useState } from 'react';
import { Image, PanResponder, Text, View } from 'react-native';
import type { ProgressPhoto } from '../../repo/photos';
import { colors } from '../../theme/colors';
import { Segmented } from '../SettingsUI';
import { Card, Chip, ChipRow, styles } from '../ui';
import { prettyDate } from '../widgets/common';

/** Compare two photos of one pose: side by side, or one over the other with a drag slider. */
export function PhotoCompare({ photos, title }: { photos: ProgressPhoto[]; title: string }) {
  // photos: newest first
  const [aId, setA] = useState(photos[photos.length - 1].id);
  const [bId, setB] = useState(photos[0].id);
  const [mode, setMode] = useState<'side' | 'slider'>('side');
  const a = photos.find((p) => p.id === aId) ?? photos[photos.length - 1];
  const b = photos.find((p) => p.id === bId) ?? photos[0];
  const chronological = [...photos].reverse();

  return (
    <Card style={{ gap: 10 }}>
      <Text style={{ color: colors.textDim, fontWeight: '700', fontSize: 13 }}>{title.toUpperCase()} · COMPARE</Text>
      <Segmented options={[{ label: 'Side by side', value: 'side' }, { label: 'Slider', value: 'slider' }]} value={mode} onChange={setMode} />
      <Text style={styles.dim}>Before</Text>
      <ChipRow>{chronological.map((p) => <Chip key={p.id} label={prettyDate(p.date)} active={p.id === a.id} onPress={() => setA(p.id)} />)}</ChipRow>
      <Text style={styles.dim}>After</Text>
      <ChipRow>{chronological.map((p) => <Chip key={p.id} label={prettyDate(p.date)} active={p.id === b.id} onPress={() => setB(p.id)} />)}</ChipRow>
      {mode === 'side' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[a, b].map((p, i) => (
            <View key={i} style={{ flex: 1, gap: 4 }}>
              <Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 12, backgroundColor: colors.surfaceAlt }} />
              <Text style={[styles.dim, { textAlign: 'center' }]}>{prettyDate(p.date)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Slider before={a} after={b} />
      )}
    </Card>
  );
}

/** Pan handlers for the slider; `box.w` is the measured width. */
function createSlider(setPos: (p: number) => void) {
  const box = { w: 0 };
  const at = (x: number) => setPos(Math.max(0, Math.min(1, x / (box.w || 1))));
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => at(e.nativeEvent.locationX),
    onPanResponderMove: (e) => at(e.nativeEvent.locationX),
  });
  return { pan, setWidth: (w: number) => { box.w = w; } };
}

function Slider({ before, after }: { before: ProgressPhoto; after: ProgressPhoto }) {
  const [w, setW] = useState(0);
  const [pos, setPos] = useState(0.5);
  const [{ pan, setWidth }] = useState(() => createSlider(setPos));
  const h = (w * 4) / 3;
  return (
    <View style={{ gap: 4 }}>
      <View onLayout={(e) => { setWidth(e.nativeEvent.layout.width); setW(e.nativeEvent.layout.width); }}
        style={{ width: '100%', height: h || 300, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceAlt }} {...pan.panHandlers}>
        <Image source={{ uri: after.uri }} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} pointerEvents="none" />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pos * w, overflow: 'hidden' }} pointerEvents="none">
          <Image source={{ uri: before.uri }} style={{ width: w, height: h }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: pos * w - 1, width: 2, backgroundColor: '#fff' }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: h / 2 - 16, left: pos * w - 16, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#000', fontWeight: '900' }}>⇆</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.dim}>◀ {prettyDate(before.date)}</Text>
        <Text style={styles.dim}>{prettyDate(after.date)} ▶</Text>
      </View>
    </View>
  );
}
