import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { LOGIN_IP_LIMIT, LOGIN_LIMIT, LOGIN_LIMIT_MINUTES } from '../config/constants.js';
import { ApiError } from '../utils/api-error.js';

const ipKey = (req: Request) => ipKeyGenerator(req.ip ?? '');
const loginKey = (req: Request) => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? `${email.toLowerCase().trim()}|${ipKey(req)}` : ipKey(req);
};
const loginLimit = (limit: number, keyGenerator: (req: Request) => string, message: string) =>
  rateLimit({
    windowMs: LOGIN_LIMIT_MINUTES * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_req, res) => !String(res.getHeader('location') ?? '').includes('error='),
    handler: (_req, _res, next) => next(new ApiError(429, 'TOO_MANY_LOGIN_ATTEMPTS', message)),
  });
export const loginLimiter = loginLimit(
  LOGIN_LIMIT,
  loginKey,
  `Đăng nhập sai quá ${LOGIN_LIMIT} lần, vui lòng thử lại sau ${LOGIN_LIMIT_MINUTES} phút`,
);
export const loginIpLimiter = loginLimit(
  LOGIN_IP_LIMIT,
  ipKey,
  `Có quá nhiều lần đăng nhập sai từ mạng này, vui lòng thử lại sau ${LOGIN_LIMIT_MINUTES} phút`,
);
