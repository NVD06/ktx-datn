import type { MouseEvent } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { KeyRound, LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth, useLogout } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
interface Props {
  homeTo: string
  title: string
  subtitle: string
  items: { to: string; label: string; icon: LucideIcon }[]
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
  onChangePassword: () => void
}
const FLYOUT_TARGET = 'group/flyout hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:text-sidebar-primary bg-clip-border transition-none hover:rounded-r-none active:not-aria-[haspopup]:translate-none'
function placeFlyout({ currentTarget: el }: MouseEvent<HTMLElement>) {
  const { top, right, height } = el.getBoundingClientRect()
  el.style.setProperty('--flyout-top', `${top}px`)
  el.style.setProperty('--flyout-left', `${right}px`)
  el.style.setProperty('--flyout-height', `${height}px`)
}
function Flyout({ label }: { label: string }) {
  return (
    <span className="bg-sidebar-accent text-sidebar-primary fixed top-(--flyout-top) left-(--flyout-left) z-50 hidden h-(--flyout-height) items-center rounded-r-md px-3 text-sm font-medium whitespace-nowrap group-hover/flyout:flex">
      {label}
    </span>
  )
}
export function SidebarContent({ homeTo, title, subtitle, items, collapsed = false, onToggle, onNavigate, onChangePassword }: Props) {
  const { user } = useAuth()
  const logout = useLogout()
  const flyoutProps = (label: string) => (collapsed ? { 'aria-label': label, onMouseEnter: placeFlyout } : {})
  const footerButton = cn(
    'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full bg-transparent',
    collapsed ? cn('dark:bg-transparent border-transparent dark:border-transparent', FLYOUT_TARGET) : 'border-sidebar-border',
  )
  return (
    <>
      <div className={cn('border-sidebar-border flex h-19 shrink-0 items-center gap-2 border-b whitespace-nowrap', collapsed ? 'justify-center' : 'justify-between pr-2 pl-4')}>
        {!collapsed && (
          <div className="min-w-0">
            <Link to={homeTo} className="text-sidebar-accent-foreground font-semibold" onClick={onNavigate}>
              {title}
            </Link>
            <p className="text-sidebar-foreground/60 mt-0.5 truncate text-xs">{subtitle}</p>
          </div>
        )}
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            title={collapsed ? undefined : 'Thu gọn menu'}
            {...flyoutProps('Mở rộng menu')}
            className={cn('hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed && FLYOUT_TARGET)}
            onClick={onToggle}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {collapsed && <Flyout label="Mở rộng menu" />}
          </Button>
        )}
      </div>
      <nav className={cn('flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-2', collapsed && '[scrollbar-width:none]')}>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            // '/student' là tiền tố của mọi trang sinh viên — thiếu `end` thì nó luôn sáng.
            end={to === homeTo}
            {...flyoutProps(label)}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md py-2 text-sm whitespace-nowrap transition-colors',
                collapsed ? 'justify-center' : 'px-3',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-primary border-l-2 font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground border-l-2 border-transparent',
                collapsed && FLYOUT_TARGET,
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {collapsed ? <Flyout label={label} /> : label}
          </NavLink>
        ))}
      </nav>
      <div className="border-sidebar-border space-y-2 border-t p-3">
        {!collapsed && (
          <div className="px-1">
            <p className="text-sidebar-accent-foreground truncate text-sm font-medium">{user?.fullName}</p>
            <p className="text-sidebar-foreground/60 truncate text-xs">{user?.email}</p>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          {...flyoutProps('Đổi mật khẩu')}
          className={footerButton}
          onClick={() => {
            onNavigate?.()
            onChangePassword()
          }}
        >
          <KeyRound className="size-4" />
          {collapsed ? <Flyout label="Đổi mật khẩu" /> : 'Đổi mật khẩu'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          {...flyoutProps('Đăng xuất')}
          className={footerButton}
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut className="size-4" />
          {collapsed ? <Flyout label="Đăng xuất" /> : 'Đăng xuất'}
        </Button>
      </div>
    </>
  )
}
