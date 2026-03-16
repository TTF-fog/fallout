import { useState } from 'react'
import * as Sentry from '@sentry/react'

export default function SentryTestShow() {
  const [shouldThrow, setShouldThrow] = useState(false)

  if (shouldThrow) {
    throw new Error('Sentry frontend test error')
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold text-brown">Sentry Test</h1>
        <div className="space-x-4">
          <button
            onClick={() => setShouldThrow(true)}
            className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800"
          >
            Throw Error (ErrorBoundary)
          </button>
          <button
            onClick={() => Sentry.captureException(new Error('Sentry manual capture test'))}
            className="rounded bg-brown px-4 py-2 text-cream hover:bg-dark-brown"
          >
            Capture Exception
          </button>
        </div>
        <p className="text-sm text-dark-brown">Check your Sentry dashboard for captured errors.</p>
      </div>
    </div>
  )
}
