import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MEAL_LABEL, MEALS, type Meal } from '../../domain/meals';
import { forGrams, lookupBarcode, searchFoods, type FoodProduct } from '../../repo/foodApi';
import type { FoodInput } from '../../repo/food';
import { colors } from '../../theme/colors';
import { Button, Chip, ChipRow, inputStyle, styles } from '../ui';
import { useKeyboardHeight } from '../useKeyboardHeight';

type Step = { kind: 'search' } | { kind: 'scan' } | { kind: 'amount'; product: FoodProduct };

const WEB_NOTE = 'Food search and barcode scanning use the Open Food Facts database and work in the installed app. The browser preview cannot reach it.';

/**
 * Find a food in Open Food Facts (by name or barcode), choose the amount, and add it.
 * Opens straight into the scanner when `scan` is set.
 */
export function FoodSearch({ meal: initialMeal, scan, onAdd, onClose, onManual, recent = [] }: {
  meal: Meal; scan?: boolean; onAdd: (meal: Meal, food: FoodInput) => void; onClose: () => void;
  /** Shows an "Add it myself" button that opens manual entry. */
  onManual?: () => void;
  /** Recently logged foods, shown as one-tap chips before searching. */
  recent?: FoodInput[];
}) {
  const keyboard = useKeyboardHeight();
  const [step, setStep] = useState<Step>(scan ? { kind: 'scan' } : { kind: 'search' });
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodProduct[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch {
      setError(Platform.OS === 'web' ? WEB_NOTE : 'Could not reach the food database. Check your internet connection and try again.');
    } finally { setBusy(false); }
  };

  const search = () => query.trim() && run(async () => setResults(await searchFoods(query)));

  const onScanned = (code: string) => run(async () => {
    const p = await lookupBarcode(code);
    if (p) setStep({ kind: 'amount', product: p });
    else { setError(`Barcode ${code} is not in Open Food Facts (or has no nutrition data). Search by name or add it manually.`); setStep({ kind: 'search' }); }
  });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[styles.screen, { paddingTop: 16, paddingBottom: keyboard }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
          <Text style={[styles.section, { flex: 1, marginTop: 0 }]}>
            {step.kind === 'scan' ? 'Scan barcode' : step.kind === 'amount' ? 'How much?' : 'Search food'}
          </Text>
          <Pressable onPress={step.kind === 'amount' || step.kind === 'scan' ? () => setStep({ kind: 'search' }) : onClose} hitSlop={12}>
            <Text style={{ color: colors.accent, fontSize: 16 }}>{step.kind === 'search' ? 'Close' : 'Back'}</Text>
          </Pressable>
        </View>

        {step.kind === 'search' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, margin: 16, marginBottom: 8 }}>
              <TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} returnKeyType="search" autoFocus
                placeholder="e.g. kwark, banana, Jumbo muesli" placeholderTextColor={colors.textDim} style={[inputStyle, { flex: 1, minWidth: 0 }]} />
              <Pressable onPress={search} style={{ paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center' }}>
                <Text style={{ color: '#0B0B0D', fontWeight: '800' }}>Search</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 8 }}>
              {Platform.OS !== 'web' && (
                <Pressable onPress={() => { setError(''); setStep({ kind: 'scan' }); }}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accentDim }}>
                  <Text style={{ color: colors.accent, fontWeight: '800' }}>Scan barcode</Text>
                </Pressable>
              )}
              {onManual && (
                <Pressable onPress={onManual}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: colors.surfaceAlt }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>Add it myself</Text>
                </Pressable>
              )}
            </View>
            {!results && recent.length > 0 && (
              <View style={{ marginHorizontal: 16, marginBottom: 8, gap: 6 }}>
                <Text style={styles.dim}>Recent — tap to add</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {recent.map((r) => (
                    <Pressable key={r.name} onPress={() => onAdd(meal, r)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ color: colors.text, fontSize: 13 }}>{r.name}</Text>
                      <Text style={{ color: colors.textDim, fontSize: 11 }}>{Math.round(r.calories)} kcal</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {busy && <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />}
            {error ? <Text style={{ color: colors.textDim, marginHorizontal: 16, lineHeight: 20 }}>{error}</Text> : null}
            <FlatList
              data={results ?? []}
              keyExtractor={(p) => p.code}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              ListEmptyComponent={results && !busy ? <Text style={styles.dim}>No foods with nutrition data found. Try other words, or add it manually.</Text> : undefined}
              renderItem={({ item }) => (
                <Pressable onPress={() => setStep({ kind: 'amount', product: item })}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={styles.text} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.dim} numberOfLines={1}>
                    {item.brand ? `${item.brand} · ` : ''}{item.per100.calories} kcal · P {item.per100.proteinG} · F {item.per100.fatG} · C {item.per100.carbsG} per 100 g
                  </Text>
                </Pressable>
              )}
            />
            <Text style={[styles.dim, { fontSize: 11, textAlign: 'center', padding: 8 }]}>Data from Open Food Facts (openfoodfacts.org), shared under ODbL.</Text>
          </>
        )}

        {step.kind === 'scan' && <Scanner busy={busy} onCode={onScanned} />}

        {step.kind === 'amount' && (
          <Amount product={step.product} meal={meal} onMeal={setMeal} onAdd={(f) => onAdd(meal, f)} />
        )}
      </View>
    </Modal>
  );
}

function Scanner({ busy, onCode }: { busy: boolean; onCode: (code: string) => void }) {
  const [permission, request] = useCameraPermissions();
  const [done, setDone] = useState(false);
  if (Platform.OS === 'web') return <Text style={[styles.dim, { margin: 16 }]}>{WEB_NOTE}</Text>;
  if (!permission) return <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />;
  if (!permission.granted) {
    return (
      <View style={{ margin: 16, gap: 12 }}>
        <Text style={styles.text}>Camera access is needed to scan barcodes.</Text>
        <Button label="Allow camera" onPress={request} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, margin: 16, borderRadius: 18, overflow: 'hidden' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={done || busy ? undefined : ({ data }) => { setDone(true); onCode(data); }}
      />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: '#000a' }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>{busy ? 'Looking it up…' : 'Point the camera at the barcode'}</Text>
      </View>
    </View>
  );
}

function Amount({ product, meal, onMeal, onAdd }: { product: FoodProduct; meal: Meal; onMeal: (m: Meal) => void; onAdd: (f: FoodInput) => void }) {
  const [grams, setGrams] = useState(String(product.servingG ?? 100));
  const g = parseFloat(grams.replace(',', '.'));
  const valid = Number.isFinite(g) && g > 0;
  const m = valid ? forGrams(product, g) : null;
  const presets = [
    ...(product.servingG ? [{ label: `1 serving (${product.servingLabel ?? `${product.servingG} g`})`, g: product.servingG }] : []),
    ...(product.servingG ? [{ label: '2 servings', g: product.servingG * 2 }] : []),
    { label: '100 g', g: 100 },
  ];
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View>
        <Text style={[styles.text, { fontWeight: '800', fontSize: 18 }]}>{product.name}</Text>
        {product.brand && <Text style={styles.dim}>{product.brand}</Text>}
        <Text style={[styles.dim, { marginTop: 4 }]}>
          Per 100 g: {product.per100.calories} kcal · P {product.per100.proteinG} · F {product.per100.fatG} · C {product.per100.carbsG}
        </Text>
      </View>
      <Text style={styles.dim}>Amount (grams)</Text>
      <TextInput value={grams} onChangeText={setGrams} keyboardType="decimal-pad" selectTextOnFocus style={inputStyle} />
      <ChipRow wrap>
        {presets.map((p) => <Chip key={p.label} label={p.label} active={valid && g === p.g} onPress={() => setGrams(String(p.g))} />)}
      </ChipRow>
      <Text style={styles.dim}>Meal</Text>
      <ChipRow wrap>
        {MEALS.map((x) => <Chip key={x} label={MEAL_LABEL[x]} active={meal === x} onPress={() => onMeal(x)} />)}
      </ChipRow>
      {m && (
        <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>
          {m.calories} kcal · P {m.proteinG} g · F {m.fatG} g · C {m.carbsG} g
        </Text>
      )}
      <Button label={`Add to ${MEAL_LABEL[meal]}`} onPress={() => {
        if (!valid || !m) return;
        onAdd({ name: `${product.name}${product.brand ? ` (${product.brand})` : ''} · ${Math.round(g)} g`, ...m });
      }} />
    </View>
  );
}
