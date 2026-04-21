import { useRef, type ReactNode } from 'react'
import { Modal, useModal } from '@inertiaui/modal-react'
import { router } from '@inertiajs/react'
import EventDetailPanel from '@/components/bulletin_board/EventDetailPanel'
import type { SerializedBulletinEvent } from '@/lib/bulletinEventStatus'
import styles from './show.module.scss'

type PageProps = {
  event: SerializedBulletinEvent
  is_modal: boolean
}

export default function BulletinEventShow({ event, is_modal }: PageProps) {
  const modalRef = useRef<{ close: () => void }>(null)
  const modal = useModal()

  function handleBack() {
    if (modal?.canGoBack) {
      modal.goBack()
      return
    }
    if (modal) {
      modal.close()
      return
    }
    if (modalRef.current) {
      modalRef.current.close()
      return
    }
    router.visit('/bulletin_board')
  }

  const panel = <EventDetailPanel event={event} onBack={handleBack} />

  if (is_modal) {
    return (
      <Modal ref={modalRef} panelClasses={styles.modalPanel} paddingClasses="" closeButton={false} maxWidth="2xl">
        {panel}
      </Modal>
    )
  }

  return (
    <div className={styles.standalonePage}>
      <div className={styles.standaloneInner}>{panel}</div>
    </div>
  )
}

BulletinEventShow.layout = (page: ReactNode) => page
