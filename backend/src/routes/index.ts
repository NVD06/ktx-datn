import { Router } from 'express';
import { z } from 'zod';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { bedRoutes } from '../modules/beds/bed.routes.js';
import { buildingRoutes } from '../modules/buildings/building.routes.js';
import { contractRoutes } from '../modules/contracts/contract.routes.js';
import { invoiceRoutes } from '../modules/invoices/invoice.routes.js';
import { profileRoutes } from '../modules/profile/profile.routes.js';
import { registrationPeriodRoutes } from '../modules/registration-periods/registration-period.routes.js';
import { registrationRoutes } from '../modules/registrations/registration.routes.js';
import { roomTypeRoutes } from '../modules/room-types/room-type.routes.js';
import { roomRoutes } from '../modules/rooms/room.routes.js';
import { userRoutes } from '../modules/users/user.routes.js';
import { ok } from '../types/response.js';
import { defineRoutes } from '../utils/define-routes.js';

const systemRoutes = defineRoutes('/health', 'System');

systemRoutes.get(
  '/',
  {
    summary: 'Kiểm tra API còn sống',
    public: true,
    data: z.object({ status: z.literal('ok'), time: z.iso.datetime() }),
  },
  (_req, res) => {
    res.json(ok({ status: 'ok', time: new Date().toISOString() }));
  },
);

export const apiRouter = Router();

// Mỗi module tự khai báo tiền tố của mình trong defineRoutes().
for (const routes of [
  systemRoutes,
  authRoutes,
  buildingRoutes,
  roomTypeRoutes,
  roomRoutes,
  bedRoutes,
  userRoutes,
  registrationPeriodRoutes,
  registrationRoutes,
  contractRoutes,
  invoiceRoutes,
  profileRoutes,
]) {
  apiRouter.use(routes.prefix, routes.router);
}
