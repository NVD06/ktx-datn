import { Download } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { getErrorMessage, getFieldErrors } from '@/api/client'
import { FormDialog } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ImportStudentsResult } from '@/types/user'
import { useImportStudents } from '../hooks/useUsers'
import { downloadStudentTemplate, readStudentSheet, type SheetProblem, type SheetRow } from '../student-account'

type State =
  | { step: 'idle' }
  | { step: 'working'; message: string }
  | { step: 'error'; message: string; problems: SheetProblem[] }
  | { step: 'ready'; rows: SheetRow[]; check: ImportStudentsResult }

/**
 * Nhập danh sách sinh viên từ file Excel: đọc file ngay trên trình duyệt, kiểm tra từng dòng,
 * hỏi backend thử (`dryRun`) xem có trùng tài khoản đã có không, rồi mới cho bấm tạo. Còn dòng
 * lỗi thì không tạo ai — sửa file rồi chọn lại.
 */
export function ImportStudentsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nhập danh sách sinh viên"
      description={
        <>
          File Excel (.xlsx) có dòng tiêu đề: Mã SV, Họ tên, Email, Giới tính (Nam/Nữ); Số điện thoại, Lớp, Khoa
          không bắt buộc. Mật khẩu ban đầu của mỗi sinh viên là mã sinh viên.
        </>
      }
    >
      <ImportForm onDone={() => onOpenChange(false)} />
    </FormDialog>
  )
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const importStudents = useImportStudents()
  const [state, setState] = useState<State>({ step: 'idle' })

  const failed = (problems: SheetProblem[]) =>
    setState({ step: 'error', message: `${problems.length} dòng có lỗi, chưa tạo tài khoản nào.`, problems })

  /** Lỗi của backend theo `rows.<vị trí>.<trường>` → gom lại theo dòng Excel. */
  function showServerError(rows: SheetRow[], error: unknown) {
    const byRow = new Map<number, SheetProblem>()
    for (const [key, messages] of Object.entries(getFieldErrors(error) ?? {})) {
      const at = rows[Number(key.split('.')[1])]
      if (!at) continue
      const problem = byRow.get(at.row) ?? { row: at.row, studentCode: at.studentCode, messages: [] }
      problem.messages.push(...messages)
      byRow.set(at.row, problem)
    }
    if (byRow.size > 0) failed([...byRow.values()].sort((a, b) => a.row - b.row))
    else setState({ step: 'error', message: getErrorMessage(error), problems: [] })
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setState({ step: 'working', message: 'Đang đọc file…' })
    let sheet: Awaited<ReturnType<typeof readStudentSheet>>
    try {
      sheet = await readStudentSheet(file)
    } catch (error) {
      setState({ step: 'error', message: getErrorMessage(error), problems: [] })
      return
    }
    if (sheet.problems.length > 0) return failed(sheet.problems)

    const { rows } = sheet
    setState({ step: 'working', message: `Đang kiểm tra ${rows.length} sinh viên…` })
    try {
      const check = await importStudents.mutateAsync({ rows: rows.map((r) => r.input), dryRun: true })
      setState({ step: 'ready', rows, check })
    } catch (error) {
      showServerError(rows, error)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (state.step !== 'ready') return
    const { rows } = state
    try {
      const { created, skipped } = await importStudents.mutateAsync({ rows: rows.map((r) => r.input), dryRun: false })
      toast.success(`Đã cấp ${created} tài khoản sinh viên` + (skipped > 0 ? `, bỏ qua ${skipped} đã có` : ''))
      onDone()
    } catch (error) {
      // Giữa lần kiểm tra và lúc bấm, người khác có thể vừa tạo trùng — báo lại theo dòng.
      showServerError(rows, error)
    }
  }

  const busy = state.step === 'working' || importStudents.isPending
  const creatable = state.step === 'ready' ? state.check.created : 0

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Chọn file Excel"
          className="min-w-0 flex-1"
          disabled={busy}
          onChange={(e) => {
            void pick(e.target.files?.[0])
            // Sửa file rồi chọn lại đúng file đó vẫn phải đọc lại.
            e.target.value = ''
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => void downloadStudentTemplate()}>
          <Download />
          Tải file mẫu
        </Button>
      </div>

      {state.step === 'working' && <p className="text-muted-foreground text-sm">{state.message}</p>}

      {state.step === 'error' && (
        <div className="space-y-2">
          <p className="text-destructive text-sm">{state.message}</p>
          {state.problems.length > 0 && (
            <ul className="bg-muted/50 max-h-64 space-y-1 overflow-y-auto rounded-md border p-3 text-sm">
              {state.problems.map((p) => (
                <li key={p.row}>
                  <span className="font-medium">
                    Dòng {p.row}
                    {p.studentCode && ` · ${p.studentCode}`}
                  </span>
                  : {p.messages.join('; ')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state.step === 'ready' && (
        <p className="bg-muted/50 rounded-md border p-3 text-sm">
          File có {state.rows.length} sinh viên: <span className="font-medium">{creatable} tài khoản mới</span>
          {state.check.skipped > 0 && `, ${state.check.skipped} đã có tài khoản (bỏ qua)`}.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={importStudents.isPending}>
          Hủy
        </Button>
        <Button type="submit" disabled={busy || creatable === 0}>
          {importStudents.isPending && state.step === 'ready'
            ? 'Đang tạo…'
            : creatable > 0
              ? `Cấp ${creatable} tài khoản`
              : 'Cấp tài khoản'}
        </Button>
      </DialogFooter>
    </form>
  )
}
