import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './auth.controller.js';
import { registerSchema } from './auth.schema.js';

export const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema), ctrl.register);
authRoutes.get('/me', requireAuth, ctrl.me);
