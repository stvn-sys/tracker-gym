import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';

export interface Series { id: string; brandId: string; name: string }
export interface Brand { id: string; name: string; series: Series[] }

export async function listBrands(db: SQLiteDatabase): Promise<Brand[]> {
  const brands = await db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM machine_brands WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE',
  );
  const series = await db.getAllAsync<{ id: string; brand_id: string; name: string }>(
    'SELECT id, brand_id, name FROM machine_series WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE',
  );
  return brands.map((b) => ({
    ...b,
    series: series.filter((s) => s.brand_id === b.id).map((s) => ({ id: s.id, brandId: s.brand_id, name: s.name })),
  }));
}

export async function createBrand(db: SQLiteDatabase, name: string) {
  const id = newId();
  await db.runAsync('INSERT INTO machine_brands (id, name, updated_at) VALUES (?, ?, ?)', id, name.trim(), now());
  return id;
}

export async function createSeries(db: SQLiteDatabase, brandId: string, name: string) {
  const id = newId();
  await db.runAsync(
    'INSERT INTO machine_series (id, brand_id, name, updated_at) VALUES (?, ?, ?, ?)',
    id, brandId, name.trim(), now(),
  );
  return id;
}

export const renameBrand = (db: SQLiteDatabase, id: string, name: string) =>
  db.runAsync('UPDATE machine_brands SET name = ?, updated_at = ? WHERE id = ?', name.trim(), now(), id);
export const deleteBrand = (db: SQLiteDatabase, id: string) =>
  db.runAsync('UPDATE machine_brands SET deleted_at = ?, updated_at = ? WHERE id = ?', now(), now(), id);
export const renameSeries = (db: SQLiteDatabase, id: string, name: string) =>
  db.runAsync('UPDATE machine_series SET name = ?, updated_at = ? WHERE id = ?', name.trim(), now(), id);
export const deleteSeries = (db: SQLiteDatabase, id: string) =>
  db.runAsync('UPDATE machine_series SET deleted_at = ?, updated_at = ? WHERE id = ?', now(), now(), id);
