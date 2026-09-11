import { Router } from 'express';
import { z } from 'zod';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { buildingRoutes } from '../modules/buildings/building.routes.js';
import { okResponse, okSchema, registry } from '../config/openapi.js';
import { ok } from '../types/response.js';

export const apiRouter = Router();

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Kiểm tra API còn sống',
  responses: {
    200: okResponse(
      'OK',
      okSchema(z.object({ status: z.literal('ok'), time: z.iso.datetime() })),
    ),
  },
});
apiRouter.get('/health', (_req, res) => {
  res.json(ok({ status: 'ok', time: new Date().toISOString() }));
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/buildings', buildingRoutes);
