import { Router } from 'express';
import { ok } from '../types/response.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json(ok({ status: 'ok', time: new Date().toISOString() }));
});

// Các module nghiệp vụ mount tại đây:
// apiRouter.use('/buildings', buildingRoutes);
