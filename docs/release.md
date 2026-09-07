# Release Flow

Ruckus uses a binary-only production release model.

## Production

When code lands on `main`:

1. Railway redeploys the backend.
2. Expo EAS runs `.eas/workflows/testflight-ios.yml`.
3. Expo builds an iOS binary with the `production` profile.
4. Expo submits that build to TestFlight.

Production does not use `eas update` or over-the-air JS updates.

## What To Ship

- Backend-only fix: merge to `main`
- App fix with JS-only changes: merge to `main` and wait for the TestFlight build
- Native/config change: merge to `main` and wait for the TestFlight build

## Before Merging

When `server/schema.sql` changes, apply its additive, transactional migration to
the verified target database **before** pushing the matching backend release:
`npm --prefix server run migrate` with `DATABASE_URL` supplied securely by the
deployment environment. This preserves existing data and mute preferences.

Use the EAS production environment when building. Never package `.env.local` or
the local demo database; production uses the hosted Railway API.

Install dependencies if needed:

```bash
npm install
npm --prefix server install
```

Run:

```bash
npm run predeploy
```

Optional local smoke check:

```bash
npx expo export --platform ios --clear
```

## After Merging

Check:

- Railway deployment status
- Expo workflow run status
- TestFlight processing in App Store Connect
