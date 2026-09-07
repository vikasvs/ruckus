import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';
import request from 'supertest';
import { createApp } from '../src/app';

const connectionString = process.env.RECOVERY_TEST_DATABASE_URL;
test('real Postgres: original memberships survive recovery; concurrent claims, expiry and replay are enforced', { skip: !connectionString }, async () => {
  const url = new URL(connectionString!);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Recovery integration tests require a local database');
  const pool = new pg.Pool({ connectionString });
  const userId = randomUUID();
  const groupId = randomUUID();
  const memberId = randomUUID();
  const code = randomBytes(20).toString('hex').toUpperCase();
  const hash = createHash('sha256').update(code).digest('hex');
  const start = new Date();
  let time = start;
  const app = createApp({ pool, pushSender: { send: async () => {} }, idGenerator: randomUUID, now: () => time });
  try {
    await pool.query('INSERT INTO users (id, first_name) VALUES ($1, $2)', [userId, 'Recovery integration fixture']);
    await pool.query('INSERT INTO groups (id, name, invite_code, created_by) VALUES ($1, $2, $3, $4)', [groupId, 'Recovery integration fixture', randomBytes(4).toString('hex').toUpperCase(), userId]);
    await pool.query('INSERT INTO group_members (id, group_id, user_id, is_admin) VALUES ($1, $2, $3, TRUE)', [memberId, groupId, userId]);
    await pool.query("INSERT INTO account_recovery_codes (code_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')", [hash, userId]);
    const ids = [randomUUID(), randomUUID()];
    const responses = await Promise.all(ids.map((requestId) => request(app).post('/api/recovery/redeem').send({ code, requestId })));
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
    const winner = responses.findIndex((r) => r.status === 200);
    assert.equal(responses[winner].body.id, userId);
    assert.equal((await request(app).post('/api/recovery/redeem').send({ code, requestId: ids[winner] })).status, 200);
    const members = await pool.query('SELECT id, user_id, is_admin FROM group_members WHERE group_id = $1', [groupId]);
    assert.deepEqual(members.rows, [{ id: memberId, user_id: userId, is_admin: true }]);
    time = new Date(start.getTime() + 11 * 60000);
    assert.equal((await request(app).post('/api/recovery/redeem').send({ code, requestId: ids[winner] })).status, 400);
    await pool.query('UPDATE account_recovery_codes SET redeemed_at = NULL, redemption_id = NULL WHERE code_hash = $1', [hash]);
    time = new Date(start.getTime() + 61 * 60000);
    assert.equal((await request(app).post('/api/recovery/redeem').send({ code, requestId: randomUUID() })).status, 400);
    assert.equal((await request(app).post('/api/recovery/issue').send({ userId })).status, 404);
  } finally {
    // Only this test's newly generated account and its cascading fixture records.
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.end();
  }
});
