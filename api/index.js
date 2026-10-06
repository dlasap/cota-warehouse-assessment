import express from 'express';
import { getInventorySnapshot } from '../server/db.js';

// On Vercel this file is the serverless function; locally server/dev.js mounts it.
const app = express();

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/inventory', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(getInventorySnapshot());
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

export default app;
