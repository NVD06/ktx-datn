import { z } from 'zod'
import type { StudentAccountInput } from '@/types/user'

/*
 * Tài khoản sinh viên do Admin cấp — dùng chung cho form tạo lẻ và từng dòng của file Excel,
 * để hai đường nhập kiểm tra giống hệt nhau.
 */

// Giữ khớp với studentAccountSchema ở backend/src/modules/users/user.schema.ts. Ô không bắt
// buộc để chuỗi rỗng ở đây (dễ dùng với form), `toStudentInput` bỏ đi trước khi gửi.
export const studentAccountSchema = z.object({
  studentCode: z.string().trim().min(3, 'Mã sinh viên quá ngắn').max(20, 'Mã sinh viên tối đa 20 ký tự'),
  fullName: z.string().trim().min(2, 'Họ tên quá ngắn').max(100, 'Họ tên tối đa 100 ký tự'),
  email: z.string().trim().toLowerCase().pipe(z.email('Email không hợp lệ')),
  gender: z.enum(['MALE', 'FEMALE'], 'Giới tính phải là Nam hoặc Nữ'),
  phone: z
    .string()
    .trim()
    .regex(/^(0\d{9})?$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0'),
  className: z.string().trim().max(50, 'Lớp tối đa 50 ký tự'),
  faculty: z.string().trim().max(100, 'Khoa tối đa 100 ký tự'),
})

export type StudentAccountValues = z.infer<typeof studentAccountSchema>

/** Giá trị đã kiểm tra → body gửi backend: bỏ các ô không bắt buộc để trống. */
export function toStudentInput({ phone, className, faculty, ...required }: StudentAccountValues): StudentAccountInput {
  return {
    ...required,
    ...(phone ? { phone } : {}),
    ...(className ? { className } : {}),
    ...(faculty ? { faculty } : {}),
  }
}

// ── File Excel ──────────────────────────────────────────────────────────────

type Field = keyof StudentAccountValues

/**
 * Cột của file Excel theo thứ tự file mẫu. Khi đọc thì tìm cột theo tiêu đề (không phân
 * biệt hoa thường, có dấu hay không), nên đổi thứ tự cột hay dùng tên gọi khác vẫn được.
 */
export const EXCEL_COLUMNS: { field: Field; title: string; aliases: string[]; required: boolean; width: number }[] = [
  { field: 'studentCode', title: 'Mã SV', aliases: ['MSSV', 'Mã sinh viên'], required: true, width: 14 },
  { field: 'fullName', title: 'Họ tên', aliases: ['Họ và tên'], required: true, width: 26 },
  { field: 'email', title: 'Email', aliases: [], required: true, width: 32 },
  { field: 'gender', title: 'Giới tính', aliases: [], required: true, width: 11 },
  { field: 'phone', title: 'Số điện thoại', aliases: ['SĐT', 'Điện thoại'], required: false, width: 15 },
  { field: 'className', title: 'Lớp', aliases: [], required: false, width: 12 },
  { field: 'faculty', title: 'Khoa', aliases: [], required: false, width: 26 },
]

/** "Họ và Tên *" → "ho va ten": bỏ dấu, bỏ dấu * của cột bắt buộc, chữ thường, gộp khoảng trắng. */
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/\*/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const GENDER_WORDS: Record<string, 'MALE' | 'FEMALE'> = { nam: 'MALE', male: 'MALE', nu: 'FEMALE', female: 'FEMALE' }

/** Một dòng đọc được: `row` là số dòng trong Excel để Admin tìm đúng chỗ sửa. */
export interface SheetRow {
  row: number
  studentCode: string
  input: StudentAccountInput
}

export interface SheetProblem {
  row: number
  studentCode: string
  messages: string[]
}

/**
 * Đọc sheet đầu tiên của file .xlsx: dòng có chữ đầu tiên là dòng tiêu đề, bỏ qua dòng trống.
 * Ném lỗi khi không đọc được file hoặc thiếu cột bắt buộc; còn lỗi của từng dòng trả về trong
 * `problems` để hiện một lượt.
 */
export async function readStudentSheet(file: File): Promise<{ rows: SheetRow[]; problems: SheetProblem[] }> {
  // Tải thư viện khi cần: chỉ Admin nhập Excel mới dùng tới.
  const { readSheet } = await import('read-excel-file/browser')
  // Giữ số dưới dạng chuỗi: mã SV, số điện thoại không bị đổi thành số.
  const sheet = await readSheet(file, { parseNumber: (value) => value }).catch(() => {
    throw new Error('Không đọc được file. Hãy chọn file Excel .xlsx theo mẫu.')
  })
  const text = (cell: unknown) => (cell === null || cell === undefined ? '' : String(cell).trim())

  const headerIndex = sheet.findIndex((cells) => cells.some((cell) => text(cell) !== ''))
  if (headerIndex < 0) throw new Error('File không có dữ liệu')
  const headers = sheet[headerIndex]!.map((cell) => normalize(text(cell)))

  const columnOf = new Map<Field, number>()
  for (const column of EXCEL_COLUMNS) {
    const names = [column.title, ...column.aliases].map(normalize)
    const index = headers.findIndex((header) => names.includes(header))
    if (index >= 0) columnOf.set(column.field, index)
  }
  const missing = EXCEL_COLUMNS.filter((c) => c.required && !columnOf.has(c.field)).map((c) => c.title)
  if (missing.length > 0) throw new Error(`File thiếu cột: ${missing.join(', ')}. Hãy dùng đúng file mẫu.`)

  const titleOf = (field: PropertyKey) => EXCEL_COLUMNS.find((c) => c.field === field)?.title ?? String(field)
  const entries: (SheetProblem & { email: string; input?: StudentAccountInput })[] = []
  sheet.slice(headerIndex + 1).forEach((cells, i) => {
    if (cells.every((cell) => text(cell) === '')) return
    const row = headerIndex + i + 2
    const get = (field: Field) => {
      const index = columnOf.get(field)
      return index === undefined ? '' : text(cells[index])
    }

    let phone = get('phone')
    // Ô số trong Excel làm mất số 0 đầu: 912345678 → 0912345678.
    if (/^\d{9}$/.test(phone)) phone = `0${phone}`
    const values = {
      studentCode: get('studentCode'),
      fullName: get('fullName'),
      email: get('email'),
      gender: GENDER_WORDS[normalize(get('gender'))] ?? get('gender'),
      phone,
      className: get('className'),
      faculty: get('faculty'),
    }

    const parsed = studentAccountSchema.safeParse(values)
    entries.push({
      row,
      studentCode: values.studentCode,
      email: values.email.toLowerCase(),
      input: parsed.success ? toStudentInput(parsed.data) : undefined,
      messages: parsed.success ? [] : parsed.error.issues.map((i) => `${titleOf(i.path[0] ?? '')}: ${i.message}`),
    })
  })
  if (entries.length === 0) throw new Error('File không có dòng sinh viên nào')

  // Trùng ngay trong file — báo cùng lượt với lỗi định dạng (backend cũng kiểm tra lại).
  for (const key of ['studentCode', 'email'] as const) {
    const count = new Map<string, number>()
    for (const e of entries) if (e[key]) count.set(e[key], (count.get(e[key]) ?? 0) + 1)
    for (const e of entries) {
      if (count.get(e[key])! > 1) e.messages.push(`${titleOf(key)}: xuất hiện nhiều lần trong file`)
    }
  }

  const rows: SheetRow[] = []
  const problems: SheetProblem[] = []
  for (const { row, studentCode, input, messages } of entries) {
    if (messages.length > 0 || !input) problems.push({ row, studentCode, messages })
    else rows.push({ row, studentCode, input })
  }
  return { rows, problems }
}

/** File mẫu để Admin điền: dòng tiêu đề + một dòng ví dụ, ô mã SV và số điện thoại dạng chữ. */
export async function downloadStudentTemplate() {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const example: Record<Field, string> = {
    studentCode: '21010001',
    fullName: 'Nguyễn Văn A',
    email: '21010001@st.example.edu.vn',
    gender: 'Nam',
    phone: '0912345678',
    className: 'CNTT1',
    faculty: 'Công nghệ thông tin',
  }
  await writeXlsxFile(
    [
      EXCEL_COLUMNS.map((c) => ({ value: c.required ? `${c.title} *` : c.title, fontWeight: 'bold' as const })),
      EXCEL_COLUMNS.map((c) => ({ value: example[c.field], type: String })),
    ],
    { columns: EXCEL_COLUMNS.map((c) => ({ width: c.width })), stickyRowsCount: 1 },
  ).toFile('mau-danh-sach-sinh-vien.xlsx')
}
