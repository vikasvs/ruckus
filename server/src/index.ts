import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users';
import groupsRouter from './routes/groups';
import statusRouter from './routes/status';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Chrome Private Network Access: must be set before CORS preflight
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Request-Private-Network'],
}));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/users', usersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/status', statusRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ruckus API server running on port ${PORT}`);
});
