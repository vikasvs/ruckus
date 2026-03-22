# Ruckus MVP

Ruckus is a dead-simple group notification app that lets friends broadcast party status with a single tap.

## Project Structure

```text
ruckusmvp/
├── src/
│   ├── components/
│   ├── config/
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   ├── store/
│   ├── types/
│   └── utils/
├── supabase/
│   ├── functions/              # Canonical Edge Function source
│   ├── edge-functions/         # Legacy duplicate directory (do not deploy from here)
│   ├── schema.sql
│   └── schema-safe.sql
├── assets/
└── product-spec.md
```

## Requirements

- Node `22.x` (matches `.node-version`)
- npm
- Expo account + EAS CLI
- Supabase project

## Environment Variables

Create `.env` (or copy `.env.example`) and set:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_PROJECT_ID=...
```

If any required `EXPO_PUBLIC_*` value is missing, the app now shows a blocking configuration screen instead of crashing at startup.

## Local Development

```bash
npm install
npm start
```

Run on simulators:

```bash
npm run ios
npm run android
```

## Deployment Preflight

Run this before every deploy:

```bash
npm run predeploy
```

This runs:

1. `npm run lint`
2. `npm run typecheck`

## EAS Build / Update

Build profiles are defined in `eas.json`:

- `development` (internal dev-client)
- `preview` (internal QA)
- `production` (store-ready)

Pushes to `main` also trigger the iOS EAS workflow defined in `.eas/workflows/testflight-ios.yml`.

Example commands:

```bash
eas build --platform android --profile preview
eas build --platform ios --profile production
```

OTA update example:

```bash
eas update --branch production
```

### Running from a non-git copy

Preferred: run EAS commands from a proper git checkout.  
Temporary troubleshooting fallback:

```bash
EAS_NO_VCS=1 eas build --platform android --profile preview
```

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Enable Phone auth in Supabase Authentication settings (if used).

## Supabase Functions Deployment

Canonical function directory: `supabase/functions`.

Install and authenticate CLI:

```bash
npm install --global supabase
supabase login
supabase link --project-ref <your-project-ref>
```

Deploy functions:

```bash
supabase functions deploy send-status-notification
supabase functions deploy cleanup-expired-statuses
```

## Operational Note: Paused Supabase Projects

If the Supabase project is paused:

- Expo/EAS builds can still succeed.
- Runtime auth/database/function calls will fail until the project is resumed.

## Troubleshooting

| Symptom | Likely Cause | What to Check |
|---|---|---|
| Build fails before upload | Lint/typecheck/toolchain mismatch | `npm run predeploy`, Node version (`node -v`) |
| Build succeeds but app fails on launch | Missing `EXPO_PUBLIC_*` vars | `.env` values and startup config screen |
| App launches but backend features fail | Supabase paused/unreachable | Supabase dashboard status and API keys |

## Notes

- Full product behavior and scope: `product-spec.md`
- Legacy folder `supabase/edge-functions` is kept for reference; deploy from `supabase/functions` only.
