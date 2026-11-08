import { Pin } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MyAnnouncement } from '@/types/announcement'
import { useMarkAnnouncementRead, useMyAnnouncements } from '../hooks/useAnnouncements'

/** Thông báo của ban quản lý cho sinh viên: tin toàn KTX và tin của tòa đang ở, bấm vào để đọc. */
export function MyAnnouncementsPage() {
  const announcements = useMyAnnouncements()
  const unread = announcements.data?.filter((a) => !a.readAt).length ?? 0

  return (
    <>
      <PageHeader
        title="Thông báo"
        description={
          unread > 0 ? `Bạn có ${unread} thông báo chưa đọc.` : 'Tin từ ban quản lý ký túc xá và tòa bạn đang ở.'
        }
      />
      {announcements.isPending && <LoadingState />}
      {announcements.isError && <ErrorState error={announcements.error} />}
      {announcements.data?.length === 0 && (
        <EmptyState title="Chưa có thông báo nào" description="Tin mới từ ban quản lý sẽ hiện ở đây." />
      )}
      <div className="space-y-3">
        {announcements.data?.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
      </div>
    </>
  )
}

function AnnouncementCard({ announcement: a }: { announcement: MyAnnouncement }) {
  const [open, setOpen] = useState(false)
  const markRead = useMarkAnnouncementRead()

  function toggle() {
    setOpen(!open)
    if (!a.readAt && !markRead.isPending) markRead.mutate(a.id)
  }

  return (
    <Card className={cn(!a.readAt && 'border-primary/40')}>
      <CardContent>
        <button type="button" onClick={toggle} aria-expanded={open} className="w-full text-left">
          <div className="flex items-start gap-2">
            {!a.readAt && <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" aria-label="Chưa đọc" />}
            <div className="min-w-0 flex-1">
              <p className={cn('flex items-center gap-1.5', !a.readAt ? 'font-semibold' : 'font-medium')}>
                {a.pinned && <Pin className="text-primary size-3.5 shrink-0" aria-label="Đã ghim" />}
                {a.title}
              </p>
              <p className="text-muted-foreground text-xs">
                {a.building ? `Tòa ${a.building.name}` : 'Toàn KTX'} · {a.author.fullName} · {formatDateTime(a.createdAt)}
              </p>
              <p className={cn('mt-2 text-sm whitespace-pre-line', !open && 'line-clamp-2')}>{a.content}</p>
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  )
}
