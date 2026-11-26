import type { SQLiteDatabase } from 'expo-sqlite';
import {
  DEFAULT_ADDON_PLATES_KG, DEFAULT_INCREMENT_KG, type Equipment, type Laterality,
} from '../data/equipment';
import { SEED_EXERCISES, type SeedExercise } from '../data/exercises.seed';
import type { Muscle } from '../data/muscles';
import { newId, now } from '../domain/ids';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  /** "+" step during a workout, in kg. */
  incrementKg: number;
  /** Small plates you can add to a stack, in kg. */
  addonPlatesKg: number[];
  laterality: Laterality | null;
  attachment: string | null;
  /** Pulleys used, cable exercises only (1–4). */
  pulleys: number | null;
  /** Notes kept with the exercise and shown every time you do it. */
  notes: string | null;
  /** Bodyweight/band variant, e.g. "Assisted (machine)". */
  variant: string | null;
  /** Kind of bar, for Bar exercises (e.g. Trap bar). */
  barType: string | null;
  /** Rest after a set of this exercise, in seconds; null = default from Settings. */
  restSeconds: number | null;
  brandId: string | null;
  seriesId: string | null;
  builtinKey: string | null;
}

export type ExerciseInput = Omit<Exercise, 'id' | 'builtinKey'>;

interface Row {
  id: string; name: string; primary_muscle: string; secondary_muscles: string; equipment: string;
  increment_kg: number; addon_plates: string; laterality: string | null; attachment: string | null; pulleys: number | null; rest_seconds: number | null; bar_type: string | null; notes: string | null; variant: string | null;
  brand_id: string | null; series_id: string | null; builtin_key: string | null;
}

export const mapExercise = (r: Row): Exercise => ({
  id: r.id,
  name: r.name,
  primaryMuscle: r.primary_muscle as Muscle,
  secondaryMuscles: JSON.parse(r.secondary_muscles),
  equipment: r.equipment as Equipment,
  incrementKg: r.increment_kg,
  addonPlatesKg: JSON.parse(r.addon_plates),
  laterality: r.laterality as Laterality | null,
  attachment: r.attachment,
  pulleys: r.pulleys ?? null,
  restSeconds: r.rest_seconds ?? null,
  barType: r.bar_type ?? null,
  notes: r.notes ?? null,
  variant: r.variant ?? null,
  brandId: r.brand_id,
  seriesId: r.series_id,
  builtinKey: r.builtin_key,
});

export function seedToInput(e: SeedExercise, brandId: string | null = null, seriesId: string | null = null): ExerciseInput {
  return {
    name: e.name,
    primaryMuscle: e.primary,
    secondaryMuscles: e.secondary,
    equipment: e.equipment,
    incrementKg: DEFAULT_INCREMENT_KG[e.equipment],
    addonPlatesKg: DEFAULT_ADDON_PLATES_KG[e.equipment] ?? [],
    laterality: e.laterality,
    attachment: e.attachment,
    pulleys: e.pulleys,
    restSeconds: null,
    barType: e.barType,
    notes: e.notes ?? null,
    variant: e.variant ?? null,
    brandId,
    seriesId,
  };
}

const COLS = 'name, primary_muscle, secondary_muscles, equipment, increment_kg, addon_plates, laterality, attachment, pulleys, rest_seconds, bar_type, notes, variant, brand_id, series_id';
const values = (e: ExerciseInput) => [
  e.name.trim(), e.primaryMuscle, JSON.stringify(e.secondaryMuscles), e.equipment, e.incrementKg,
  JSON.stringify(e.addonPlatesKg), e.laterality, e.attachment, e.pulleys, e.restSeconds, e.barType, e.notes?.trim() || null, e.variant, e.brandId, e.seriesId,
];

export async function listExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM exercises WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE',
  );
  return rows.map(mapExercise);
}

export async function getExercise(db: SQLiteDatabase, id: string): Promise<Exercise | null> {
  const r = await db.getFirstAsync<Row>('SELECT * FROM exercises WHERE id = ?', id);
  return r ? mapExercise(r) : null;
}

export async function createExercise(db: SQLiteDatabase, e: ExerciseInput, builtinKey: string | null = null) {
  const id = newId();
  await db.runAsync(
    `INSERT INTO exercises (id, ${COLS}, builtin_key, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, ...values(e), builtinKey, now(),
  );
  return id;
}

/** Machine brand/series ids for a premade exercise, looked up by name. */
async function seedBrandIds(db: SQLiteDatabase, e: SeedExercise): Promise<[string | null, string | null]> {
  if (!e.brand) return [null, null];
  const b = await db.getFirstAsync<{ id: string }>('SELECT id FROM machine_brands WHERE name = ? AND deleted_at IS NULL', e.brand);
  if (!b) return [null, null];
  const s = e.series
    ? await db.getFirstAsync<{ id: string }>('SELECT id FROM machine_series WHERE brand_id = ? AND name = ? AND deleted_at IS NULL', b.id, e.series)
    : null;
  return [b.id, s?.id ?? null];
}

export async function insertSeedExercise(db: SQLiteDatabase, e: SeedExercise) {
  const [b, s] = await seedBrandIds(db, e);
  return createExercise(db, seedToInput(e, b, s), e.key);
}

export async function updateExercise(db: SQLiteDatabase, id: string, e: ExerciseInput) {
  await db.runAsync(
    `UPDATE exercises SET name = ?, primary_muscle = ?, secondary_muscles = ?, equipment = ?, increment_kg = ?,
     addon_plates = ?, laterality = ?, attachment = ?, pulleys = ?, rest_seconds = ?, bar_type = ?, notes = ?, variant = ?, brand_id = ?, series_id = ?, updated_at = ? WHERE id = ?`,
    ...values(e), now(), id,
  );
}

/** Soft delete so workout history keeps its exercise names. */
export async function deleteExercise(db: SQLiteDatabase, id: string) {
  const t = now();
  await db.runAsync('UPDATE exercises SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
}

/**
 * Restore defaults: re-creates deleted premade exercises and resets edited ones
 * to their shipped values. Your own exercises and your history are untouched.
 * Ids are kept so past workouts stay linked.
 */
export async function restoreDefaultExercises(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    for (const s of SEED_EXERCISES) {
      const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM exercises WHERE builtin_key = ?', s.key);
      if (row) {
        const [b, ser] = await seedBrandIds(db, s);
        await updateExercise(db, row.id, seedToInput(s, b, ser));
        await db.runAsync('UPDATE exercises SET deleted_at = NULL WHERE id = ?', row.id);
      } else {
        await insertSeedExercise(db, s);
      }
    }
  });
}

/** Saves just the remembered notes of an exercise (used from the workout screen). */
export async function setExerciseNotes(db: SQLiteDatabase, id: string, notes: string) {
  await db.runAsync('UPDATE exercises SET notes = ?, updated_at = ? WHERE id = ?', notes.trim() || null, now(), id);
}
