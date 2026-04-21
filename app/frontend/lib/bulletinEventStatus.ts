export type BulletinEventStatus = 'draft' | 'upcoming' | 'happening' | 'expired'

export type SerializedBulletinEvent = {
  id: number
  title: string
  description: string
  image_url: string | null
  schedulable: boolean
  starts_at: string | null
  ends_at: string | null
  status: BulletinEventStatus
}

export function computeBulletinEventStatus(
  event: SerializedBulletinEvent,
  now: Date = new Date(),
): BulletinEventStatus {
  if (event.ends_at && new Date(event.ends_at) <= now) return 'expired'
  if (!event.starts_at) return 'draft'
  if (new Date(event.starts_at) > now) return 'upcoming'
  return 'happening'
}

const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

export function formatEventDateTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, LONG_DATE_OPTIONS)
}
