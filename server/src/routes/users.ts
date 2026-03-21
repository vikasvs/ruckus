import { Router, Request, Response } from 'express';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create user (replaces sign-up + name entry)
router.post('/', async (req: Request, res: Response) => {
  const { first_name, phone } = req.body;
  if (!first_name) {
    res.status(400).json({ error: 'first_name is required' });
    return;
  }

  try {
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO users (id, first_name, phone) VALUES ($1, $2, $3) RETURNING *`,
      [id, first_name, phone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.patch('/:id', async (req: Request, res: Response) => {
  const { first_name, push_token, device_platform } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        push_token = COALESCE($2, push_token),
        device_platform = COALESCE($3, device_platform),
        last_active = NOW()
      WHERE id = $4 RETURNING *`,
      [first_name, push_token, device_platform, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
