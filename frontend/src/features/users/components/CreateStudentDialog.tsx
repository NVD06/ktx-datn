import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { showFormError } from '@/lib/form'
import { GENDER } from '@/lib/labels'
import { useCreateStudent } from '../hooks/useUsers'
import { studentAccountSchema, toStudentInput, type StudentAccountValues } from '../student-account'

/** Admin cấp tài khoản cho một sinh viên — mật khẩu ban đầu là mã SV, sinh viên đổi ở lần đăng nhập đầu. */
export function CreateStudentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Thêm tài khoản sinh viên"
      description="Mật khẩu ban đầu là mã sinh viên. Sinh viên phải đổi mật khẩu ở lần đăng nhập đầu tiên."
    >
      <CreateStudentForm onDone={() => onOpenChange(false)} />
    </FormDialog>
  )
}

function CreateStudentForm({ onDone }: { onDone: () => void }) {
  const create = useCreateStudent()
  const form = useForm<StudentAccountValues>({
    resolver: zodResolver(studentAccountSchema),
    // Giới tính không đặt sẵn: quyết định tòa được ở, chọn nhầm thì xếp nhầm tòa.
    defaultValues: { studentCode: '', fullName: '', email: '', phone: '', className: '', faculty: '' },
  })
  const err = form.formState.errors

  function onSubmit(values: StudentAccountValues) {
    create.mutate(toStudentInput(values), {
      onSuccess(user) {
        toast.success(`Đã cấp tài khoản cho ${user.fullName}. Mật khẩu ban đầu: ${values.studentCode}`)
        onDone()
      },
      onError: (error) => showFormError(form, error),
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mã sinh viên" htmlFor="st-code" error={err.studentCode?.message}>
          <Input id="st-code" {...form.register('studentCode')} />
        </FormField>
        <FormField label="Giới tính" htmlFor="st-gender" error={err.gender?.message}>
          <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="st-gender" className="w-full" aria-invalid={!!err.gender}>
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="MALE">{GENDER.MALE.label}</SelectItem>
                  <SelectItem value="FEMALE">{GENDER.FEMALE.label}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>
      <FormField label="Họ tên" htmlFor="st-name" error={err.fullName?.message}>
        <Input id="st-name" {...form.register('fullName')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email đăng nhập" htmlFor="st-email" error={err.email?.message}>
          <Input id="st-email" type="email" {...form.register('email')} />
        </FormField>
        <FormField label="Số điện thoại" htmlFor="st-phone" error={err.phone?.message} hint="Không bắt buộc">
          <Input id="st-phone" {...form.register('phone')} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Lớp" htmlFor="st-class" error={err.className?.message} hint="Không bắt buộc">
          <Input id="st-class" {...form.register('className')} />
        </FormField>
        <FormField label="Khoa" htmlFor="st-faculty" error={err.faculty?.message} hint="Không bắt buộc">
          <Input id="st-faculty" {...form.register('faculty')} />
        </FormField>
      </div>

      <FormDialogFooter onCancel={onDone} isPending={create.isPending} submitLabel="Cấp tài khoản" pendingLabel="Đang tạo…" />
    </form>
  )
}
