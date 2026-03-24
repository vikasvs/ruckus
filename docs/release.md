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
- iOS app fix: merge to `main` and wait for the TestFlight build
- Native/config change: merge to `main` and wait for the TestFlight build

## Before Merging

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
