import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { formatMoney } from '@/lib/format'
import { invoiceStatus } from '@/lib/labels'
import { useInvoice, usePayInvoice } from '../hooks/useInvoices'
import { InvoiceDetailView } from './InvoiceDetailView'

/**
 * Chi tiết hóa đơn — trang hóa đơn của người quản lý và của sinh viên. Gọi API riêng vì dòng của bảng không có các
 * dòng hóa đơn và lịch sử thanh toán. Sinh viên thanh toán hóa đơn chưa trả ngay tại đây (US-04.4).
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
  const { user } = useAuth()
  const pay = usePayInvoice()
  const invoice = query.data

  function startPayment(id: string) {
    pay.mutate(id, {
      // Rời hẳn trang để sang cổng VNPay — thanh toán xong VNPay đưa về trang kết quả.
      onSuccess: ({ payUrl }) => window.location.assign(payUrl),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

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
            {user?.role === 'STUDENT' && invoice.status === 'UNPAID' && (
              <SheetFooter className="border-t">
                <Button disabled={pay.isPending} onClick={() => startPayment(invoice.id)}>
                  {pay.isPending ? 'Đang chuyển sang VNPay…' : `Thanh toán ${formatMoney(invoice.amount)} qua VNPay`}
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
