import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { invoiceStatus } from '@/lib/labels'
import { useInvoice } from '../hooks/useInvoices'
import { InvoiceDetailView } from './InvoiceDetailView'

/**
 * Chi tiết hóa đơn — trang hóa đơn của người quản lý và của sinh viên. Gọi API riêng vì dòng của bảng không có các
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-xl">
        {query.isPending && <LoadingState />}
        {query.isError && <ErrorState error={query.error} />}
        {query.data && (
          <>
            <SheetHeader className="border-b pr-12">
              <SheetTitle>Hóa đơn {query.data.code}</SheetTitle>
              <SheetDescription>{query.data.contract.student.fullName}</SheetDescription>
              <div className="pt-2">
                <StatusBadge {...invoiceStatus(query.data)} />
              </div>
            </SheetHeader>
            <div className="px-4 pb-6">
              <InvoiceDetailView invoice={query.data} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
