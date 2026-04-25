import { createElement } from 'react'
import { createInertiaApp } from '@inertiajs/react'
import { router } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import { renderApp } from '@inertiaui/modal-react'
import * as Sentry from '@sentry/react'
import axios from 'axios'
import DefaultLayout from '../layouts/DefaultLayout'
import AnnouncementsBar from '../components/announcements/AnnouncementsBar'
import { notify } from '../lib/notifications'
import type { ReactNode } from 'react'

axios.defaults.headers.common['X-Browser-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone

// Dev-only re-render overlay — lazy import keeps the dependency out of the prod bundle
if (import.meta.env.DEV) {
  import('react-scan').then(({ scan }) => scan({ enabled: true }))
}

// Admin perf badges (rack-mini-profiler + #db-query-badge): toggle with Shift+\ ("|").
// Default visible in both envs; localStorage override persists across page loads.
{
  const STORAGE_KEY = 'fallout:perf-badges-visible'
  const stored = localStorage.getItem(STORAGE_KEY)
  const visible = stored === null ? true : stored === 'true'
  document.documentElement.classList.toggle('perf-badges-hidden', !visible)

  window.addEventListener('keydown', (e) => {
    if (e.key !== '|') return
    const target = e.target as HTMLElement | null
    // Don't swallow | when typing into a field
    if (target?.matches('input, textarea, [contenteditable="true"]')) return
    const nowHidden = document.documentElement.classList.toggle('perf-badges-hidden')
    localStorage.setItem(STORAGE_KEY, (!nowHidden).toString())
  })

  // Inertia visits return both X-Perf-Stats (short) + X-Perf-Stats-Long (expanded) for admins.
  axios.interceptors.response.use((response) => {
    const stats = response.headers['x-perf-stats']
    const long = response.headers['x-perf-stats-long']
    const badge = document.getElementById('db-query-badge')
    if (badge) {
      const shortEl = badge.querySelector('.short')
      const longEl = badge.querySelector('.long')
      if (shortEl && stats) shortEl.textContent = stats
      if (longEl && long) longEl.textContent = long
    }
    return response
  })

  // Click the badge to toggle short/expanded view; persists for the session in localStorage.
  const EXPAND_KEY = 'fallout:perf-badge-expanded'
  const applyExpanded = () => {
    const badge = document.getElementById('db-query-badge')
    if (!badge) return
    badge.classList.toggle('expanded', localStorage.getItem(EXPAND_KEY) === 'true')
  }
  applyExpanded()
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null
    if (!target?.closest('#db-query-badge')) return
    const isExpanded = localStorage.getItem(EXPAND_KEY) === 'true'
    localStorage.setItem(EXPAND_KEY, (!isExpanded).toString())
    applyExpanded()
  })
  // Re-apply on Inertia page swaps in case the badge gets re-rendered without the class
  router.on('success', applyExpanded)
}

// sessionStorage can be blocked in sandboxed/privacy contexts; catch gracefully so Inertia doesn't crash
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason instanceof DOMException &&
    event.reason.name === 'SecurityError' &&
    event.reason.message.includes('sessionStorage')
  ) {
    event.preventDefault()
    notify(
      'alert',
      'There was an error! Your browser is blocking storage access. Please disable private/strict mode and reload.',
    )
  }
})

Sentry.init({
  dsn: document.querySelector<HTMLMetaElement>('meta[name="sentry-dsn"]')?.content,
  release: __SENTRY_RELEASE__ ?? undefined, // Ties events + source maps to the same git SHA
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration(), Sentry.replayCanvasIntegration()],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
})

// Bullet N+1 alerts: Inertia uses axios (XHR). Bullet.console sets X-bullet-console-text headers
// on non-HTML responses. Patch XHR to read that header and show toast notifications.
if (import.meta.env.DEV) {
  const originalSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.send = function (...args: Parameters<XMLHttpRequest['send']>) {
    this.addEventListener('load', function () {
      const bulletText = this.getResponseHeader('X-bullet-console-text')
      if (bulletText) {
        try {
          JSON.parse(bulletText).forEach((msg: string) => notify('alert', msg))
        } catch {
          notify('alert', bulletText)
        }
      }
    })
    return originalSend.apply(this, args)
  }
}

router.on('exception', (event) => {
  Sentry.captureException(event.detail.exception)
  notify('alert', 'A network error occurred. Please check your connection and try again.')
})

router.on('navigate', (event) => {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: event.detail.page.url,
    level: 'info',
  })
})

// Capture each Inertia client-side visit as its own Sentry navigation transaction.
// browserTracingIntegration only auto-instruments the initial pageload — without this hook,
// every subsequent SPA visit is invisible in Sentry Performance.
router.on('start', (event) => {
  const client = Sentry.getClient()
  if (!client) return
  Sentry.startBrowserTracingNavigationSpan(client, {
    name: event.detail.visit.url.pathname,
    op: 'navigation.inertia',
  })
})

interface PageModule {
  default: { layout?: (page: ReactNode) => ReactNode; __wrapped?: boolean }
}

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob<PageModule>('../pages/**/*.tsx', { eager: true })
    const page = pages[`../pages/${name}.tsx`]
    if (!page) {
      console.error(`Missing Inertia page component: '${name}.tsx'`)
    }

    // Wrap every page with the AnnouncementsBar so identity + feedback notes render globally,
    // even on pages that opt out of DefaultLayout.
    // Guard against re-wrapping — resolve() may run multiple times per page module in dev/HMR.
    if (!page.default.__wrapped) {
      const pageLayout = page.default.layout || ((p: ReactNode) => createElement(DefaultLayout, null, p))
      page.default.layout = (p: ReactNode) =>
        createElement('div', { className: 'min-h-screen' }, createElement(AnnouncementsBar, null), pageLayout(p))
      page.default.__wrapped = true
    }
    return page
  },

  setup({ el, App, props }) {
    if (el) {
      createRoot(el).render(
        createElement(
          Sentry.ErrorBoundary,
          {
            fallback: createElement(
              'div',
              { className: 'flex min-h-screen items-center justify-center text-center' },
              createElement(
                'div',
                null,
                createElement('h1', { className: 'text-2xl font-bold text-brown' }, 'Something went wrong'),
                createElement(
                  'p',
                  { className: 'mt-2 text-dark-brown' },
                  "We're going to debug what happened... Please try later.",
                ),
              ),
            ),
          },
          renderApp(App, props),
        ),
      )
    }
  },

  defaults: {
    form: {
      forceIndicesArrayFormatInFormData: false,
    },
    future: {
      useDialogForErrorModal: true,
      preserveEqualProps: true,
    },
  },
})
