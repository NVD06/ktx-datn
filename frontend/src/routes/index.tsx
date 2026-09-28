import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { BuildingDetailPage } from '@/features/buildings/pages/BuildingDetailPage'
import { BuildingListPage } from '@/features/buildings/pages/BuildingListPage'
import { ContractDetailPage } from '@/features/contracts/pages/ContractDetailPage'
import { ContractListPage } from '@/features/contracts/pages/ContractListPage'
import { MyContractsPage } from '@/features/contracts/pages/MyContractsPage'
import { StudentHomePage } from '@/features/contracts/pages/StudentHomePage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { InvoiceListPage } from '@/features/invoices/pages/InvoiceListPage'
import { MyInvoicesPage } from '@/features/invoices/pages/MyInvoicesPage'
import { UtilityBillingPage } from '@/features/invoices/pages/UtilityBillingPage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { RegistrationPeriodListPage } from '@/features/registration-periods/pages/RegistrationPeriodListPage'
import { MyRegistrationsPage } from '@/features/registrations/pages/MyRegistrationsPage'
import { RegistrationListPage } from '@/features/registrations/pages/RegistrationListPage'
import { RoomTypeListPage } from '@/features/room-types/pages/RoomTypeListPage'
import { AvailableRoomsPage } from '@/features/rooms/pages/AvailableRoomsPage'
import { RoomDetailPage } from '@/features/rooms/pages/RoomDetailPage'
import { UserListPage } from '@/features/users/pages/UserListPage'
import { ForbiddenPage } from '@/features/system/pages/ForbiddenPage'
import { HomeRedirect } from '@/features/system/pages/HomeRedirect'
import { NotFoundPage } from '@/features/system/pages/NotFoundPage'
import { AdminLayout } from '@/layouts/AdminLayout'
import { StudentLayout } from '@/layouts/StudentLayout'
import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter([
  // Công khai
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/403', element: <ForbiddenPage /> },

  // '/' tự điều hướng theo vai trò
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
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
