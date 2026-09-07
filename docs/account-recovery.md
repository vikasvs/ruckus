# Account recovery hotfix

## Scope of this release

- Preserve the existing user ID on profile network errors, server errors, and timeouts. Only a confirmed 404 clears a missing profile. Storage-read failures show a retry screen, not signup.
- Remove the destructive Sign Out button and action until verified sign-in exists.
- Add **Already had an account? Recover it** to onboarding. An operator-issued code restores the original user ID; memberships, admin role, posts, and analytics remain associated with that same ID. No name-based matching or duplicate membership creation.
- Recovery codes contain 160 random bits, are stored as SHA-256 hashes, expire in one hour, and are redeemed atomically. A new recovery attempt cannot reuse a consumed code. The same request ID can retry for ten minutes (within the original expiry) after a dropped response or local-storage failure. Raw codes are never persisted by the app or included in URLs/logs.
- Limit redemption attempts to 30 per socket IP per minute per server process. Railway proxy traffic can share this bucket; distributed rate limiting is a future hardening task. Code entropy is the primary brute-force protection.

Token handling follows the applicable [OWASP recovery-code guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). This is support-assisted recovery for the legacy guest identity model, **not a completed authentication or authorization system**.

## Operator recovery

1. Confirm phone/TestFlight versus simulator and the exact original account and crew with the requester. Names identify candidates but do not prove account ownership. For other beta users, obtain independent verification through the known beta contact/crew administrator. Do not expose member lists or issue a code based only on a name supplied to the public app.
2. Look up the original user UUID and group UUID using a trusted database connection. Confirm membership and original admin status. Do not create or merge users just because names match.
3. After the additive schema migration and backend deployment, issue a code with `DATABASE_URL` supplied securely:

   `node server/scripts/issue-recovery.cjs <verified-user-uuid> <exact-name> <verified-group-uuid>`

   The script verifies the exact name/membership, serializes issuance per user, revokes older codes, and prints a secret code with its expiry. Capture stdout privately, never in a committed artifact or shared log.
4. Deliver the code privately after the user has installed the new TestFlight build. On the welcome/name screen choose **Already had an account? Recover it**, paste the code, and tap **Restore my account**. Do not enter the name to create another account. If they already did, the home screen also offers **Missing your old groups? Recover account**; recovery switches identities but does not merge or delete accounts.
5. Verify the original crew and history appear. If the app loses a response, retry the same code promptly. After ten minutes, expiry, a new device, or cleared app storage, issue a replacement after re-verification.

Already-logged-out users cannot be silently recovered: the old build deleted its only local identifier. Database rows surviving is not proof of who is using a new installation.

## Durable authentication: next release, not implemented here

Choose a verified identity provider (Apple sign-in for iOS, or verified email/phone). Add server-validated identity tokens, revocable sessions, secure device credential storage, and authorization on every user/group/status endpoint. Link verified identities to existing user IDs without replacing memberships. Legacy migration must require proof of account ownership, not an unverified UUID or name. Provide tested logout, re-login, reinstall, device-change, account-linking and recovery flows before reintroducing Sign Out. Require an upgrade or explicitly retire unprotected legacy endpoints after migration; keeping them open is not authenticated access control.

## Release verification

Run `npm run predeploy`, all-platform Expo export, and the PostgreSQL integration test with `RECOVERY_TEST_DATABASE_URL` pointing only at local Ruckus Postgres. The integration test creates and removes its own UUID-scoped fixtures and must never run against production. Apply `server/schema.sql` using the transactional migration before pushing. Verify build/submission status and production health. Issuing the real user's code remains gated on exact account verification.
