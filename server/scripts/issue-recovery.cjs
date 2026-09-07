// Run only after the operator has verified ownership of the exact original account.
// stdout contains a secret. Deliver privately; never commit it or write it into logs.
const { randomBytes, createHash } = require('node:crypto');
const { Client } = require('pg');

async function issue() {
  const [userId, expectedName, groupId] = process.argv.slice(2);
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!uuid.test(userId || '') || !expectedName || !uuid.test(groupId || '')) {
    throw new Error('Usage: node scripts/issue-recovery.cjs <verified-user-uuid> <exact-name> <verified-group-uuid>');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT u.id FROM users u
      JOIN group_members gm ON gm.user_id = u.id
      WHERE u.id = $1 AND u.first_name = $2 AND gm.group_id = $3 FOR UPDATE OF u`, [userId, expectedName, groupId]);
    if (found.rows.length !== 1) throw new Error('Account name or membership does not match. No code issued.');
    const code = randomBytes(20).toString('hex').toUpperCase();
    await client.query('UPDATE account_recovery_codes SET expires_at = NOW() WHERE user_id = $1 AND expires_at > NOW()', [userId]);
    const result = await client.query(`INSERT INTO account_recovery_codes (code_hash, user_id, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '1 hour') RETURNING expires_at`, [createHash('sha256').update(code).digest('hex'), userId]);
    await client.query('COMMIT');
    console.log(JSON.stringify({ code: code.match(/.{8}/g).join('-'), expiresAt: result.rows[0].expires_at }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
}
issue().catch(() => { console.error('Recovery issuance failed. Verify the database connection and exact account/membership.'); process.exitCode = 1; });
