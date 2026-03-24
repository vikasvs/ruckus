# Ops Notes

## Apple App Identity

- iOS app name: `Ruckus`
- iOS bundle identifier: `com.vikassharma.ruckus`
- Expo project: `@vikassharma/ruckus`

Do not change the iOS bundle identifier unless you intentionally want to create a different iOS app.

## Production Deploy Model

- Branch: `main`
- Backend deploy target: Railway
- iOS release target: TestFlight via EAS Workflows
- OTA updates: disabled for production

## Important Commands

Inspect Expo credentials:

```bash
eas credentials --platform ios
```

Check recent workflow runs:

```bash
eas workflow:runs --limit 10
```

Start a manual iOS production build:

```bash
eas build --platform ios --profile production
```

## Current Automation

- `.eas/workflows/testflight-ios.yml` runs on push to `main`
- `.eas/workflows/send-updates.yml` has been removed

## Troubleshooting

If TestFlight builds fail immediately:

- confirm the bundle identifier is `com.vikassharma.ruckus`
- confirm iOS credentials exist for that identifier in Expo
- confirm the correct Apple team is selected during Expo credential setup
