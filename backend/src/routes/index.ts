import { Router } from 'express';
import { z } from 'zod';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { bedRoutes } from '../modules/beds/bed.routes.js';
import { buildingRoutes } from '../modules/buildings/building.routes.js';
import { registrationPeriodRoutes } from '../modules/registration-periods/registration-period.routes.js';
import { roomTypeRoutes } from '../modules/room-types/room-type.routes.js';
import { roomRoutes } from '../modules/rooms/room.routes.js';
import { userRoutes } from '../modules/users/user.routes.js';
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
apiRouter.use('/room-types', roomTypeRoutes);
apiRouter.use('/rooms', roomRoutes);
apiRouter.use('/beds', bedRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/registration-periods', registrationPeriodRoutes);
