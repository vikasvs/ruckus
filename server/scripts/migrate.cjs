const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'));
    // Keep the new notification selector consistent with existing mute choices.
    await client.query("UPDATE group_members SET notification_mode = 'muted' WHERE notifications_enabled = false AND notification_mode = 'all_activity'");
    await client.query('COMMIT');
    console.log('Ruckus schema migration completed; existing data preserved.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch((error) => { console.error(error.message); process.exitCode = 1; });
