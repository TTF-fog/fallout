import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { CollapseProvider, useCollapse } from '@collapse/react'
import Button from '@/components/shared/Button'
import Input from '@/components/shared/Input'

type CollapseSessionProps = {
  id: number
  token: string
  status: string
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.round(seconds % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`
  return `${mins}:${pad(secs)}`
}

function CollapseSessionShow({
  collapse_session,
  collapse_api_url,
  return_to,
}: {
  collapse_session: CollapseSessionProps
  collapse_api_url: string | null
  return_to: string | null
}) {
  const [mode, setMode] = useState<'choose' | 'browser' | 'desktop'>('choose')

  return (
    <div className="min-h-screen bg-light-brown flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg border-2 border-dark-brown shadow-lg overflow-hidden">
        {mode === 'choose' && (
          <>
            <div className="p-6 border-b border-dark-brown flex items-center justify-between">
              <h1 className="font-bold text-2xl uppercase tracking-wide text-dark-brown">Collapse Recording</h1>
              <a
                href={return_to || '/journal_entries/new'}
                className="text-dark-brown text-sm underline hover:no-underline"
              >
                Back to Journal
              </a>
            </div>
            <div className="flex flex-col items-center gap-6 p-12">
              <p className="text-dark-brown text-lg font-bold">How would you like to record?</p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setMode('browser')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-dark-brown rounded-lg cursor-pointer hover:bg-light-brown transition-colors"
                >
                  <svg
                    className="w-10 h-10 text-dark-brown"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
                    />
                  </svg>
                  <span className="font-bold text-dark-brown uppercase">Browser</span>
                  <span className="text-dark-brown text-xs">Record in this tab</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `collapse://session?token=${collapse_session.token}`
                    setMode('desktop')
                  }}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-dark-brown rounded-lg cursor-pointer hover:bg-light-brown transition-colors"
                >
                  <svg
                    className="w-10 h-10 text-dark-brown"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z"
                    />
                  </svg>
                  <span className="font-bold text-dark-brown uppercase">Desktop App</span>
                  <span className="text-dark-brown text-xs">Open in Collapse app</span>
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'browser' && (
          <CollapseProvider token={collapse_session.token} apiBaseUrl={collapse_api_url ?? ''}>
            <BrowserRecorderUI collapseSessionId={collapse_session.id} returnTo={return_to} />
          </CollapseProvider>
        )}

        {mode === 'desktop' && <DesktopModeUI token={collapse_session.token} returnTo={return_to} />}
      </div>
    </div>
  )
}

function RecordingHeader({
  status,
  isSharing,
  returnTo,
}: {
  status: string
  isSharing: boolean
  returnTo: string | null
}) {
  const isRecording = isSharing && (status === 'active' || status === 'pending')
  const isPaused = status === 'paused' || (status === 'active' && !isSharing)
  const canLeave = !isRecording && !isPaused && status !== 'compiling'

  return (
    <div className="p-6 border-b border-dark-brown flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isRecording && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
        {isPaused && <div className="w-3 h-3 bg-yellow-500 rounded-full" />}
        <h1 className="font-bold text-2xl uppercase tracking-wide text-dark-brown">
          {isRecording ? 'Recording' : isPaused ? 'Paused' : 'Collapse Recording'}
        </h1>
      </div>
      {canLeave && (
        <a href={returnTo || '/journal_entries/new'} className="text-dark-brown text-sm underline hover:no-underline">
          Back to Journal
        </a>
      )}
    </div>
  )
}

function StatusBar({ displaySeconds, screenshotCount }: { displaySeconds: number; screenshotCount: number }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-light-brown border-b border-dark-brown">
      <p className="text-dark-brown font-bold text-3xl font-mono tabular-nums">{formatDuration(displaySeconds)}</p>
      <p className="text-dark-brown text-sm">
        {screenshotCount} screenshot{screenshotCount !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function BrowserRecorderUI({ collapseSessionId, returnTo }: { collapseSessionId: number; returnTo: string | null }) {
  const { state, actions } = useCollapse()
  const [finished, setFinished] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [name, setName] = useState('')

  // SDK keeps status 'pending' until first screenshot uploads; use isSharing to detect active recording
  const isCapturing = state.isSharing && (state.status === 'active' || state.status === 'pending')
  const isRecordingOrPaused = isCapturing || state.status === 'paused'

  // Auto-pause when tab is hidden (Safari kills the stream; Chrome throttles timers)
  useEffect(() => {
    if (!isCapturing) return
    function handleVisibilityChange() {
      if (document.hidden) {
        actions.stopSharing()
        actions.pause()
        document.title = `Paused in Background (${formatDuration(state.displaySeconds)})`
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isCapturing, actions.pause, actions.stopSharing, state.displaySeconds])

  useEffect(() => {
    if (isCapturing) {
      document.title = `Recording: ${formatDuration(state.displaySeconds)}`
    } else if (state.status === 'paused') {
      document.title = `Paused: ${formatDuration(state.displaySeconds)}`
    } else if (state.status === 'compiling') {
      document.title = 'Compiling timelapse...'
    } else if (state.status === 'complete' || state.status === 'stopped') {
      document.title = 'Recording complete'
    } else {
      document.title = 'Collapse Recording'
    }
  }, [state.status, state.isSharing, state.displaySeconds, isCapturing])

  useEffect(() => {
    if (state.status === 'complete' || state.status === 'stopped') {
      setFinished(true)
      setStopping(false)
      const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content
      fetch(`/collapse_sessions/${collapseSessionId}`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
      }).catch(() => {})
    }
  }, [state.status, collapseSessionId])

  async function handleStop() {
    await actions.stop({ name: name.trim() || undefined })
  }

  if (state.status === 'loading') {
    return (
      <>
        <RecordingHeader status={state.status} isSharing={state.isSharing} returnTo={returnTo} />
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-dark-brown border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        <RecordingHeader status={state.status} isSharing={state.isSharing} returnTo={returnTo} />
        <div className="flex flex-col items-center gap-3 p-12">
          <p className="text-red-500 font-bold">Something went wrong</p>
          <p className="text-red-500 text-sm">{state.error || 'An unexpected error occurred'}</p>
        </div>
      </>
    )
  }

  if (state.status === 'compiling') {
    return (
      <>
        <RecordingHeader status={state.status} isSharing={state.isSharing} returnTo={returnTo} />
        <StatusBar displaySeconds={state.trackedSeconds} screenshotCount={state.screenshotCount} />
        <div className="flex flex-col items-center gap-4 p-12">
          <div className="w-10 h-10 border-4 border-dark-brown border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-brown font-bold text-lg">Compiling your timelapse...</p>
        </div>
      </>
    )
  }

  if (finished) {
    return (
      <>
        <RecordingHeader status={state.status} isSharing={state.isSharing} returnTo={returnTo} />
        <StatusBar displaySeconds={state.trackedSeconds} screenshotCount={state.screenshotCount} />
        <div className="flex flex-col items-center gap-4 p-8">
          <p className="text-dark-brown font-bold text-xl">Recording complete</p>
          {state.videoUrl && (
            <video src={state.videoUrl} controls className="w-full max-w-lg rounded border border-dark-brown" />
          )}
          <Button onClick={() => router.visit(returnTo || '/journal_entries/new')} className="py-2 px-6 text-lg mt-2">
            Back to Journal
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <RecordingHeader status={state.status} isSharing={state.isSharing} returnTo={returnTo} />
      {isRecordingOrPaused && (
        <StatusBar displaySeconds={state.displaySeconds} screenshotCount={state.screenshotCount} />
      )}

      <div className="flex flex-col gap-6 p-6">
        {state.lastScreenshotUrl && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-light-brown border border-dark-brown">
            <img src={state.lastScreenshotUrl} alt="Latest capture" className="w-full h-full object-contain" />
            <span className="absolute bottom-2 right-2 text-xs bg-dark-brown/80 text-light-brown px-2 py-0.5 rounded">
              Latest capture
            </span>
          </div>
        )}

        {!state.lastScreenshotUrl && (
          <div className="aspect-video rounded-lg overflow-hidden bg-light-brown border border-dark-brown flex flex-col items-center justify-center gap-3">
            {state.isSharing ? (
              <>
                <div className="w-6 h-6 border-3 border-dark-brown border-t-transparent rounded-full animate-spin" />
                <p className="text-dark-brown text-sm">Capturing screen. This should only take a few seconds.</p>
              </>
            ) : (
              <p className="text-dark-brown text-lg">Share your screen to begin recording</p>
            )}
          </div>
        )}

        {stopping ? (
          <div className="flex flex-col gap-4 border-2 border-dark-brown rounded-lg p-6">
            <p className="text-dark-brown font-bold text-lg">Name your timelapse</p>
            <p className="text-dark-brown text-sm">Give it a name, or skip to use the default.</p>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStop()
              }}
              placeholder="My timelapse"
              maxLength={255}
              autoFocus
            />
            <div className="flex gap-3">
              <Button onClick={handleStop} className="py-2 px-6 flex-1">
                Save & Stop
              </Button>
              <button
                type="button"
                onClick={() => setStopping(false)}
                className="py-2 px-6 border-2 font-bold uppercase cursor-pointer bg-white text-dark-brown border-dark-brown flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 justify-center">
            {!state.isSharing && state.status === 'pending' && (
              <Button onClick={actions.startSharing} className="py-2 px-6">
                Share Screen & Start
              </Button>
            )}
            {isCapturing && (
              <Button
                onClick={async () => {
                  actions.stopSharing()
                  await actions.pause()
                }}
                className="py-2 px-6"
              >
                Pause
              </Button>
            )}
            {!state.isSharing && (state.status === 'active' || state.status === 'paused') && (
              <Button onClick={actions.startSharing} className="py-2 px-6">
                Resume
              </Button>
            )}
            {(state.status === 'active' || state.status === 'paused') && (
              <button
                type="button"
                onClick={() => setStopping(true)}
                className="py-2 px-6 border-2 font-bold uppercase cursor-pointer bg-red-700 text-white border-dark-brown"
              >
                Stop
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function DesktopModeUI({ token, returnTo }: { token: string; returnTo: string | null }) {
  return (
    <>
      <div className="p-6 border-b border-dark-brown flex items-center justify-between">
        <h1 className="font-bold text-2xl uppercase tracking-wide text-dark-brown">Desktop Recording</h1>
        <a href={returnTo || '/journal_entries/new'} className="text-dark-brown text-sm underline hover:no-underline">
          Back to Journal
        </a>
      </div>
      <div className="flex flex-col items-center gap-4 p-12">
        <p className="text-dark-brown font-bold text-lg">Recording in Desktop App</p>
        <p className="text-dark-brown text-sm text-center">
          The Collapse desktop app should have opened. Complete your recording there,
          <br />
          then come back here when you're done.
        </p>
        <div className="flex gap-3 mt-2">
          <a
            href={`collapse://session?token=${token}`}
            className="py-2 px-6 border-2 font-bold uppercase cursor-pointer bg-brown text-light-brown border-dark-brown text-sm"
          >
            Re-open Desktop App
          </a>
          <Button onClick={() => router.visit(returnTo || '/journal_entries/new')} className="py-2 px-6">
            Back to Journal
          </Button>
        </div>
      </div>
    </>
  )
}

export default CollapseSessionShow
