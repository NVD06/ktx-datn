import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { LOGIN_LIMIT, LOGIN_LIMIT_MINUTES } from '../config/constants.js';
import { ApiError } from '../utils/api-error.js';

const loginKey = (req: Request) => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? email.toLowerCase().trim() : ipKeyGenerator(req.ip ?? '');
};

export const loginLimiter = rateLimit({
  windowMs: LOGIN_LIMIT_MINUTES * 60 * 1000,
  limit: LOGIN_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: loginKey,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => !String(res.getHeader('location') ?? '').includes('error='),
  handler: (_req, _res, next) =>
    next(
      new ApiError(
        429,
        'TOO_MANY_LOGIN_ATTEMPTS',
        `Đăng nhập sai quá ${LOGIN_LIMIT} lần, vui lòng thử lại sau ${LOGIN_LIMIT_MINUTES} phút`,
      ),
    ),
});
