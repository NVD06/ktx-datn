import { zodResolver } from '@hookform/resolvers/zod'
import type { ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fromDateInput, toDateInput } from '@/lib/date-input'
import { showFormError } from '@/lib/form'
import { GENDER, missingFieldLabels, PROFILE_FIELD } from '@/lib/labels'
import type { ProfileField, StudentProfile } from '@/types/profile'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'

// Giữ khớp với backend/src/modules/profile/profile.schema.ts. Ô để trống = xóa giá trị.
const pattern = (re: RegExp, message: string) => z.string().trim().refine((v) => !v || re.test(v), message)
const today = () => toDateInput(new Date().toISOString())
const schema = z.object({
  phone: pattern(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0'),
  dob: z
    .string()
    .refine((v) => !v || v <= today(), 'Ngày sinh không được ở tương lai')
    .refine((v) => !v || `${+v.slice(0, 4) + 15}${v.slice(4)}` <= today(), 'Sinh viên phải đủ 15 tuổi'),
  className: z.string().trim().max(50, 'Lớp tối đa 50 ký tự'),
  faculty: z.string().trim().max(100, 'Khoa tối đa 100 ký tự'),
  hometown: z.string().trim().max(200, 'Quê quán tối đa 200 ký tự'),
  citizenId: pattern(/^\d{12}$/, 'Số CCCD phải gồm đúng 12 chữ số'),
})

type FormValues = z.infer<typeof schema>

/** Thứ tự và thuộc tính riêng của từng ô nhập. */
const FIELDS: { name: ProfileField; input?: ComponentProps<typeof Input>; hint?: string }[] = [
  { name: 'phone', input: { inputMode: 'tel', placeholder: '0912345678' } },
  { name: 'dob', input: { type: 'date' } },
  { name: 'className', input: { placeholder: 'CNTT1' } },
  { name: 'faculty', input: { placeholder: 'Công nghệ thông tin' } },
  { name: 'hometown', input: { placeholder: 'Hà Nội' } },
  { name: 'citizenId', input: { inputMode: 'numeric' }, hint: '12 chữ số trên căn cước công dân' },
]

/** Hồ sơ sinh viên — phải đủ các trường bắt buộc mới nộp được đơn đăng ký (US-02.3). */
export function ProfilePage() {
  const query = useProfile()

  return (
    <>
      <PageHeader
        title="Hồ sơ của tôi"
        description="Thông tin này được dùng khi xét duyệt đơn và lập hợp đồng ở KTX."
      />
      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} />}
      {query.data && <ProfileForm profile={query.data} />}
    </>
  )
}

function ProfileForm({ profile }: { profile: StudentProfile }) {
  const update = useUpdateProfile()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      FIELDS.map(({ name }) => [name, name === 'dob' ? toDateInput(profile.dob) : (profile[name] ?? '')]),
    ) as FormValues,
  })

  function onSubmit(values: FormValues) {
    // zodResolver trả giá trị đã trim; ô trống gửi null để xóa.
    const input = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v || null]))
    update.mutate(
      { ...input, dob: values.dob ? fromDateInput(values.dob) : null },
      {
        onSuccess(saved) {
          toast.success(saved.isComplete ? 'Đã lưu hồ sơ — bạn có thể nộp đơn đăng ký' : 'Đã lưu hồ sơ')
          // Giá trị vừa lưu thành mốc mới — nút Lưu tắt lại cho tới khi sửa tiếp.
          form.reset(values)
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }

  return (
    <div className="space-y-4">
      {profile.isComplete ? (
        <p className="tone-success rounded-md border p-3 text-sm">Hồ sơ đã đủ thông tin để nộp đơn đăng ký ở KTX.</p>
      ) : (
        <p className="tone-warning rounded-md border p-3 text-sm">
          Hồ sơ còn thiếu: <strong>{missingFieldLabels(profile.missingFields)}</strong>. Bạn cần bổ sung trước khi
          nộp đơn đăng ký.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{profile.fullName}</CardTitle>
          <CardDescription>
            {profile.studentCode} · {GENDER[profile.gender].label} · {profile.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map(({ name, input, hint }) => (
                <FormField
                  key={name}
                  label={PROFILE_FIELD[name]}
                  htmlFor={`pf-${name}`}
                  error={form.formState.errors[name]?.message}
                  hint={hint}
                >
                  <Input id={`pf-${name}`} {...input} {...form.register(name)} />
                </FormField>
              ))}
            </div>

            <p className="text-muted-foreground text-xs">
              Mã sinh viên và giới tính không tự sửa được — cần điều chỉnh thì liên hệ quản trị viên.
            </p>

            <div className="flex justify-end">
              <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                {update.isPending ? 'Đang lưu…' : 'Lưu hồ sơ'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
