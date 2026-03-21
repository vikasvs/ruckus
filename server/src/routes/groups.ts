import { Router, Request, Response } from 'express';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create group
router.post('/', async (req: Request, res: Response) => {
  const { name, userId } = req.body;
  if (!name || !userId) {
    res.status(400).json({ error: 'name and userId are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inviteCode = generateInviteCode();
    const groupId = uuidv4();
    const groupResult = await client.query(
      `INSERT INTO groups (id, name, invite_code, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [groupId, name, inviteCode, userId]
    );

    await client.query(
      `INSERT INTO group_members (id, group_id, user_id, is_admin, notifications_enabled)
       VALUES ($1, $2, $3, true, true)`,
      [uuidv4(), groupId, userId]
    );

    await client.query('COMMIT');
    res.status(201).json(groupResult.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Join group by invite code
router.post('/join', async (req: Request, res: Response) => {
  const { inviteCode, userId } = req.body;
  if (!inviteCode || !userId) {
    res.status(400).json({ error: 'inviteCode and userId are required' });
    return;
  }

  try {
    const groupResult = await pool.query(
      `SELECT * FROM groups WHERE invite_code = $1 AND is_active = true`,
      [inviteCode.toUpperCase()]
    );
    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Invalid invite code' });
      return;
    }
    const group = groupResult.rows[0];

    const existingResult = await pool.query(
      `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group.id, userId]
    );
    if (existingResult.rows.length > 0) {
      res.status(409).json({ error: 'Already a member of this group' });
      return;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
      [group.id]
    );
    if (parseInt(countResult.rows[0].count) >= 50) {
      res.status(400).json({ error: 'Group is full (50 member limit)' });
      return;
    }

    const memberResult = await pool.query(
      `INSERT INTO group_members (id, group_id, user_id, is_admin, notifications_enabled)
       VALUES ($1, $2, $3, false, true) RETURNING *`,
      [uuidv4(), group.id, userId]
    );

    res.status(201).json({ group, membership: memberResult.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's groups
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT g.*, gm.id as membership_id, gm.is_admin, gm.notifications_enabled,
              gm.joined_at, gm.current_status, gm.status_updated_at,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND current_status = 'rucked') as active_rucked_count,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND current_status = 'ricked') as active_ricked_count
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.user_id = $1 AND g.is_active = true`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get group by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM groups WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get group members
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT gm.*, u.first_name
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1`,
      [req.params.id]
    );
    const shaped = result.rows.map(row => ({
      id: row.id,
      group_id: row.group_id,
      user_id: row.user_id,
      joined_at: row.joined_at,
      is_admin: row.is_admin,
      notifications_enabled: row.notifications_enabled,
      current_status: row.current_status,
      status_updated_at: row.status_updated_at,
      users: { first_name: row.first_name },
    }));
    res.json(shaped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update member (notifications toggle)
router.patch('/:groupId/members/:userId', async (req: Request, res: Response) => {
  const { notifications_enabled } = req.body;
  try {
    const result = await pool.query(
      `UPDATE group_members SET notifications_enabled = $1
       WHERE group_id = $2 AND user_id = $3 RETURNING *`,
      [notifications_enabled, req.params.groupId, req.params.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
