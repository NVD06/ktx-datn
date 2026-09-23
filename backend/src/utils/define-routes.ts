import { Router, type RequestHandler } from 'express';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { z } from 'zod';
import {
  errorResponses,
  jsonBody,
  okResponse,
  okSchema,
  pagedSchema,
  registry,
  security,
} from '../config/openapi.js';
import { validate } from '../middlewares/validate.js';
import { idParamsSchema } from './query-schema.js';

type ErrorStatus = Parameters<typeof errorResponses>[number];

type RouteDoc = {
  summary: string;
  description?: string;
  /** Tag thêm ngoài tag của router, ví dụ phòng trong tòa: `['Rooms']`. */
  tags?: string[];
  query?: NonNullable<RouteConfig['request']>['query'];
  /** Body JSON — tự gắn `validate(body)` ngay trước controller. */
  body?: z.ZodType;
  /** 201 cho endpoint tạo mới (controller tự trả status, đây chỉ là tài liệu). */
  status?: 200 | 201;
  errors?: ErrorStatus[];
  /** Không cần đăng nhập. Mặc định: cần cookie phiên. */
  public?: boolean;
} & ({ data: z.ZodType; paged?: never } | { paged: z.ZodType; data?: never });

type Method = 'get' | 'post' | 'patch' | 'delete';

/**
 * Router Express kèm tài liệu OpenAPI (/docs): mỗi route khai báo đúng một lần,
 * vừa gắn handler vừa sinh tài liệu, nên hai thứ không thể lệch nhau.
 *
 *   export const buildingRoutes = defineRoutes('/buildings', 'Buildings', requireAuth);
 *   buildingRoutes.get('/:id', { summary: 'Chi tiết tòa nhà', data: buildingSchema, errors: [401, 404] }, ctrl.getById);
 *
 * Tự điền: tag của router, `security` (trừ `public`), params `{id}` khi đường
 * dẫn có `:id`, và `validate(body)`. Handler cuối cùng luôn là controller.
 * `middlewares` áp cho mọi route của router (xác thực, vai trò).
 */
export function defineRoutes(prefix: string, tag: string, ...middlewares: RequestHandler[]) {
  const router = Router();
  if (middlewares.length > 0) router.use(...middlewares);

  const add =
    (method: Method) =>
    (path: string, doc: RouteDoc, ...handlers: RequestHandler[]) => {
      const status = doc.status ?? 200;
      const request = {
        ...(path.includes(':id') ? { params: idParamsSchema } : {}),
        ...(doc.query ? { query: doc.query } : {}),
        ...(doc.body ? { body: jsonBody(doc.body) } : {}),
      };

      registry.registerPath({
        method,
        // Express '/:id/beds' -> OpenAPI '/rooms/{id}/beds'
        path: prefix + (path === '/' ? '' : path.replace(/:(\w+)/g, '{$1}')),
        tags: [tag, ...(doc.tags ?? [])],
        summary: doc.summary,
        ...(doc.description ? { description: doc.description } : {}),
        ...(doc.public ? {} : { security }),
        ...(Object.keys(request).length > 0 ? { request } : {}),
        responses: {
          [status]: doc.paged
            ? okResponse('Danh sách có phân trang', pagedSchema(doc.paged))
            : okResponse(status === 201 ? 'Đã tạo' : 'Thành công', okSchema(doc.data)),
          ...errorResponses(...(doc.errors ?? [])),
        },
      });

      const controller = handlers.slice(-1);
      const guards = handlers.slice(0, -1);
      router[method](path, ...guards, ...(doc.body ? [validate(doc.body)] : []), ...controller);
    };

  return { prefix, router, get: add('get'), post: add('post'), patch: add('patch'), delete: add('delete') };
}
