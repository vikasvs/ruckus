# Ruckus MVP

Ruckus is a lightweight group vibe app where people can tell their crew they are `rucked up` or `ricked up` with one tap.

## Architecture

```text
ruckusmvp/
├── src/                       # Expo / React Native app
├── server/                    # Express + PostgreSQL API for Railway
├── assets/
├── docs/
└── product-spec.md
```

- Mobile client: Expo SDK 54 + React Native
- Backend: Express + PostgreSQL on Railway
- Notifications: Expo Push Notifications
- Release flow: Railway backend deploy + iOS TestFlight binary release on pushes to `main`

## Requirements

- Node `22.x` (matches `.node-version`)
- npm
- Expo account + EAS CLI
- Railway PostgreSQL database

## Environment Variables

Root `.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id_here
```

Server `server/.env`:

```bash
DATABASE_URL=postgresql://user:password@host:5432/railway
PORT=3000
```

## Local Setup

Install both packages:

```bash
npm install
npm --prefix server install
```

Or use:

```bash
npm run setup
```

## Local Development

Start the API:

```bash
npm --prefix server run dev
```

Start the Expo app:

```bash
npm start
```

Simulators:

```bash
npm run ios
npm run android
```

## Validation

Useful commands:

```bash
npm run lint
npm run typecheck:app
npm run typecheck:server
npm run build:server
npm run test:app
npm run test:server
```

Predeploy runs the full local validation stack:

```bash
npm run predeploy
```

## Database Setup

Apply the current schema in Railway / Postgres using:

```bash
server/schema.sql
```

The schema includes:

- users
- groups
- group_members
- status_events
- notification_logs
- group_ruckus_notifications

## Release Flow

When code lands on `main`:

1. Railway redeploys the backend
2. Expo EAS runs `.eas/workflows/testflight-ios.yml`
3. Expo builds the iOS production binary
4. Expo submits that build to TestFlight

Production does not use `eas update`.

## Troubleshooting

| Symptom | Likely Cause | What to Check |
|---|---|---|
| `npm run lint` fails before linting | stale root install | rerun `npm install` |
| app typecheck passes but server build fails | `server/` dependencies missing | run `npm --prefix server install` |
| app launches but API requests fail | missing `EXPO_PUBLIC_API_URL` or server not running | `.env` and API logs |
| push registration succeeds but notifications do not arrive | Expo project or token issue | `EXPO_PUBLIC_PROJECT_ID`, Expo credentials, device token persistence |

## Notes

- Product behavior and roadmap: `product-spec.md`
- Release details: `docs/release.md`
- Operational notes: `docs/ops.md`
