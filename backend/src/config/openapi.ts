import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * Tài liệu API (Swagger / OpenAPI) được SINH từ chính các zod schema đang dùng
 * để validate — không viết tay YAML. Nhờ vậy schema chỉ có một nguồn duy nhất:
 * sửa zod là tài liệu đổi theo.
 *
 * Các module không gọi `registry` trực tiếp mà khai báo route qua
 * `defineRoutes()` (utils/define-routes.ts) — vừa gắn handler vừa sinh tài liệu.
 *
 * File này phải được import TRƯỚC mọi schema có dùng `.openapi()` — nên các
 * file *.schema.ts import nó ở dòng đầu tiên.
 */
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

/** Tên cookie phiên của Auth.js (JWT strategy). */
export const SESSION_COOKIE = 'authjs.session-token';

registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: SESSION_COOKIE,
  description:
    'Cookie phiên do Auth.js cấp sau khi đăng nhập qua POST /auth/callback/credentials. ' +
    'Trình duyệt tự gửi kèm nếu đã đăng nhập trên cùng origin. Qua HTTPS (bản deploy) tên cookie ' +
    'có thêm tiền tố: __Secure-authjs.session-token.',
});

/** `security` của mọi endpoint cần đăng nhập — defineRoutes() tự gắn, trừ route `public`. */
export const security = [{ cookieAuth: [] }];

// ---- Schema dùng chung cho response (khớp types/response.ts) ----

export const paginationMetaSchema = z
  .object({
    page: z.int().min(1),
    limit: z.int().min(1),
    total: z.int().min(0),
  })
  .openapi('PaginationMeta');

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string().openapi({ example: 'Dữ liệu không hợp lệ' }),
      details: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .openapi({ example: { email: ['Email không hợp lệ'] } }),
    }),
  })
  .openapi('ErrorResponse');

/** Bọc `data` theo dạng `{ success: true, data }` của helper ok(). */
export function okSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({ success: z.literal(true), data });
}

/** Danh sách có phân trang: `{ success: true, data: T[], meta }`. */
export function pagedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ success: z.literal(true), data: z.array(item), meta: paginationMetaSchema });
}

/** Body JSON cho request hoặc response: `request: { body: jsonBody(schema) }`. */
export const jsonBody = <T extends z.ZodTypeAny>(schema: T) => ({
  content: { 'application/json': { schema } },
});

/** Response thành công (200/201) với body JSON. */
export function okResponse<T extends z.ZodTypeAny>(description: string, schema: T) {
  return { description, ...jsonBody(schema) };
}

/** Các response lỗi chuẩn, chọn theo mã HTTP: errorResponses(400, 401, 403). */
export function errorResponses(...codes: (400 | 401 | 403 | 404 | 409)[]) {
  const text: Record<number, string> = {
    400: 'Dữ liệu không hợp lệ',
    401: 'Chưa đăng nhập hoặc phiên hết hạn',
    403: 'Không có quyền thực hiện',
    404: 'Không tìm thấy',
    409: 'Xung đột dữ liệu (đã tồn tại)',
  };
  return Object.fromEntries(
    codes.map((c) => [c, { description: text[c], ...jsonBody(errorResponseSchema) }]),
  );
}

/** Gọi sau khi mọi module route đã được import (để registry đã đủ path). */
export function buildOpenApiDoc() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'KTX API',
      version: '1.0.0',
      description:
        'API quản lý ký túc xá. Mọi response đều có dạng `{ success, data | error }` ' +
        '(xem docs/convention.md §3).\n\n' +
        '**Đăng nhập** không nằm trong /api/v1 mà do Auth.js xử lý: ' +
        '`POST /auth/callback/credentials` (form-urlencoded: `email`, `password`, `csrfToken` lấy từ `GET /auth/csrf`). ' +
        'Sau đó cookie phiên được gửi tự động cho các endpoint bên dưới.',
    },
    servers: [{ url: '/api/v1' }],
    tags: [
      { name: 'System', description: 'Kiểm tra tình trạng hệ thống' },
      { name: 'Auth', description: 'Đăng ký và thông tin người dùng hiện tại' },
      { name: 'Buildings', description: 'Tòa nhà (ADMIN, MANAGER)' },
      { name: 'Room types', description: 'Danh mục loại phòng dùng chung toàn hệ thống' },
      { name: 'Rooms', description: 'Phòng theo tòa nhà' },
      { name: 'Beds', description: 'Giường trong phòng' },
      { name: 'Users', description: 'Tài khoản người dùng (ADMIN)' },
      { name: 'Registration periods', description: 'Đợt đăng ký ở KTX — tối đa 1 đợt mở' },
      { name: 'Registrations', description: 'Đơn đăng ký ở KTX' },
      { name: 'Contracts', description: 'Hợp đồng ở KTX: ký, hủy chờ ký, gia hạn, chấm dứt' },
      { name: 'Invoices', description: 'Hóa đơn tiền phòng và điện nước' },
      { name: 'Profile', description: 'Hồ sơ của sinh viên đang đăng nhập' },
    ],
  });
}
