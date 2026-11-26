import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';

export const POSES = ['front', 'side', 'back'] as const;
export type Pose = (typeof POSES)[number];
export const POSE_LABEL: Record<Pose, string> = { front: 'Front', side: 'Side', back: 'Back' };

/** `uri` holds the image itself as a data: URI so it lives inside the local database. */
export interface ProgressPhoto { id: string; date: string; pose: Pose; uri: string }

export async function listPhotos(db: SQLiteDatabase): Promise<ProgressPhoto[]> {
  return db.getAllAsync<ProgressPhoto>(
    'SELECT id, date, pose, uri FROM progress_photos WHERE deleted_at IS NULL ORDER BY date DESC, updated_at DESC',
  );
}

export async function addPhoto(db: SQLiteDatabase, date: string, pose: Pose, uri: string) {
  await db.runAsync('INSERT INTO progress_photos (id, date, pose, uri, updated_at) VALUES (?, ?, ?, ?, ?)', newId(), date, pose, uri, now());
}

export async function deletePhoto(db: SQLiteDatabase, id: string) {
  const t = now();
  // Clear the image data too, so deleting actually frees space.
  await db.runAsync("UPDATE progress_photos SET deleted_at = ?, updated_at = ?, uri = '' WHERE id = ?", t, t, id);
}
