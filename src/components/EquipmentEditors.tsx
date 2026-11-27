import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { CommitInput } from './CommitInput';
import { showAlert } from './Dialog';
import { usePrefs } from './Prefs';
import { useProfile } from './ProfileContext';
import { Group } from './SettingsUI';
import { styles } from './ui';
import { fromDisplay, toDisplay } from '../domain/units';
import { createBrand, createSeries, deleteBrand, deleteSeries, listBrands, renameBrand, renameSeries, type Brand } from '../repo/brands';
import { colors } from '../theme/colors';

/** Editable list of names: rename in place, remove, add. */
export function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [adding, setAdding] = useState('');
  const add = () => {
    const v = adding.trim();
    if (!v || items.some((x) => x.toLowerCase() === v.toLowerCase())) { setAdding(''); return; }
    onChange([...items, v]);
    setAdding('');
  };
  return (
    <Group>
      {items.map((it, i) => (
        <View key={`${it}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 8 }}>
          <CommitInput initial={it} style={{ flex: 1, minWidth: 0, color: colors.text, fontSize: 17, paddingVertical: 8 }}
            onCommit={(t) => { const v = t.trim(); if (v) onChange(items.map((x, j) => (j === i ? v : x))); }} />
          <Pressable onPress={() => onChange(items.filter((_, j) => j !== i))} hitSlop={8}
            style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.danger, fontWeight: '800' }}>✕</Text>
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        <TextInput value={adding} onChangeText={setAdding} onSubmitEditing={add} placeholder={placeholder} placeholderTextColor={colors.textDim}
          style={{ flex: 1, minWidth: 0, color: colors.text, fontSize: 17, paddingVertical: 8 }} />
        <Pressable onPress={add} hitSlop={8} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.accent }}>
          <Text style={{ color: '#0B0B0D', fontWeight: '800' }}>Add</Text>
        </Pressable>
      </View>
    </Group>
  );
}

/** Bar types with their empty weight (used as the starting weight of new exercises). */
export function BarTypesEditor() {
  const { prefs, setPrefs } = usePrefs();
  const { profile } = useProfile();
  const unit = profile.unit;
  const [name, setName] = useState('');
  const [kg, setKg] = useState('');
  const shown = (v: number | undefined) => (v == null ? '' : String(Math.round(toDisplay(v, unit) * 100) / 100));
  const parse = (t: string) => { const v = parseFloat(t.replace(',', '.')); return Number.isFinite(v) && v >= 0 ? Math.round(fromDisplay(v, unit) * 1000) / 1000 : null; };
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 6, gap: 8 };
  const inp = { color: colors.text, fontSize: 17, paddingVertical: 8 };
  const add = () => {
    const n = name.trim(); const w = parse(kg);
    if (!n || prefs.barTypes.includes(n)) return;
    setPrefs({ barTypes: [...prefs.barTypes, n], barWeights: { ...prefs.barWeights, ...(w != null ? { [n]: w } : {}) } });
    setName(''); setKg('');
  };
  return (
    <Group footer={`Empty weight of each bar (${unit}). It becomes the starting weight when you pick that bar for an exercise.`}>
      {prefs.barTypes.map((b, i) => (
        <View key={`${b}-${i}`} style={row}>
          <CommitInput initial={b} style={[inp, { flex: 1, minWidth: 0 }]} onCommit={(t) => {
            const v = t.trim(); if (!v || v === b) return;
            const { [b]: w, ...rest } = prefs.barWeights;
            setPrefs({ barTypes: prefs.barTypes.map((x) => (x === b ? v : x)), barWeights: w != null ? { ...rest, [v]: w } : rest });
          }} />
          <CommitInput initial={shown(prefs.barWeights[b])} keyboardType="decimal-pad" placeholder={unit} style={[inp, { width: 64, textAlign: 'right' }]}
            onCommit={(t) => { const w = parse(t); if (w != null) setPrefs({ barWeights: { ...prefs.barWeights, [b]: w } }); }} />
          <Text style={styles.dim}>{unit}</Text>
          <Pressable onPress={() => setPrefs({ barTypes: prefs.barTypes.filter((x) => x !== b) })} hitSlop={8}
            style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.danger, fontWeight: '800' }}>✕</Text>
          </Pressable>
        </View>
      ))}
      <View style={row}>
        <TextInput value={name} onChangeText={setName} placeholder="Add a bar type" placeholderTextColor={colors.textDim} style={[inp, { flex: 1, minWidth: 0 }]} />
        <TextInput value={kg} onChangeText={setKg} onSubmitEditing={add} keyboardType="decimal-pad" placeholder={unit} placeholderTextColor={colors.textDim} style={[inp, { width: 64, textAlign: 'right' }]} />
        <Pressable onPress={add} hitSlop={8} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.accent }}>
          <Text style={{ color: '#0B0B0D', fontWeight: '800' }}>Add</Text>
        </Pressable>
      </View>
    </Group>
  );
}

/** Machine brands and their series (shared by Machine and Smith). */
export function BrandsEditor() {
  const db = useSQLiteContext();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState('');
  const [addingSeries, setAddingSeries] = useState('');
  const reload = () => listBrands(db).then(setBrands);
  useEffect(() => { listBrands(db).then(setBrands); }, [db]);
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 6, gap: 8 };
  const inp = { flex: 1, minWidth: 0, color: colors.text, fontSize: 17, paddingVertical: 8 };
  const x = (onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.danger, fontWeight: '800' }}>✕</Text>
    </Pressable>
  );
  const confirmDelete = (name: string, run: () => Promise<unknown>) => showAlert(`Delete ${name}?`, 'Exercises that use it keep working but lose this label.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await run(); reload(); } },
  ]);
  return (
    <>
      <Text style={styles.section}>Brands & series</Text>
      <Group footer="Shared by Machine and Smith. Tap ▸ to edit a brand's series.">
        {brands.map((b) => (
          <View key={b.id}>
            <View style={row}>
              <Pressable onPress={() => setOpen(open === b.id ? null : b.id)} hitSlop={8}><Text style={{ color: colors.textDim, fontSize: 16, width: 18 }}>{open === b.id ? '▾' : '▸'}</Text></Pressable>
              <CommitInput initial={b.name} style={inp} onCommit={async (t) => { if (t.trim()) { await renameBrand(db, b.id, t); reload(); } }} />
              <Text style={styles.dim}>{b.series.length}</Text>
              {x(() => confirmDelete(b.name, () => deleteBrand(db, b.id)))}
            </View>
            {open === b.id && (
              <View style={{ paddingLeft: 28 }}>
                {b.series.map((s) => (
                  <View key={s.id} style={row}>
                    <CommitInput initial={s.name} style={inp} onCommit={async (t) => { if (t.trim()) { await renameSeries(db, s.id, t); reload(); } }} />
                    {x(() => confirmDelete(s.name, () => deleteSeries(db, s.id)))}
                  </View>
                ))}
                <View style={row}>
                  <TextInput value={addingSeries} onChangeText={setAddingSeries} placeholder={`Add a ${b.name} series`} placeholderTextColor={colors.textDim} style={inp}
                    onSubmitEditing={async () => { if (addingSeries.trim()) { await createSeries(db, b.id, addingSeries); setAddingSeries(''); reload(); } }} />
                </View>
              </View>
            )}
          </View>
        ))}
        <View style={row}>
          <TextInput value={adding} onChangeText={setAdding} placeholder="Add a brand" placeholderTextColor={colors.textDim} style={inp}
            onSubmitEditing={async () => { if (adding.trim()) { await createBrand(db, adding); setAdding(''); reload(); } }} />
        </View>
      </Group>
    </>
  );
}

