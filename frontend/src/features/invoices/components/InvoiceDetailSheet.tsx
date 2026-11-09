import { BellRing } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDateTime } from '@/lib/format'
import { invoiceStatus, remindAction } from '@/lib/labels'
import { useInvoice, useRemindInvoices } from '../hooks/useInvoices'
import { InvoiceDetailView } from './InvoiceDetailView'

/**
 * Chi tiết hóa đơn ở trang hóa đơn của người quản lý. Gọi API riêng vì dòng của bảng không có các
 * dòng hóa đơn và lịch sử thanh toán.
 */
export function InvoiceDetailSheet({
  invoiceId,
  open,
  onOpenChange,
}: {
  invoiceId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const query = useInvoice(invoiceId)
  const invoice = query.data
  const remind = useRemindInvoices()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-xl">
        {query.isPending && <LoadingState />}
        {query.isError && <ErrorState error={query.error} />}
        {invoice && (
          <>
            <SheetHeader className="border-b pr-12">
              <SheetTitle>Hóa đơn {invoice.code}</SheetTitle>
              <SheetDescription>{invoice.contract.student.fullName}</SheetDescription>
              <div className="pt-2">
                <StatusBadge {...invoiceStatus(invoice)} />
              </div>
            </SheetHeader>
            <div className="px-4 pb-6">
              <InvoiceDetailView invoice={invoice} />
            </div>
            {invoice.status === 'UNPAID' && (
              <SheetFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
                {invoice.remindedAt && (
                  <span className="text-muted-foreground mr-auto text-xs">
                    Nhắc gần nhất {formatDateTime(invoice.remindedAt)}
                  </span>
                )}
                <Button
                  variant="outline"
                  disabled={remindAction(invoice, remind.isPending).disabled}
                  onClick={() => remind.mutate([invoice.id], { onError: (error) => toast.error(getErrorMessage(error)) })}
                >
                  <BellRing />
                  {remindAction(invoice, remind.isPending).label}
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
