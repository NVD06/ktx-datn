import { CircleCheck, CircleX, ShieldAlert } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TONE_CLASS } from '@/lib/labels'
import { cn } from '@/lib/utils'

const RESULT = {
  success: {
    icon: CircleCheck,
    tone: 'success',
    title: 'Thanh toán thành công',
    text: (code: string) => `Hóa đơn ${code} đã được ghi nhận thanh toán.`,
  },
  failed: {
    icon: CircleX,
    tone: 'danger',
    title: 'Thanh toán không thành công',
    text: (code: string) => `Giao dịch cho hóa đơn ${code} đã bị hủy hoặc lỗi. Bạn có thể thanh toán lại.`,
  },
  invalid: {
    icon: ShieldAlert,
    tone: 'warning',
    title: 'Không xác minh được giao dịch',
    text: () => 'Kết quả trả về không hợp lệ. Nếu tài khoản đã bị trừ tiền, hãy liên hệ ban quản lý.',
  },
} as const

/**
 * Trang VNPay đưa SV về sau khi thanh toán (US-04.5). Backend đã xác nhận giao dịch
 * trước khi chuyển tới đây — trang chỉ đọc kết quả trên URL.
 */
export function PaymentResultPage() {
  const [params] = useSearchParams()
  const status = params.get('status')
  const result = RESULT[status === 'success' || status === 'failed' ? status : 'invalid']
  const Icon = result.icon

  return (
    <>
      <PageHeader title="Kết quả thanh toán" />
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="space-y-3 py-6">
          <div
            className={cn(
              'mx-auto flex size-14 items-center justify-center rounded-full border',
              TONE_CLASS[result.tone],
            )}
          >
            <Icon className="size-7" />
          </div>
          <p className="text-lg font-semibold">{result.title}</p>
          <p className="text-muted-foreground text-sm">{result.text(params.get('invoice') ?? '')}</p>
          <Button asChild>
            <Link to="/student/invoices">Về hóa đơn của tôi</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
