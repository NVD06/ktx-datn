/**
 * Lỗi nghiệp vụ do service chủ động ném ra.
 * Mọi lỗi khác lọt tới error-handler đều bị coi là 500.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(code: string, message: string, details?: Record<string, string[]>) {
    return new ApiError(400, code, message, details);
  }

  /** 400 lỗi theo từng field — cùng dạng với lỗi zod, FE gắn thẳng vào form. */
  static validation(details: Record<string, string[]>) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', details);
  }

  static unauthorized(message = 'Bạn cần đăng nhập') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Không tìm thấy dữ liệu') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  /** 409 — xung đột nghiệp vụ, ví dụ phòng đã đủ người. */
  static conflict(code: string, message: string) {
    return new ApiError(409, code, message);
  }
}
