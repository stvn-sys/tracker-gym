# Tracker Gym

Local-first gym tracker (Expo SDK 58 · React Native · expo-sqlite).

## Run
```bash
npm install
npx expo start        # scan the QR code with Expo Go, or press w for web
npm run typecheck && npm test
```

## Layout
- `src/app/` – screens (expo-router)
- `src/db/` – migrations (`schema.ts`), init, seed
- `src/repo/` – the only code that touches SQL (future sync hooks in here)
- `src/data/` – exercise library seed, muscles/equipment, (later) strength standards
- `src/domain/` – pure logic + tests (units, 1RM, ranking)

All weights are stored in kg; the unit setting only affects display.
Every table has UUID ids, `updated_at`, and soft-delete `deleted_at` for future cloud sync.
