import { lazy, type ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage'
import { ForbiddenPage } from '@/features/system/pages/ForbiddenPage'
import { HomeRedirect } from '@/features/system/pages/HomeRedirect'
import { NotFoundPage } from '@/features/system/pages/NotFoundPage'
import { AdminLayout } from '@/layouts/AdminLayout'
import { StudentLayout } from '@/layouts/StudentLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { CHANGE_PASSWORD_PATH } from './paths'

function page<K extends string>(load: () => Promise<Record<NoInfer<K>, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })))
}
const AnnouncementListPage = page(() => import('@/features/announcements/pages/AnnouncementListPage'), 'AnnouncementListPage')
const MyAnnouncementsPage = page(() => import('@/features/announcements/pages/MyAnnouncementsPage'), 'MyAnnouncementsPage')
const BuildingDetailPage = page(() => import('@/features/buildings/pages/BuildingDetailPage'), 'BuildingDetailPage')
const BuildingListPage = page(() => import('@/features/buildings/pages/BuildingListPage'), 'BuildingListPage')
const ContractDetailPage = page(() => import('@/features/contracts/pages/ContractDetailPage'), 'ContractDetailPage')
const ContractListPage = page(() => import('@/features/contracts/pages/ContractListPage'), 'ContractListPage')
const MyContractsPage = page(() => import('@/features/contracts/pages/MyContractsPage'), 'MyContractsPage')
const StudentHomePage = page(() => import('@/features/contracts/pages/StudentHomePage'), 'StudentHomePage')
const DashboardPage = page(() => import('@/features/dashboard/pages/DashboardPage'), 'DashboardPage')
const HygieneListPage = page(() => import('@/features/hygiene/pages/HygieneListPage'), 'HygieneListPage')
const HygieneScoringPage = page(() => import('@/features/hygiene/pages/HygieneScoringPage'), 'HygieneScoringPage')
const MyHygienePage = page(() => import('@/features/hygiene/pages/MyHygienePage'), 'MyHygienePage')
const InvoiceListPage = page(() => import('@/features/invoices/pages/InvoiceListPage'), 'InvoiceListPage')
const MyInvoicesPage = page(() => import('@/features/invoices/pages/MyInvoicesPage'), 'MyInvoicesPage')
const PaymentResultPage = page(() => import('@/features/invoices/pages/PaymentResultPage'), 'PaymentResultPage')
const UtilityBillingPage = page(() => import('@/features/invoices/pages/UtilityBillingPage'), 'UtilityBillingPage')
const MaintenanceListPage = page(() => import('@/features/maintenance/pages/MaintenanceListPage'), 'MaintenanceListPage')
const MyMaintenancePage = page(() => import('@/features/maintenance/pages/MyMaintenancePage'), 'MyMaintenancePage')
const ProfilePage = page(() => import('@/features/profile/pages/ProfilePage'), 'ProfilePage')
const RegistrationPeriodListPage = page(() => import('@/features/registration-periods/pages/RegistrationPeriodListPage'), 'RegistrationPeriodListPage')
const MyRegistrationsPage = page(() => import('@/features/registrations/pages/MyRegistrationsPage'), 'MyRegistrationsPage')
const FinanceReportPage = page(() => import('@/features/reports/pages/FinanceReportPage'), 'FinanceReportPage')
const MaintenanceReportPage = page(() => import('@/features/reports/pages/MaintenanceReportPage'), 'MaintenanceReportPage')
const OccupancyReportPage = page(() => import('@/features/reports/pages/OccupancyReportPage'), 'OccupancyReportPage')
const ReportsPage = page(() => import('@/features/reports/pages/ReportsPage'), 'ReportsPage')
const RegistrationListPage = page(() => import('@/features/registrations/pages/RegistrationListPage'), 'RegistrationListPage')
const RoomTypeListPage = page(() => import('@/features/room-types/pages/RoomTypeListPage'), 'RoomTypeListPage')
const AvailableRoomsPage = page(() => import('@/features/rooms/pages/AvailableRoomsPage'), 'AvailableRoomsPage')
const RoomDetailPage = page(() => import('@/features/rooms/pages/RoomDetailPage'), 'RoomDetailPage')
const UserListPage = page(() => import('@/features/users/pages/UserListPage'), 'UserListPage')

export const router = createBrowserRouter([
  // Công khai. Không có trang đăng ký: tài khoản sinh viên do Admin cấp.
  { path: '/login', element: <LoginPage /> },
  { path: '/403', element: <ForbiddenPage /> },

  // Đổi mật khẩu ban đầu — mọi vai trò, cần đăng nhập nhưng nằm ngoài hai layout.
  { element: <ProtectedRoute />, children: [{ path: CHANGE_PASSWORD_PATH, element: <ChangePasswordPage /> }] },

  // '/' — trang giới thiệu cho khách; đã đăng nhập thì về khu theo vai trò
  { path: '/', element: <HomeRedirect /> },

  // Khu quản trị — ADMIN và MANAGER
  {
    element: <ProtectedRoute roles={['ADMIN', 'MANAGER']} />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'buildings', element: <BuildingListPage /> },
          { path: 'buildings/:id', element: <BuildingDetailPage /> },
          { path: 'rooms/:id', element: <RoomDetailPage /> },
          { path: 'room-types', element: <RoomTypeListPage /> },
          { path: 'registration-periods', element: <RegistrationPeriodListPage /> },
          { path: 'registrations', element: <RegistrationListPage /> },
          { path: 'contracts', element: <ContractListPage /> },
          { path: 'invoices', element: <InvoiceListPage /> },
          { path: 'utilities', element: <UtilityBillingPage /> },
          { path: 'maintenance', element: <MaintenanceListPage /> },
          { path: 'hygiene', element: <HygieneListPage /> },
          { path: 'hygiene/score', element: <HygieneScoringPage /> },
          { path: 'announcements', element: <AnnouncementListPage /> },
          {
            path: 'reports',
            element: <ReportsPage />,
            children: [
              { index: true, element: <Navigate to="occupancy" replace /> },
              { path: 'occupancy', element: <OccupancyReportPage /> },
              { path: 'finance', element: <FinanceReportPage /> },
              { path: 'maintenance', element: <MaintenanceReportPage /> },
            ],
          },
          // Chỉ ADMIN — Manager gõ thẳng URL thì sang trang 403 thay vì bảng lỗi.
          { element: <ProtectedRoute roles={['ADMIN']} />, children: [{ path: 'users', element: <UserListPage /> }] },
        ],
      },
    ],
  },

  // Khu sinh viên
  {
    element: <ProtectedRoute roles={['STUDENT']} />,
    children: [
      {
        path: '/student',
        element: <StudentLayout />,
        children: [
          { index: true, element: <StudentHomePage /> },
          { path: 'rooms', element: <AvailableRoomsPage /> },
          { path: 'registrations', element: <MyRegistrationsPage /> },
          { path: 'contracts', element: <MyContractsPage /> },
          { path: 'contracts/:id', element: <ContractDetailPage /> },
          { path: 'invoices', element: <MyInvoicesPage /> },
          { path: 'payment-result', element: <PaymentResultPage /> },
          { path: 'maintenance', element: <MyMaintenancePage /> },
          { path: 'hygiene', element: <MyHygienePage /> },
          { path: 'announcements', element: <MyAnnouncementsPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
