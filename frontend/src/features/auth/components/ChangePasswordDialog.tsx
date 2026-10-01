import { toast } from 'sonner'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { ChangePasswordForm } from './ChangePasswordForm'

/** Tự đổi mật khẩu bất cứ lúc nào — nút "Đổi mật khẩu" ở sidebar của cả hai layout. */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Đổi mật khẩu"
      description="Lần đăng nhập sau dùng mật khẩu mới."
    >
      <ChangePasswordForm
        onDone={() => {
          toast.success('Đã đổi mật khẩu')
          onOpenChange(false)
        }}
        footer={(isPending) => (
          <FormDialogFooter
            onCancel={() => onOpenChange(false)}
            isPending={isPending}
            submitLabel="Đổi mật khẩu"
          />
        )}
      />
    </FormDialog>
  )
}
