import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import * as ctrl from './building.controller.js';

export const buildingRoutes = Router();

// Sinh viên không quản lý tòa nhà -> chỉ ADMIN và MANAGER được vào.
buildingRoutes.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

buildingRoutes.get('/', ctrl.list);
