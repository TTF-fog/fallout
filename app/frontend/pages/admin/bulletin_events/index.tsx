import { useState } from 'react'
import type { ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import type { SharedProps } from '@/types'
import { Pencil, Trash2, Play, Square, Calendar, Hand, ImageOff } from 'lucide-react'
import AdminLayout from '@/layouts/AdminLayout'
import { Button } from '@/components/admin/ui/button'
import { Badge } from '@/components/admin/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/admin/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/admin/ui/alert-dialog'
import EventFormSheet from './EventFormSheet'
import {
  computeBulletinEventStatus,
  formatEventDateTime,
  type BulletinEventStatus,
  type SerializedBulletinEvent,
} from '@/lib/bulletinEventStatus'

type TabKey = 'upcoming' | 'all' | 'expired'

type PageProps = {
  events: SerializedBulletinEvent[]
  current_tab: TabKey
  counts: { upcoming: number; all: number; expired: number }
}

const STATUS_LABEL: Record<BulletinEventStatus, string> = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  happening: 'Happening',
  expired: 'Expired',
}

const STATUS_CLASS: Record<BulletinEventStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  upcoming: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200',
  happening: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
  expired: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
}

export default function AdminBulletinEventsIndex({ events, current_tab, counts }: PageProps) {
  const { admin_permissions } = usePage<SharedProps & { admin_permissions?: { is_admin: boolean } }>().props
  const canModify = admin_permissions?.is_admin ?? false

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<SerializedBulletinEvent | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SerializedBulletinEvent | null>(null)

  function openNew() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(event: SerializedBulletinEvent) {
    setEditing(event)
    setSheetOpen(true)
  }

  function switchTab(tab: string) {
    router.get('/admin/bulletin_events', { tab }, { preserveScroll: true, preserveState: false })
  }

  function patchAction(event: SerializedBulletinEvent, path: 'start_now' | 'end_now') {
    router.patch(`/admin/bulletin_events/${event.id}/${path}`, { tab: current_tab }, { preserveScroll: true })
  }

  function doDelete(event: SerializedBulletinEvent) {
    router.delete(`/admin/bulletin_events/${event.id}`, {
      data: { tab: current_tab },
      preserveScroll: true,
      onFinish: () => setConfirmDelete(null),
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bulletin Events</h1>
          <p className="text-sm text-muted-foreground">
            Manage events shown on the public bulletin board. Times are stored in UTC and rendered in each viewer's
            local timezone.
          </p>
        </div>
        {canModify && <Button onClick={openNew}>+ New event</Button>}
      </div>

      <Tabs value={current_tab} onValueChange={switchTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming <span className="ml-1 text-muted-foreground">({counts.upcoming})</span>
          </TabsTrigger>
          <TabsTrigger value="all">
            All <span className="ml-1 text-muted-foreground">({counts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expired <span className="ml-1 text-muted-foreground">({counts.expired})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={current_tab}>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Image</TableHead>
                  <TableHead className="min-w-48">Title</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      {current_tab === 'upcoming' && 'No upcoming events. Click "+ New event" to add one.'}
                      {current_tab === 'all' && 'No events yet.'}
                      {current_tab === 'expired' && 'No expired events.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => {
                    const liveStatus = computeBulletinEventStatus(event)
                    const isManualDraft = !event.schedulable && liveStatus === 'draft'
                    const isActive = liveStatus === 'happening'
                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          {event.image_url ? (
                            // eslint-disable-next-line jsx-a11y/img-redundant-alt
                            <img
                              src={event.image_url}
                              alt=""
                              className="size-10 rounded-md object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                              <ImageOff className="size-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium whitespace-normal">
                          <div className="max-w-xs truncate" title={event.title}>
                            {event.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {event.schedulable ? (
                              <>
                                <Calendar className="size-3" /> Scheduled
                              </>
                            ) : (
                              <>
                                <Hand className="size-3" /> Manual
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {event.starts_at ? formatEventDateTime(event.starts_at) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {event.ends_at ? formatEventDateTime(event.ends_at) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CLASS[liveStatus]}>{STATUS_LABEL[liveStatus]}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canModify ? (
                            <div className="inline-flex gap-1">
                              {isManualDraft && (
                                <Button size="sm" variant="outline" onClick={() => patchAction(event, 'start_now')}>
                                  <Play className="size-3.5" /> Start now
                                </Button>
                              )}
                              {isActive && (
                                <Button size="sm" variant="outline" onClick={() => patchAction(event, 'end_now')}>
                                  <Square className="size-3.5" /> End now
                                </Button>
                              )}
                              <Button size="icon-sm" variant="ghost" onClick={() => openEdit(event)} title="Edit">
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => setConfirmDelete(event)}
                                title="Delete"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Read-only</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <EventFormSheet open={sheetOpen} onOpenChange={setSheetOpen} event={editing} currentTab={current_tab} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{confirmDelete?.title}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => confirmDelete && doDelete(confirmDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

AdminBulletinEventsIndex.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>
