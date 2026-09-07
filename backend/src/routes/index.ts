import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { buildingRoutes } from '../modules/buildings/building.routes.js';
import { ok } from '../types/response.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json(ok({ status: 'ok', time: new Date().toISOString() }));
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/buildings', buildingRoutes);
