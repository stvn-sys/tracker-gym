/**
 * Versioned migrations. Append new entries; never edit old ones.
 *
 * Sync-readiness conventions (every syncable table):
 *  - `id` TEXT UUID primary key (globally unique, generated on device)
 *  - `updated_at` INTEGER ms epoch, bumped on every write
 *  - `deleted_at` INTEGER ms epoch, soft delete (tombstone) instead of DELETE
 * Weights are always stored in kilograms.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE exercises (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscles TEXT NOT NULL DEFAULT '[]',
    equipment TEXT NOT NULL,
    builtin_key TEXT,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_exercises_builtin ON exercises(builtin_key);

  CREATE TABLE routines (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    weekdays TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE routine_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    target_sets INTEGER NOT NULL DEFAULT 3,
    target_reps INTEGER NOT NULL DEFAULT 8,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_re_routine ON routine_exercises(routine_id);

  CREATE TABLE workouts (
    id TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT,
    name TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    note TEXT,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_workouts_started ON workouts(started_at);

  CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    workout_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    note TEXT,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_we_workout ON workout_exercises(workout_id);
  CREATE INDEX idx_we_exercise ON workout_exercises(exercise_id);

  CREATE TABLE sets (
    id TEXT PRIMARY KEY NOT NULL,
    workout_exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    weight_kg REAL,
    reps INTEGER,
    rir INTEGER,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_sets_we ON sets(workout_exercise_id);

  CREATE TABLE bodyweight_logs (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE UNIQUE INDEX idx_bw_date ON bodyweight_logs(date);

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  `,
];
