import { Router, type Request, type Response } from 'express';
import type { AppDependencies } from '../app-dependencies';

interface UserRow extends Record<string, unknown> {
  id: string;
  phone: string | null;
  first_name: string;
  created_at: string;
  last_active: string;
  push_token: string | null;
  device_platform: string | null;
}

export function createUsersRouter({ pool, idGenerator }: Pick<AppDependencies, 'pool' | 'idGenerator'>) {
  const router = Router();

  // Create user (replaces sign-up + name entry)
  router.post('/', async (req: Request, res: Response) => {
    const { first_name, phone } = req.body;
    if (!first_name) {
      res.status(400).json({ error: 'first_name is required' });
      return;
    }

    try {
      const id = idGenerator();
      const result = await pool.query<UserRow>(
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
      const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.id]);
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
    const nextFirstName = typeof first_name === 'string' ? first_name.trim() : undefined;

    if (first_name !== undefined && !nextFirstName) {
      res.status(400).json({ error: 'first_name cannot be empty' });
      return;
    }

    try {
      const result = await pool.query<UserRow>(
        `UPDATE users SET
          first_name = COALESCE($1, first_name),
          push_token = COALESCE($2, push_token),
          device_platform = COALESCE($3, device_platform),
          last_active = NOW()
        WHERE id = $4 RETURNING *`,
        [nextFirstName, push_token, device_platform, req.params.id]
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

  return router;
}
