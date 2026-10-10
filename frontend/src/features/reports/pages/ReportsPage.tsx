import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

/** Các báo cáo của US-06, mỗi mục một trang con — thứ tự theo backlog. */
const REPORTS = [
  { path: 'occupancy', label: 'Lấp đầy' }, // US-06.2
  { path: 'finance', label: 'Doanh thu & công nợ' }, // US-06.3
  { path: 'maintenance', label: 'Sửa chữa & vệ sinh' }, // US-06.4
] as const

/**
 * Khung chung của khu Báo cáo: đầu trang + thanh tab, trang con hiện ở dưới. Tab là link nên
 * mỗi báo cáo có URL riêng (gửi link, tải lại vẫn đúng tab). Backend tự giới hạn phạm vi:
 * MANAGER chỉ thấy số liệu tòa mình.
 */
export function ReportsPage() {
  return (
    <>
      <PageHeader title="Báo cáo" description="Số liệu tính trực tiếp từ dữ liệu nghiệp vụ, không lưu bảng thống kê riêng." />
      <nav aria-label="Các báo cáo" className="mb-6 flex gap-1 border-b">
        {REPORTS.map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-primary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  )
}
