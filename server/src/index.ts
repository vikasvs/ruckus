import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users';
import groupsRouter from './routes/groups';
import statusRouter from './routes/status';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
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
