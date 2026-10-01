import { api, apiPatch, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type {
  CreateManagerInput,
  ImportStudentsResult,
  StudentAccountInput,
  UserSummary,
  UserUpdateInput,
} from '@/types/user'

export function listUsers(params: ListParams) {
  return getPaged<UserSummary>('/users', params)
}

/** Admin tạo tài khoản quản lý — vai trò luôn MANAGER, backend không nhận `role`. */
export function createManager(input: CreateManagerInput) {
  return apiPost<UserSummary>('/users', input)
}

/** Admin cấp tài khoản sinh viên — mật khẩu ban đầu là mã SV, bắt đổi ở lần đăng nhập đầu. */
export function createStudent(input: StudentAccountInput) {
  return apiPost<UserSummary>('/users/students', input)
}

/**
 * Nhập danh sách sinh viên đọc từ file Excel. `dryRun` chỉ kiểm tra. Còn dòng lỗi thì backend
 * không tạo ai, trả 400 với lỗi theo `rows.<vị trí trong mảng>.<trường>`.
 */
export function importStudents(rows: StudentAccountInput[], dryRun: boolean) {
  return apiPost<ImportStudentsResult>('/users/students/import', { rows, dryRun })
}

/** Đặt lại mật khẩu sinh viên về mã SV — sinh viên phải đổi ở lần đăng nhập kế tiếp. */
export function resetStudentPassword(id: string) {
  return apiPost<UserSummary>(`/users/${id}/reset-password`)
}

/**
 * Xóa hẳn tài khoản — backend chỉ cho xóa tài khoản chưa có lịch sử (cấp nhầm); đã có đơn,
 * hợp đồng… thì 409 kèm lời khuyên khóa tài khoản thay vì xóa.
 */
export async function deleteUser(id: string) {
  await api.delete(`/users/${id}`)
}

/** Gán/gỡ tòa (`buildingId: null` = gỡ) hoặc khóa/mở khóa (`isActive`). */
export function updateUser(id: string, input: UserUpdateInput) {
  return apiPatch<UserSummary>(`/users/${id}`, input)
}
