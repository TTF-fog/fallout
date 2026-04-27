import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@inertiajs/react'
import { Modal } from '@inertiaui/modal-react'
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { AnimatePresence, motion, type Transition } from 'motion/react'
import { DateTime } from 'luxon'
import MarqueeText from '@/components/shared/MarqueeText'
import TextMorph from '@/components/shared/TextMorph'
import EventCard from '@/components/bulletin_board/EventCard'
import ExploreCard from '@/components/bulletin_board/ExploreCard'
import Masonry from 'react-masonry-css'
import { computeBulletinEventStatus, type SerializedBulletinEvent } from '@/lib/bulletinEventStatus'
import { useLiveReload } from '@/lib/useLiveReload'
import { useNowTick } from '@/lib/useNowTick'
import styles from './index.module.scss'

type SortOption = 'active' | 'newest'
type CategoryOption = 'projects' | 'journals'
const EXPLORE_FILTER_DEBOUNCE_MS = 300
const EVENT_COUNT_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 34,
  mass: 0.35,
}
const EXPLORE_POSITION_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 34,
  mass: 0.4,
}
const EXPLORE_FADE_TRANSITION: Transition = {
  duration: 0.18,
  ease: 'easeOut',
}

type Featured = { image: string; title: string; username: string }
type ExploreProject = {
  id: number
  type: 'project'
  username: string
  avatar_url: string | null
  created_at: string
  last_activity_at: string
  project_name: string
  image: string | null
  project_description: string
  latest_journal_excerpt: string | null
  latest_journal_date: string | null
  journal_entries_count: number
  tags: string[]
  href: string
}

type ExploreMedia =
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string; poster_url: string | null }
  | { kind: 'youtube'; thumbnail_url: string | null }

type ExploreJournal = {
  id: number
  type: 'journal'
  username: string
  avatar_url: string | null
  date: string
  project_name: string
  excerpt: string
  media: ExploreMedia | null
  tags: string[]
  href: string
}

type ExploreEntry = ExploreProject | ExploreJournal

type ExplorePayload = {
  category: CategoryOption
  entries: ExploreEntry[]
  next_cursor: string | null
  has_more: boolean
  sort: SortOption
  query: string
}

type ExploreInitialPayload = {
  default_category: CategoryOption
  default_project_sort: SortOption
  projects: ExplorePayload
  journals: ExplorePayload
}

type ExploreStats = {
  projects_count: number
  journals_count: number
  last_project_created_at: string | null
  last_journal_created_at: string | null
}

type PageProps = {
  events: SerializedBulletinEvent[]
  featured: Featured[]
  explore: ExploreInitialPayload
  explore_stats: ExploreStats
  is_modal: boolean
}

function exploreBucketKey(category: CategoryOption, sort: SortOption, query: string): string {
  return `${category}:${sort}:${query.trim()}`
}

function formatRelativeCreatedAt(iso: string | null, base: DateTime): string | null {
  if (!iso) return null

  const dt = DateTime.fromISO(iso).toLocal()
  if (!dt.isValid) return null

  return dt.toRelative({ base, style: 'long' })
}

function nearestScrollParent(element: HTMLElement | null): HTMLElement | Window {
  let parent = element?.parentElement ?? null

  while (parent) {
    if (parent === document.body || parent === document.documentElement || parent === document.scrollingElement) {
      return window
    }

    const style = window.getComputedStyle(parent)
    if (/(auto|scroll|overlay)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) return parent
    parent = parent.parentElement
  }

  return window
}

export default function BulletinBoardIndex({ events, featured, explore, explore_stats, is_modal }: PageProps) {
  const modalRef = useRef<{ close: () => void }>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const exploreSectionRef = useRef<HTMLElement | null>(null)
  const exploreControlsRef = useRef<HTMLDivElement | null>(null)
  const exploreJumpLayerRef = useRef<HTMLDivElement | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [query, setQuery] = useState(explore.projects.query)
  const [category, setCategory] = useState<CategoryOption>(explore.default_category)
  const [projectSort, setProjectSort] = useState<SortOption>(explore.default_project_sort)
  const [exploreBuckets, setExploreBuckets] = useState<Record<string, ExplorePayload>>(() => ({
    [exploreBucketKey('projects', explore.projects.sort, explore.projects.query)]: explore.projects,
    [exploreBucketKey('journals', explore.journals.sort, explore.journals.query)]: explore.journals,
  }))
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showExploreJump, setShowExploreJump] = useState(false)
  const isFirstExploreFetchRender = useRef(true)
  const exploreRequestSeq = useRef(0)
  const PAGE_SIZE = 3
  const [page, setPage] = useState(0)

  const liveEventProps = useLiveReload<Pick<PageProps, 'events'>>({ stream: 'bulletin_events', only: ['events'] })
  const liveExploreProps = useLiveReload<Pick<PageProps, 'explore_stats'>>({
    stream: 'bulletin_explore',
    only: ['explore_stats'],
  })
  const now = useNowTick(1000)
  const exploreNow = useNowTick(60_000)
  const liveEvents = liveEventProps?.events ?? events
  const liveExploreStats = liveExploreProps?.explore_stats ?? explore_stats

  const eventCounts = useMemo(
    () =>
      liveEvents.reduce(
        (counts, event) => {
          const status = computeBulletinEventStatus(event, now)
          if (status === 'happening') counts.happening += 1
          if (status === 'upcoming') counts.upcoming += 1
          return counts
        },
        { happening: 0, upcoming: 0 },
      ),
    [liveEvents, now],
  )
  const hasEventCounts = eventCounts.happening > 0 || eventCounts.upcoming > 0
  const [displayedEventCounts, setDisplayedEventCounts] = useState(eventCounts)

  useEffect(() => {
    if (!hasEventCounts) return

    setDisplayedEventCounts((counts) =>
      counts.happening === eventCounts.happening && counts.upcoming === eventCounts.upcoming ? counts : eventCounts,
    )
  }, [eventCounts, hasEventCounts])

  const exploreCounts = useMemo(
    () => ({
      projects: liveExploreStats.projects_count,
      journals: liveExploreStats.journals_count,
    }),
    [liveExploreStats.journals_count, liveExploreStats.projects_count],
  )
  const [displayedExploreCounts, setDisplayedExploreCounts] = useState(exploreCounts)

  useEffect(() => {
    setDisplayedExploreCounts((counts) =>
      counts.projects === exploreCounts.projects && counts.journals === exploreCounts.journals ? counts : exploreCounts,
    )
  }, [exploreCounts])

  // Happening events first (scheduled-end sorted by end time asc, manual live sorted
  // by start time asc so longer-running comes first); then upcoming sorted by start time asc.
  const visibleEvents = useMemo(() => {
    const ms = (iso: string | null) => (iso ? DateTime.fromISO(iso).toMillis() : Infinity)
    const bucket = (e: SerializedBulletinEvent) => {
      const status = computeBulletinEventStatus(e, now)
      if (status !== 'happening') return 2
      return e.ends_at ? 0 : 1
    }
    const sortKey = (e: SerializedBulletinEvent, b: number) => (b === 0 ? ms(e.ends_at) : ms(e.starts_at))
    return liveEvents
      .filter((e) => {
        const status = computeBulletinEventStatus(e, now)
        return status === 'upcoming' || status === 'happening'
      })
      .sort((a, b) => {
        const ba = bucket(a)
        const bb = bucket(b)
        if (ba !== bb) return ba - bb
        return sortKey(a, ba) - sortKey(b, bb)
      })
  }, [liveEvents, now])

  const totalPages = Math.max(1, Math.ceil(visibleEvents.length / PAGE_SIZE))
  const effectivePage = Math.min(page, totalPages - 1)
  useEffect(() => {
    if (page !== effectivePage) setPage(effectivePage)
  }, [effectivePage, page])
  const pageEvents = visibleEvents.slice(effectivePage * PAGE_SIZE, (effectivePage + 1) * PAGE_SIZE)

  useEffect(() => {
    if (!lightbox) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  const activeSort = category === 'projects' ? projectSort : 'newest'
  const activeQuery = query.trim()
  const activeExploreKey = exploreBucketKey(category, activeSort, activeQuery)
  const activeExploreBucket = exploreBuckets[activeExploreKey]
  const isExploreBucketPending = !activeExploreBucket
  const exploreList = activeExploreBucket?.entries ?? []
  const nextCursor = activeExploreBucket?.next_cursor ?? null
  const hasMoreExplore = activeExploreBucket?.has_more ?? false
  const exploreEmptyLabel = activeQuery
    ? category === 'projects'
      ? 'no projects found'
      : 'no journals found'
    : category === 'projects'
      ? 'no projects yet'
      : 'no journals yet'

  useEffect(() => {
    if (isFirstExploreFetchRender.current) {
      isFirstExploreFetchRender.current = false
      return
    }

    if (exploreBuckets[activeExploreKey]) {
      setIsSearching(false)
      setIsLoadingMore(false)
      return
    }

    const requestSeq = ++exploreRequestSeq.current
    const requestedCategory = category
    const requestedSort = activeSort
    const requestedQuery = activeQuery
    const requestedKey = activeExploreKey
    setIsSearching(true)
    setIsLoadingMore(false)
    const abort = new AbortController()
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ category: requestedCategory, sort: requestedSort })
      if (requestedQuery) params.set('query', requestedQuery)
      fetch(`/bulletin_board/search?${params}`, {
        headers: { Accept: 'application/json' },
        signal: abort.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Explore search failed with ${res.status}`)
          return res.json()
        })
        .then((data: ExplorePayload) => {
          if (requestSeq !== exploreRequestSeq.current) return
          setExploreBuckets((buckets) => ({ ...buckets, [requestedKey]: data }))
          setIsSearching(false)
        })
        .catch((err) => {
          if (requestSeq !== exploreRequestSeq.current) return
          if (err.name !== 'AbortError') {
            console.error(err)
            setIsSearching(false)
          }
        })
    }, EXPLORE_FILTER_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      abort.abort()
    }
  }, [activeExploreKey, activeQuery, activeSort, category, exploreBuckets])

  function loadMoreExplore() {
    if (!nextCursor || isSearching || isLoadingMore) return

    const requestSeq = ++exploreRequestSeq.current
    const requestedKey = activeExploreKey
    const params = new URLSearchParams({ category, sort: activeSort, cursor: nextCursor })
    const requestedQuery = activeQuery
    if (requestedQuery) params.set('query', requestedQuery)

    setIsLoadingMore(true)
    fetch(`/bulletin_board/search?${params}`, { headers: { Accept: 'application/json' } })
      .then((res) => {
        if (!res.ok) throw new Error(`Explore load more failed with ${res.status}`)
        return res.json()
      })
      .then((data: ExplorePayload) => {
        if (requestSeq !== exploreRequestSeq.current) return
        setExploreBuckets((buckets) => {
          const current = buckets[requestedKey]
          return {
            ...buckets,
            [requestedKey]: {
              ...data,
              entries: [...(current?.entries ?? []), ...data.entries],
            },
          }
        })
        setIsLoadingMore(false)
      })
      .catch((err) => {
        if (requestSeq !== exploreRequestSeq.current) return
        console.error(err)
        setIsLoadingMore(false)
      })
  }

  useEffect(() => {
    let setupFrame = 0
    let cleanup = () => {}

    const setupExploreJump = () => {
      const controls = exploreControlsRef.current
      const section = exploreSectionRef.current
      if (!controls || !section) {
        setupFrame = window.requestAnimationFrame(setupExploreJump)
        return
      }

      let frame = 0

      const updateExploreJump = () => {
        const scrollParent = nearestScrollParent(controls)
        const innerBounds = innerRef.current?.getBoundingClientRect()
        if (innerBounds) {
          exploreJumpLayerRef.current?.style.setProperty('--explore-jump-left', `${innerBounds.left}px`)
          exploreJumpLayerRef.current?.style.setProperty('--explore-jump-width', `${innerBounds.width}px`)
        }

        const controlBounds = controls.getBoundingClientRect()
        const sectionBounds = section.getBoundingClientRect()
        const viewportBounds =
          scrollParent === window ? { top: 0, height: window.innerHeight } : scrollParent.getBoundingClientRect()

        setShowExploreJump(
          controlBounds.bottom < viewportBounds.top &&
            sectionBounds.bottom > viewportBounds.top + viewportBounds.height * 0.35,
        )
      }

      const scheduleUpdate = () => {
        window.cancelAnimationFrame(frame)
        frame = window.requestAnimationFrame(updateExploreJump)
      }

      const scrollTargets = new Set<HTMLElement | Window>([window])
      if (document.scrollingElement instanceof HTMLElement) scrollTargets.add(document.scrollingElement)

      let parent = controls.parentElement
      while (parent) {
        scrollTargets.add(parent)
        parent = parent.parentElement
      }

      const documentScrollOptions: AddEventListenerOptions = { passive: true, capture: true }

      scheduleUpdate()
      scrollTargets.forEach((target) => target.addEventListener('scroll', scheduleUpdate, { passive: true }))
      document.addEventListener('scroll', scheduleUpdate, documentScrollOptions)
      window.addEventListener('resize', scheduleUpdate)
      const observer = new ResizeObserver(scheduleUpdate)
      observer.observe(controls)
      observer.observe(section)
      if (innerRef.current) observer.observe(innerRef.current)

      cleanup = () => {
        window.cancelAnimationFrame(frame)
        scrollTargets.forEach((target) => target.removeEventListener('scroll', scheduleUpdate))
        document.removeEventListener('scroll', scheduleUpdate, documentScrollOptions)
        window.removeEventListener('resize', scheduleUpdate)
        observer.disconnect()
      }
    }

    setupExploreJump()

    return () => {
      window.cancelAnimationFrame(setupFrame)
      cleanup()
    }
  }, [])

  function scrollToExploreControls() {
    const target = exploreControlsRef.current ?? exploreSectionRef.current
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const backButton = is_modal ? (
    <button type="button" onClick={() => modalRef.current?.close()} aria-label="Back" className={styles.backButton}>
      <ArrowLeftIcon className={styles.backArrow} />
    </button>
  ) : (
    <Link href="/path" aria-label="Back" className={styles.backButton}>
      <ArrowLeftIcon className={styles.backArrow} />
    </Link>
  )

  const eventCountLabel = [
    eventCounts.happening > 0
      ? `${eventCounts.happening} ${eventCounts.happening === 1 ? 'event' : 'events'} happening now`
      : null,
    eventCounts.upcoming > 0
      ? `${eventCounts.upcoming} upcoming ${eventCounts.upcoming === 1 ? 'event' : 'events'}`
      : null,
  ]
    .filter(Boolean)
    .join(' • ')
  const nowDt = DateTime.fromJSDate(now).toLocal()
  const lastProjectCreated = formatRelativeCreatedAt(liveExploreStats.last_project_created_at, nowDt)
  const lastJournalCreated = formatRelativeCreatedAt(liveExploreStats.last_journal_created_at, nowDt)
  const lastProjectCreatedText = lastProjectCreated
    ? `Last project created: ${lastProjectCreated}`
    : 'No projects pinned yet'
  const lastJournalCreatedText = lastJournalCreated
    ? `Last journal created: ${lastJournalCreated}`
    : 'No journals posted yet'
  const explorePulseLabel = [
    `${exploreCounts.projects} ${exploreCounts.projects === 1 ? 'project' : 'projects'} pinned`,
    `${exploreCounts.journals} ${exploreCounts.journals === 1 ? 'journal' : 'journals'} posted`,
    lastProjectCreatedText,
    lastJournalCreatedText,
  ].join(' • ')
  const exploreStateKey = isExploreBucketPending
    ? `pending-${activeExploreKey}`
    : exploreList.length === 0
      ? `empty-${activeExploreKey}`
      : `results-${activeExploreKey}`

  const content = (
    <div className={clsx(styles.content, is_modal ? styles.contentModal : styles.contentStandalone)}>
      <div className={styles.panel}>
        <div className={styles.stickyHeader}>{backButton}</div>

        <div ref={innerRef} className={styles.inner}>
          <motion.section layout className={styles.section}>
            <motion.div layout className={styles.eventsHeader}>
              <h2 className={styles.sectionHeading}>Events</h2>

              <motion.div
                layout
                aria-hidden={!hasEventCounts}
                aria-label={hasEventCounts ? eventCountLabel : undefined}
                className={styles.eventCountLine}
                initial={false}
                animate={{ opacity: hasEventCounts ? 1 : 0, y: hasEventCounts ? 0 : -4 }}
                transition={EVENT_COUNT_TRANSITION}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {displayedEventCounts.happening > 0 && (
                    <motion.span
                      key="happening"
                      layout
                      className={styles.eventCountSegment}
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      transition={EVENT_COUNT_TRANSITION}
                    >
                      <TextMorph as="span" transition={EVENT_COUNT_TRANSITION}>
                        {`${displayedEventCounts.happening} ${displayedEventCounts.happening === 1 ? 'event happening now' : 'events happening now'}`}
                      </TextMorph>
                    </motion.span>
                  )}
                  {displayedEventCounts.happening > 0 && displayedEventCounts.upcoming > 0 && (
                    <motion.span
                      key="separator"
                      layout
                      className={styles.eventCountSeparator}
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      transition={EVENT_COUNT_TRANSITION}
                    >
                      •
                    </motion.span>
                  )}
                  {displayedEventCounts.upcoming > 0 && (
                    <motion.span
                      key="upcoming"
                      layout
                      className={styles.eventCountSegment}
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      transition={EVENT_COUNT_TRANSITION}
                    >
                      <TextMorph as="span" transition={EVENT_COUNT_TRANSITION}>
                        {`${displayedEventCounts.upcoming} ${displayedEventCounts.upcoming === 1 ? 'upcoming event' : 'upcoming events'}`}
                      </TextMorph>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            <motion.div layout className={styles.eventsArea}>
              <AnimatePresence initial={false} mode="popLayout">
                {visibleEvents.length === 0 ? (
                  <motion.div
                    key="empty"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className={styles.eventsEmpty}
                  >
                    no events yet
                  </motion.div>
                ) : (
                  <motion.div
                    key="events"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className={styles.eventsStack}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={effectivePage}
                        className={styles.eventsGrid}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeInOut' }}
                      >
                        <AnimatePresence initial={false} mode="popLayout">
                          {pageEvents.map((event) => (
                            <EventCard key={event.id} event={event} now={now} />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    </AnimatePresence>

                    <motion.div layout className={styles.eventsFooter}>
                      <span className={styles.tzNote}>times shown in your local timezone</span>
                      <div className={styles.pagination}>
                        <button
                          type="button"
                          className={styles.pageButton}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={effectivePage === 0 || totalPages <= 1}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className={styles.pageArrow} />
                        </button>
                        <span className={styles.pageInfo} aria-live="polite">
                          <TextMorph as="span">{(effectivePage + 1).toString()}</TextMorph>
                          <span className={styles.pageInfoSep}>/</span>
                          <TextMorph as="span">{totalPages.toString()}</TextMorph>
                        </span>
                        <button
                          type="button"
                          className={styles.pageButton}
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={effectivePage >= totalPages - 1 || totalPages <= 1}
                          aria-label="Next page"
                        >
                          <ChevronRight className={styles.pageArrow} />
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div layout className={styles.dmNotice}>
              want to run one? DM
              <a
                href="https://hackclub.enterprise.slack.com/team/U08R4Q9H8EB"
                className={styles.dmNoticeLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                @tanishq!
              </a>
            </motion.div>
          </motion.section>

          <motion.section layout className={styles.section}>
            <h2 className={styles.sectionHeading}>Featured</h2>
            <div className={styles.featuredGrid}>
              {featured.length === 0 ? (
                <div className={styles.emptyState}>nothing shipped yet — ship something cool!</div>
              ) : (
                featured.map((item, i) => (
                  <div key={i} className={styles.featuredCard}>
                    <button
                      type="button"
                      className={styles.featuredImageButton}
                      onClick={() => setLightbox(item.image)}
                      aria-label={`View ${item.title} full size`}
                    >
                      <img src={item.image} alt={item.title} className={styles.featuredImage} loading="lazy" />
                    </button>
                    <div className={styles.featuredMeta}>
                      <div className={styles.featuredText}>
                        <MarqueeText text={item.title} className={styles.featuredTitle} />
                        <MarqueeText text={`by ${item.username}`} className={styles.featuredUsername} />
                      </div>
                      <div className={styles.featuredIcons}>
                        <img src="/logos/github-black.svg" alt="GitHub Logo" className={styles.featuredIcon} />
                        <img src="/logos/slack.svg" alt="Slack Logo" className={styles.featuredIcon} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.dmNotice}>
              want more? check out projects from
              <a
                href="https://blueprint.hackclub.com/explore?sort=top&type=projects"
                className={styles.dmNoticeLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Blueprint
              </a>
              and
              <a
                href="https://highway.hackclub.com/projects"
                className={styles.dmNoticeLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Highway
              </a>
            </div>
          </motion.section>

          <motion.section
            ref={exploreSectionRef}
            layout="position"
            transition={EXPLORE_POSITION_TRANSITION}
            className={clsx(styles.section, styles.exploreSection)}
          >
            <motion.div layout="position" transition={EXPLORE_POSITION_TRANSITION} className={styles.exploreHeader}>
              <motion.h2 layout="position" transition={EXPLORE_POSITION_TRANSITION} className={styles.sectionHeading}>
                Explore
              </motion.h2>

              <motion.div
                layout
                aria-label={explorePulseLabel}
                className={styles.explorePulse}
                initial={false}
                transition={EVENT_COUNT_TRANSITION}
              >
                <motion.div layout className={styles.explorePulseLine} transition={EVENT_COUNT_TRANSITION}>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key="projects"
                      layout
                      className={styles.explorePulseSegment}
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={EVENT_COUNT_TRANSITION}
                    >
                      <TextMorph as="span" transition={EVENT_COUNT_TRANSITION}>
                        {`${displayedExploreCounts.projects} ${displayedExploreCounts.projects === 1 ? 'project pinned' : 'projects pinned'}`}
                      </TextMorph>
                    </motion.span>

                    <motion.span
                      key="separator"
                      layout
                      className={styles.explorePulseSeparator}
                      transition={EVENT_COUNT_TRANSITION}
                    >
                      •
                    </motion.span>

                    <motion.span
                      key="journals"
                      layout
                      className={styles.explorePulseSegment}
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={EVENT_COUNT_TRANSITION}
                    >
                      <TextMorph as="span" transition={EVENT_COUNT_TRANSITION}>
                        {`${displayedExploreCounts.journals} ${displayedExploreCounts.journals === 1 ? 'journal posted' : 'journals posted'}`}
                      </TextMorph>
                    </motion.span>
                  </AnimatePresence>
                </motion.div>

                <motion.div layout className={styles.explorePulseMetaLine} transition={EVENT_COUNT_TRANSITION}>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key="last-project"
                      layout
                      className={styles.explorePulseTime}
                      transition={EVENT_COUNT_TRANSITION}
                    >
                      {lastProjectCreatedText}
                    </motion.span>
                    <motion.span
                      key="last-separator"
                      layout
                      className={styles.explorePulseSeparator}
                      transition={EVENT_COUNT_TRANSITION}
                    >
                      •
                    </motion.span>
                    <motion.span
                      key="last-journal"
                      layout
                      className={styles.explorePulseTime}
                      transition={EVENT_COUNT_TRANSITION}
                    >
                      {lastJournalCreatedText}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </motion.div>

            <div ref={exploreControlsRef} className={styles.exploreControls}>
              <motion.div layout="position" transition={EXPLORE_POSITION_TRANSITION} className={styles.searchRow}>
                <div className={styles.searchSection}>
                  <MagnifyingGlassIcon className={styles.searchIcon} />

                  <input
                    type="text"
                    placeholder="Search..."
                    className={styles.searchInput}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </motion.div>

              <motion.div layout="position" transition={EXPLORE_POSITION_TRANSITION} className={styles.filterRow}>
                <motion.div
                  layout="position"
                  transition={EXPLORE_POSITION_TRANSITION}
                  className={styles.sortTabs}
                  data-active-index={category === 'projects' ? 0 : 1}
                  role="group"
                  aria-label="Explore category"
                >
                  <span className={styles.sortTabActiveBg} aria-hidden />
                  {(['projects', 'journals'] as const).map((key) => {
                    const active = category === key
                    const label = key === 'projects' ? 'Projects' : 'Journals'

                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCategory(key)}
                        className={styles.sortTab}
                      >
                        <span className={styles.sortTabLabel}>{label}</span>
                      </button>
                    )
                  })}
                </motion.div>

                <AnimatePresence initial={false} mode="popLayout">
                  {category === 'projects' && (
                    <motion.div
                      key="project-sort"
                      transition={EXPLORE_POSITION_TRANSITION}
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className={styles.sortTabs}
                      data-active-index={projectSort === 'active' ? 0 : 1}
                      role="group"
                      aria-label="Sort explore projects"
                    >
                      <span className={styles.sortTabActiveBg} aria-hidden />
                      {(['active', 'newest'] as const).map((key) => {
                        const active = projectSort === key
                        const label = key === 'active' ? 'Active' : 'New'

                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setProjectSort(key)}
                            className={styles.sortTab}
                          >
                            <span className={styles.sortTabLabel}>{label}</span>
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            <div ref={exploreJumpLayerRef} className={styles.exploreJumpLayer}>
              <div className={styles.exploreJumpInner}>
                <AnimatePresence initial={false}>
                  {showExploreJump && (
                    <motion.button
                      key="explore-jump"
                      transition={EXPLORE_POSITION_TRANSITION}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      type="button"
                      className={styles.exploreJumpButton}
                      onClick={scrollToExploreControls}
                    >
                      Scroll to top
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.div layout="position" transition={EXPLORE_POSITION_TRANSITION} className={styles.exploreScroll}>
              <div className={styles.exploreViewport}>
                <div
                  className={clsx(
                    styles.exploreMeasured,
                    (isSearching || isExploreBucketPending) && styles.exploreMeasuredPending,
                  )}
                  aria-busy={isSearching || isExploreBucketPending}
                >
                  <AnimatePresence initial={false} mode="wait">
                    {isExploreBucketPending ? (
                      <motion.div
                        key={exploreStateKey}
                        layout="position"
                        className={styles.explorePending}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={EXPLORE_FADE_TRANSITION}
                      />
                    ) : exploreList.length === 0 ? (
                      <motion.div
                        key={exploreStateKey}
                        layout="position"
                        className={styles.exploreEmpty}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={EXPLORE_FADE_TRANSITION}
                      >
                        {exploreEmptyLabel}
                      </motion.div>
                    ) : (
                      <motion.div
                        key={exploreStateKey}
                        layout="position"
                        className={styles.exploreResults}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={EXPLORE_FADE_TRANSITION}
                      >
                        <Masonry
                          breakpointCols={{ default: 3, 1023: 2, 767: 1 }}
                          className={styles.exploreMasonry}
                          columnClassName={styles.exploreMasonryColumn}
                        >
                          {exploreList.map((entry) => (
                            <motion.div
                              key={`${entry.type}-${entry.id}`}
                              className={styles.exploreCardMotion}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={EXPLORE_FADE_TRANSITION}
                            >
                              <ExploreCard entry={entry} now={exploreNow} />
                            </motion.div>
                          ))}
                        </Masonry>

                        {hasMoreExplore && (
                          <div className={styles.loadMoreRow}>
                            <button
                              type="button"
                              className={styles.loadMoreButton}
                              onClick={loadMoreExplore}
                              disabled={isLoadingMore}
                            >
                              {isLoadingMore ? 'Loading...' : 'Load more'}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {(isSearching || isExploreBucketPending) && (
                      <motion.div
                        key="loading-overlay"
                        className={styles.exploreLoadingOverlay}
                        role="status"
                        aria-label="Loading explore results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={EXPLORE_FADE_TRANSITION}
                      >
                        <div className={styles.exploreLoadingChip}>
                          <div className={styles.spinner} aria-hidden />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.section>
        </div>
      </div>
    </div>
  )

  const lightboxEl =
    lightbox && typeof document !== 'undefined'
      ? createPortal(
          <div className={styles.lightbox} onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
            <img src={lightbox} alt="" className={styles.lightboxImage} />
          </div>,
          document.body,
        )
      : null

  if (is_modal) {
    return (
      <Modal
        ref={modalRef}
        panelClasses={clsx('bulletin-board-modal-panel', styles.modalPanel)}
        paddingClasses=""
        closeButton={false}
        maxWidth="7xl"
      >
        {content}
        {lightboxEl}
      </Modal>
    )
  }

  return (
    <>
      {content}
      {lightboxEl}
    </>
  )
}

BulletinBoardIndex.layout = (page: ReactNode) => page
