# TERRITORY 2.0

Independent source repository. Based on approved development branch from TERRITORY 1.0.

## Status
This is **development code**, not a live game and not safe to connect to the
existing production Supabase project. The `main` branch here must not be
deployed to players until complete testing, staging backend and migration.

## UI prototype
Open `public/v2-preview.html` via a static web server (or its built copy).
The preview simulates combat and screens offline with no player credentials.

## Build
`npm ci` then `npm run typecheck`, `npm run test:v2`, `npm run build`.

## Approved UI
Bright illustrated Viking fantasy; bottom Порт / Навыки / Бой /
Приключение / Магазин; Arena button above blue energy orb; HP and
equipment remain visible. Preserve legacy players and admin systems.
