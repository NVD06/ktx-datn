import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { Button } from '@/components/ui/button'
import { useDialogState } from '@/hooks/useDialogState'
import type { DormRule } from '@/types/dorm-rule'
import { DormRuleDetail, DormRuleTitles } from '../components/DormRuleCards'
import { DormRuleFormDialog } from '../components/DormRuleFormDialog'
import { useDeleteDormRule, useDormRules } from '../hooks/useDormRules'

export function DormRuleListPage() {
  const rules = useDormRules()
  const remove = useDeleteDormRule()
  const form = useDialogState<DormRule>()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<DormRule | null>(null)
  const selected = rules.data?.find((r) => r.id === selectedId) ?? rules.data?.[0]
  const nextOrder = Math.max(0, ...(rules.data ?? []).map((r) => r.sortOrder)) + 1
  return (
    <>
      <PageHeader
        title="Nội quy"
        description="Sinh viên xem nội quy ở trang Thông báo. Mục xếp theo thứ tự, mỗi dòng nội dung là một quy định."
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus />
            Thêm mục
          </Button>
        }
      />
      {rules.isPending && <LoadingState />}
      {rules.isError && <ErrorState error={rules.error} />}
      {rules.data && (
        <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <DormRuleTitles rules={rules.data} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          {selected && (
            <DormRuleDetail
              rule={selected}
              actions={
                <>
                  <Button variant="outline" size="sm" onClick={() => form.show(selected)}>
                    <Pencil />
                    Sửa
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(selected)}>
                    <Trash2 />
                    Xóa
                  </Button>
                </>
              }
            />
          )}
        </div>
      )}
      <DormRuleFormDialog
        open={form.open}
        onOpenChange={form.setOpen}
        rule={form.item}
        nextOrder={nextOrder}
        onSaved={setSelectedId}
      />
      <ConfirmDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        title="Xóa mục nội quy?"
        description={(r) => (
          <>
            Xóa mục <strong>{r.title}</strong>. Sinh viên sẽ không còn thấy các quy định của mục này.
          </>
        )}
        confirmLabel="Xóa mục"
        isPending={remove.isPending}
        onConfirm={(r) =>
          remove.mutateAsync(r.id).then(() => {
            setSelectedId(null)
            toast.success(`Đã xóa mục "${r.title}"`)
          })
        }
      />
    </>
  )
}
