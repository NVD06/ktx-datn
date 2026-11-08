import { Suspense, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import {
  Building2,
  DoorOpen,
  CalendarRange,
  ChartColumn,
  ClipboardList,
  FileSignature,
  Layers,
  LayoutDashboard,
  Megaphone,
  Menu,
  Receipt,
  ScrollText,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'
import { LoadingState } from '@/components/shared/QueryState'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ChangePasswordDialog } from '@/features/auth/components/ChangePasswordDialog'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useBuilding } from '@/features/buildings/hooks/useBuildings'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { SidebarContent } from '@/layouts/SidebarContent'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  /** Bỏ trống = cả ADMIN và MANAGER đều thấy. */
  roles?: Role[]
}

// Phòng và giường không có mục riêng: vào qua Tòa nhà → chi tiết tòa → chi tiết phòng.
// "Báo cáo" sáng cho mọi tab /admin/reports/* (NavLink không đặt `end`).
const NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/buildings', label: 'Tòa nhà', icon: Building2 },
  { to: '/admin/room-types', label: 'Loại phòng', icon: Layers, roles: ['ADMIN'] },
  { to: '/admin/registration-periods', label: 'Đợt đăng ký', icon: CalendarRange, roles: ['ADMIN'] },
  { to: '/admin/registrations', label: 'Đơn đăng ký', icon: ClipboardList },
  { to: '/admin/contracts', label: 'Hợp đồng', icon: FileSignature },
  { to: '/admin/invoices', label: 'Hóa đơn', icon: Receipt },
  { to: '/admin/utilities', label: 'Chốt điện nước', icon: Zap },
  { to: '/admin/maintenance', label: 'Sửa chữa', icon: Wrench },
  { to: '/admin/hygiene', label: 'Vệ sinh', icon: Sparkles },
  { to: '/admin/announcements', label: 'Thông báo', icon: Megaphone },
  { to: '/admin/rules', label: 'Nội quy', icon: ScrollText, roles: ['ADMIN'] },
  { to: '/admin/reports', label: 'Báo cáo', icon: ChartColumn },
  { to: '/admin/users', label: 'Người dùng', icon: Users, roles: ['ADMIN'] },
]

export function AdminLayout() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()
  const [changingPassword, setChangingPassword] = useState(false)
  const building = useBuilding(user?.buildingId ?? '')
  const sidebar = {
    homeTo: '/admin/dashboard',
    title: 'Quản lý KTX',
    subtitle:
      user?.role === 'ADMIN'
        ? 'Quản trị hệ thống'
        : building.data
          ? `Quản lý tòa ${building.data.name}`
          : user?.buildingId
            ? 'Quản lý tòa nhà'
            : 'Chưa được gán tòa',
    items: NAV.filter((i) => !i.roles || (user && i.roles.includes(user.role))).map((i) =>
      i.to === '/admin/buildings' && user?.role === 'MANAGER' && user.buildingId
        ? { ...i, to: `/admin/buildings/${user.buildingId}`, label: 'Danh sách phòng', icon: DoorOpen }
        : i,
    ),
    onChangePassword: () => setChangingPassword(true),
  }

  return (
    <div className="flex min-h-svh">
      {/* sticky + h-svh: bảng dài cuộn thì sidebar đứng yên, tài khoản và nút Đăng xuất luôn ở đáy màn hình. */}
      <aside
        className={cn(
          'bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 z-20 hidden h-svh shrink-0 flex-col overflow-hidden border-r transition-[width] md:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <SidebarContent {...sidebar} collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-10 flex h-14 items-center gap-2 px-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mở menu"
            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <Link to="/admin/dashboard" className="font-semibold text-white">
            Quản lý KTX
          </Link>
        </header>

        {/* Không đặt overflow ở đây: overflow biến <main> thành khung cuộn riêng, đầu trang (PageHeader)
            sẽ dính theo khung đó thay vì theo trang. Bảng rộng tự cuộn ngang trong khung của bảng (min-w-0). */}
        <main className="flex-1 p-4 sm:p-6">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="bg-sidebar text-sidebar-foreground border-sidebar-border gap-0 data-[side=left]:w-64"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Các trang của khu quản trị</SheetDescription>
          <SidebarContent {...sidebar} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
    </div>
  )
}
