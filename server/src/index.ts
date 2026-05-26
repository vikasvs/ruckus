import { v4 as uuidv4 } from 'uuid';
import { createApp } from './app';
import pool from './db';
import { expoPushSender } from './push';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = createApp({
  pool,
  pushSender: expoPushSender,
  idGenerator: uuidv4,
  now: () => new Date(),
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ruckus API server running on port ${PORT}`);
});
