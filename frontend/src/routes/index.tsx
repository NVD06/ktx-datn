import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { BuildingDetailPage } from '@/features/buildings/pages/BuildingDetailPage'
import { BuildingListPage } from '@/features/buildings/pages/BuildingListPage'
import { StudentHomePage } from '@/features/contracts/pages/StudentHomePage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { RoomTypeListPage } from '@/features/room-types/pages/RoomTypeListPage'
import { AvailableRoomsPage } from '@/features/rooms/pages/AvailableRoomsPage'
import { RoomDetailPage } from '@/features/rooms/pages/RoomDetailPage'
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
        ],
      },
    ],
  },

  // Khu sinh viên
  {
    element: <ProtectedRoute roles={['STUDENT']} />,
    children: [
      {
        path: '/me',
        element: <StudentLayout />,
        children: [
          { index: true, element: <StudentHomePage /> },
          { path: 'rooms', element: <AvailableRoomsPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
