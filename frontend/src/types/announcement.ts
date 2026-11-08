/**
 * Thông báo của ban quản lý.
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

export interface Announcement {
  id: string
  title: string
  content: string
  /** null: toàn KTX. */
  buildingId: string | null
  building: { id: string; name: string } | null
  pinned: boolean
  authorId: string
  author: { id: string; fullName: string }
  createdAt: string
  updatedAt: string
}

export interface MyAnnouncement extends Announcement {
  /** null: chưa đọc. */
  readAt: string | null
}

export interface AnnouncementInput {
  title: string
  content: string
  buildingId: string | null
  pinned: boolean
}
