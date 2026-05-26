import express, { type NextFunction, type Request, type Response } from 'express';
import type { AppDependencies } from './app-dependencies';
import { createUsersRouter } from './routes/users';
import { createGroupsRouter } from './routes/groups';
import { createStatusRouter } from './routes/status';
import cors from 'cors';

export function createApp(deps: AppDependencies) {
  const app = express();

  // Chrome Private Network Access: must be set before CORS preflight.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
  });

  app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Request-Private-Network'],
  }));

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/users', createUsersRouter(deps));
  app.use('/api/groups', createGroupsRouter(deps));
  app.use('/api/status', createStatusRouter(deps));

  return app;
}
