import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Announcement, AnnouncementKind } from './types'
import AnnouncementCard from './AnnouncementCard'
import Twine from './Twine'
import { useIdentityAnnouncement } from './useIdentityAnnouncement'
import { useFeedbackAnnouncement } from './useFeedbackAnnouncement'

const ORDER: Record<AnnouncementKind, number> = { critical: 0, info: 1, promo: 2 }

export default function AnnouncementsBar() {
  const identity = useIdentityAnnouncement()
  const feedback = useFeedbackAnnouncement()
  const containerRef = useRef<HTMLDivElement>(null)

  const announcements = useMemo<Announcement[]>(
    () =>
      [identity, feedback].filter((a): a is Announcement => a !== null).sort((a, b) => ORDER[a.kind] - ORDER[b.kind]),
    [identity, feedback],
  )

  // Publish the bar's rendered height as --announcements-h on :root so page HUDs (e.g. path/index.tsx)
  // can shift their top offset with `calc(... + var(--announcements-h, 0px))` and never overlap.
  useEffect(() => {
    const root = document.documentElement
    const el = containerRef.current
    if (!el || announcements.length === 0) {
      root.style.setProperty('--announcements-h', '0px')
      return
    }
    const apply = () => root.style.setProperty('--announcements-h', `${el.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [announcements.length])

  if (announcements.length === 0) return null
  const stacked = announcements.length > 1

  return (
    <div className="fixed top-2 inset-x-2 z-30 pointer-events-none flex justify-center">
      <div ref={containerRef} className="relative pointer-events-auto w-full xs:w-fit max-w-3xl">
        {stacked && <Twine />}
        <motion.ul layout className="relative flex flex-col items-stretch gap-2 xs:gap-3">
          <AnimatePresence initial={false}>
            {announcements.map((a, i) => (
              <AnnouncementCard key={a.id} announcement={a} index={i} stacked={stacked} isOnly={!stacked} />
            ))}
          </AnimatePresence>
        </motion.ul>
      </div>
    </div>
  )
}
