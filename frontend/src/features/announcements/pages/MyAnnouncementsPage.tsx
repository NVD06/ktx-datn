import { Pin, X } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DormRuleDetail, DormRuleTitles } from '@/features/dorm-rules/components/DormRuleCards'
import { useDormRules } from '@/features/dorm-rules/hooks/useDormRules'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MyAnnouncement } from '@/types/announcement'
import { useMarkAnnouncementRead, useMyAnnouncements } from '../hooks/useAnnouncements'

/** Thông báo của ban quản lý cho sinh viên: tin toàn KTX và tin của tòa đang ở, bấm vào để đọc; cột phải là nội quy KTX. */
export function MyAnnouncementsPage() {
  const announcements = useMyAnnouncements()
  const rules = useDormRules()
  const [ruleId, setRuleId] = useState<string | null>(null)
  const unread = announcements.data?.filter((a) => !a.readAt).length ?? 0
  const rule = rules.data?.find((r) => r.id === ruleId)

  return (
    <>
      <PageHeader
        title="Thông báo"
        description={
          unread > 0
            ? `Bạn có ${unread} thông báo chưa đọc.`
            : 'Tin từ ban quản lý ký túc xá và tòa bạn đang ở, kèm nội quy KTX.'
        }
      />
      <div
        className={cn(
          'grid items-start gap-4',
          rule ? 'lg:grid-cols-[minmax(0,1fr)_15rem_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1fr)_17rem]',
        )}
      >
        <section className="space-y-3">
          <h2 className="font-semibold">Thông báo</h2>
          {announcements.isPending && <LoadingState />}
          {announcements.isError && <ErrorState error={announcements.error} />}
          {announcements.data?.length === 0 && (
            <Card>
              <CardContent>
                <EmptyState title="Chưa có thông báo nào" description="Tin mới từ ban quản lý sẽ hiện ở đây." />
              </CardContent>
            </Card>
          )}
          {announcements.data?.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
        </section>
        <DormRuleTitles
          rules={rules.data ?? []}
          selectedId={ruleId}
          onSelect={(id) => setRuleId(id === ruleId ? null : id)}
        />
        {rule && (
          <DormRuleDetail
            rule={rule}
            actions={
              <Button variant="ghost" size="icon-sm" onClick={() => setRuleId(null)} aria-label="Đóng">
                <X />
              </Button>
            }
          />
        )}
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
