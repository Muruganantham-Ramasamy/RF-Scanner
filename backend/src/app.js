import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import authRoutes from './routes/auth.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((v) => v.trim()),
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'rf-scanner-backend' });
  });

  app.use('/auth', authRoutes);

  app.use((err, _req, res, _next) => {
    console.error('[api]', err?.message || err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
