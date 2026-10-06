// Local server. In dev, Vite (port 5173) proxies /api here.
// After `npm run build`, this also serves the built app from dist/.
import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import api from '../api/index.js';

const PORT = Number(process.env.PORT) || 3001;
const dist = fileURLToPath(new URL('../dist', import.meta.url));

const app = express();
app.use(api);
if (existsSync(dist)) app.use(express.static(dist));

app.listen(PORT, () => console.log(`CoTa API listening on http://localhost:${PORT}`));
