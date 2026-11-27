import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';
import type { Macros, Meal } from '../domain/meals';

export interface FoodEntry extends Macros { id: string; date: string; meal: Meal; name: string; loggedAt: number }
export type FoodInput = Macros & { name: string };

interface Row {
  id: string; date: string; meal: string; name: string; calories: number;
  protein_g: number; fat_g: number; carbs_g: number; logged_at: number;
}
const map = (r: Row): FoodEntry => ({
  id: r.id, date: r.date, meal: r.meal as Meal, name: r.name, calories: r.calories,
  proteinG: r.protein_g, fatG: r.fat_g, carbsG: r.carbs_g, loggedAt: r.logged_at,
});

export async function foodForDate(db: SQLiteDatabase, date: string): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM food_entries WHERE date = ? AND deleted_at IS NULL ORDER BY logged_at', date,
  );
  return rows.map(map);
}

export async function addFood(db: SQLiteDatabase, date: string, meal: Meal, f: FoodInput) {
  const t = now();
  await db.runAsync(
    'INSERT INTO food_entries (id, date, meal, name, calories, protein_g, fat_g, carbs_g, logged_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    newId(), date, meal, f.name.trim() || 'Quick add', f.calories, f.proteinG, f.fatG, f.carbsG, t, t,
  );
}

export async function deleteFood(db: SQLiteDatabase, id: string) {
  const t = now();
  await db.runAsync('UPDATE food_entries SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
}

/** Distinct recently logged foods (latest version of each name), for one-tap re-adding. */
export async function recentFoods(db: SQLiteDatabase, limit = 12): Promise<FoodInput[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM food_entries WHERE deleted_at IS NULL AND name != 'Quick add'
     AND logged_at = (SELECT MAX(logged_at) FROM food_entries f2 WHERE f2.name = food_entries.name AND f2.deleted_at IS NULL)
     ORDER BY logged_at DESC LIMIT ?`,
    limit,
  );
  return rows.map(map).map(({ name, calories, proteinG, fatG, carbsG }) => ({ name, calories, proteinG, fatG, carbsG }));
}

/** Copies a day's food (or one meal of it) to another day, with fresh ids. */
export async function copyFood(db: SQLiteDatabase, from: string, to: string, meal?: Meal, toMeal?: Meal) {
  const items = (await foodForDate(db, from)).filter((f) => !meal || f.meal === meal);
  for (const f of items) await addFood(db, to, toMeal ?? f.meal, f);
  return items.length;
}

/** Deletes all food of one meal on a day. */
export async function clearMeal(db: SQLiteDatabase, date: string, meal: Meal) {
  const t = now();
  await db.runAsync('UPDATE food_entries SET deleted_at = ?, updated_at = ? WHERE date = ? AND meal = ? AND deleted_at IS NULL', t, t, date, meal);
}

export async function updateFood(db: SQLiteDatabase, id: string, f: FoodInput) {
  await db.runAsync('UPDATE food_entries SET name = ?, calories = ?, protein_g = ?, fat_g = ?, carbs_g = ?, updated_at = ? WHERE id = ?',
    f.name.trim() || 'Quick add', f.calories, f.proteinG, f.fatG, f.carbsG, now(), id);
}

/** Favorite foods (one-tap add), stored as a JSON list in settings. */
export async function listFavorites(db: SQLiteDatabase): Promise<FoodInput[]> {
  const r = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'food.favorites'");
  try { return r ? JSON.parse(r.value) : []; } catch { return []; }
}
export async function setFavorites(db: SQLiteDatabase, list: FoodInput[]) {
  await db.runAsync("INSERT INTO settings (key, value, updated_at) VALUES ('food.favorites', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    JSON.stringify(list), now());
}
export async function toggleFavorite(db: SQLiteDatabase, f: FoodInput): Promise<boolean> {
  const list = await listFavorites(db);
  const has = list.some((x) => x.name === f.name);
  const { name, calories, proteinG, fatG, carbsG } = f;
  await setFavorites(db, has ? list.filter((x) => x.name !== f.name) : [...list, { name, calories, proteinG, fatG, carbsG }]);
  return !has;
}
