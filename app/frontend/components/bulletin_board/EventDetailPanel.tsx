import clsx from 'clsx'
import { ArrowLeftIcon } from '@heroicons/react/20/solid'
import Frame from '@/components/shared/Frame'
import {
  computeBulletinEventStatus,
  formatEventDateTime,
  type BulletinEventStatus,
  type SerializedBulletinEvent,
} from '@/lib/bulletinEventStatus'
import styles from './EventDetailPanel.module.scss'

type Props = {
  event: SerializedBulletinEvent
  onBack: () => void
}

const STATUS_LABEL: Record<BulletinEventStatus, string> = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  happening: 'Happening now',
  expired: 'Ended',
}

const STATUS_PILL_MOD: Record<BulletinEventStatus, string> = {
  draft: styles.statusPillDraft,
  upcoming: styles.statusPillUpcoming,
  happening: styles.statusPillHappening,
  expired: styles.statusPillExpired,
}

function StatusPill({ event }: { event: SerializedBulletinEvent }) {
  const status = computeBulletinEventStatus(event)
  return <span className={clsx(styles.statusPill, STATUS_PILL_MOD[status])}>{STATUS_LABEL[status]}</span>
}

function TimeLines({ event }: { event: SerializedBulletinEvent }) {
  const status = computeBulletinEventStatus(event)

  if (!event.schedulable) {
    if (status === 'draft') {
      return <p className={styles.times}>Not started yet.</p>
    }
    if (status === 'happening') {
      return <p className={styles.times}>Started {formatEventDateTime(event.starts_at)}</p>
    }
    return (
      <div className={styles.times}>
        <p>Started {formatEventDateTime(event.starts_at)}</p>
        <p>Ended {formatEventDateTime(event.ends_at)}</p>
      </div>
    )
  }

  return (
    <div className={styles.times}>
      <p>
        <strong>Starts:</strong> {formatEventDateTime(event.starts_at)}
      </p>
      <p>
        <strong>Ends:</strong> {event.ends_at ? formatEventDateTime(event.ends_at) : 'TBD'}
      </p>
    </div>
  )
}

export default function EventDetailPanel({ event, onBack }: Props) {
  return (
    <Frame showBorderOnMobile className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <button type="button" onClick={onBack} aria-label="Back" className={styles.backButton}>
            <ArrowLeftIcon className={styles.backIcon} />
          </button>
        </div>

        <div className={styles.body}>
          {event.image_url ? (
            <img src={event.image_url} alt="" className={styles.image} loading="lazy" />
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden />
          )}

          <div className={styles.titleRow}>
            <h1 className={styles.title}>{event.title}</h1>
            <StatusPill event={event} />
          </div>

          <TimeLines event={event} />

          <p className={styles.description}>{event.description}</p>
        </div>
      </div>
    </Frame>
  )
}
