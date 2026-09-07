import { createHash } from 'node:crypto';
import { Router } from 'express';
import type { AppDependencies } from '../app-dependencies';

export function createRecoveryRouter({ pool, now }: Pick<AppDependencies, 'pool' | 'now'>) {
  const router = Router();
  // Per-process limit deliberately uses the socket IP, not an untrusted forwarded header.
  // Proxy deployments share a bucket. The 160-bit code is the primary guessing protection.
  const attempts = new Map<string, { count: number; until: number }>();
  router.post('/redeem', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const timestamp = now();
    const ms = timestamp.getTime();
    for (const [key, bucket] of attempts) if (bucket.until <= ms) attempts.delete(key);
    const ip = req.socket.remoteAddress || 'unknown';
    const bucket = attempts.get(ip) || { count: 0, until: ms + 60000 };
    if (bucket.count >= 30 || (!attempts.has(ip) && attempts.size >= 10000)) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Too many attempts. Please wait a minute and try again.' });
      return;
    }
    ++bucket.count;
    attempts.set(ip, bucket);
    const code = typeof req.body?.code === 'string' ? req.body.code.replace(/[\s-]/g, '').toUpperCase() : '';
    const requestId = req.body?.requestId;
    const invalid = 'This recovery code is invalid, expired, or already used. Ask for a new code.';
    if (!/^[A-F0-9]{40}$/.test(code) || typeof requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)) {
      res.status(400).json({ error: invalid });
      return;
    }
    try {
      // One atomic update prevents two devices claiming the same code. Only the original
      // request ID may retry briefly after a dropped response or a local storage failure.
      const result = await pool.query(`WITH redeemed AS (
        UPDATE account_recovery_codes
        SET redeemed_at = COALESCE(redeemed_at, $3::timestamptz),
            redemption_id = COALESCE(redemption_id, $2::uuid)
        WHERE code_hash = $1 AND expires_at > $3::timestamptz
          AND (redeemed_at IS NULL OR (redemption_id = $2::uuid AND redeemed_at > $3::timestamptz - INTERVAL '10 minutes'))
        RETURNING user_id
      ) SELECT u.id, u.first_name, u.created_at, u.last_active
        FROM users u JOIN redeemed r ON r.user_id = u.id`,
      [createHash('sha256').update(code).digest('hex'), requestId, timestamp.toISOString()]);
      if (!result.rows[0]) { res.status(400).json({ error: invalid }); return; }
      res.json(result.rows[0]);
    } catch {
      // Never log credentials or return database internals.
      res.status(503).json({ error: 'Recovery is temporarily unavailable. Keep your code and try again.' });
    }
  });
  return router;
}
