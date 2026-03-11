import { useState, useRef, useEffect } from 'react'
import Frame from '@/components/shared/Frame'

const BGM_SRC = '/bgm/falling_into_the_sky__kale_wu.mp3'
const STORAGE_KEY = 'bgm-want'
const VOLUME_KEY = 'bgm-volume'
// Events that trigger user activation per the HTML spec, unlocking audio autoplay
const ACTIVATION_EVENTS = ['keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchend'] as const

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    try {
      return parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.5')
    } catch {
      return 0.5
    }
  })
  const [isMuted, setIsMuted] = useState(false)
  const [wantBgm, setWantBgm] = useState(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) ?? 'true') === 'true'
    } catch {
      return true
    }
  })

  const wantBgmRef = useRef(wantBgm)
  wantBgmRef.current = wantBgm
  const volumeRef = useRef(volume)
  volumeRef.current = volume

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.loop = true
    audio.volume = volumeRef.current
    audioRef.current = audio

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)

    // Defer the download until the browser is idle / page has loaded
    const loadSrc = () => {
      audio.src = BGM_SRC
    }
    const idleId = 'requestIdleCallback' in window ? window.requestIdleCallback(loadSrc) : undefined
    const fallbackTimer = idleId === undefined ? window.setTimeout(loadSrc, 0) : undefined
    window.addEventListener('load', loadSrc, { once: true })

    function removeListeners() {
      for (const event of ACTIVATION_EVENTS) {
        document.removeEventListener(event, tryPlay)
      }
    }

    function tryPlay() {
      if (!wantBgmRef.current || !audio.paused) return
      if (!audio.src) audio.src = BGM_SRC
      audio
        .play()
        .then(() => {
          setIsPlaying(true)
          removeListeners()
        })
        .catch(() => {})
    }

    tryPlay()
    // Auto-play on first user activation gesture if browser blocked autoplay
    for (const event of ACTIVATION_EVENTS) {
      document.addEventListener(event, tryPlay)
    }

    return () => {
      removeListeners()
      window.removeEventListener('load', loadSrc)
      if (idleId !== undefined) window.cancelIdleCallback(idleId)
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      setWantBgm(false)
      localStorage.setItem(STORAGE_KEY, 'false')
    } else {
      if (!audio.src) audio.src = BGM_SRC
      audio.volume = isMuted ? 0 : volume
      audio
        .play()
        .then(() => {
          setIsPlaying(true)
          if (!wantBgm) {
            setWantBgm(true)
            localStorage.setItem(STORAGE_KEY, 'true')
          }
        })
        .catch(() => {})
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = parseFloat(e.target.value)
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value)
    setVolume(v)
    localStorage.setItem(VOLUME_KEY, String(v))
    if (audioRef.current) audioRef.current.volume = v
    if (v > 0) setIsMuted(false)
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return
    if (isMuted) {
      audio.volume = volume
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Frame>
      <div className="flex flex-col w-60 gap-1 p-4">
        <div>
          <p className="text-lg font-medium text-dark-brown truncate text-center">Falling Into The Sky</p>
          <p className="text-sm text-brown text-center -mt-1">Kale Wu</p>
        </div>

        <div className="flex flex-col gap-0.5">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="bgm-slider w-full h-2"
            style={{
              background: `linear-gradient(to right, #61453a ${progress}%, rgba(97,69,58,0.25) ${progress}%)`,
              borderRadius: '2px',
            }}
            aria-label="Seek"
          />
          <div className="flex justify-between text-[10px] text-brown">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 -mt-3">
          <button
            type="button"
            onClick={toggleMute}
            className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-dark-brown"
              >
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-dark-brown"
              >
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={toggle}
            className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 text-dark-brown"
              >
                <path
                  fillRule="evenodd"
                  d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 text-dark-brown"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="bgm-slider w-14 h-2"
            style={{
              background: `linear-gradient(to right, #61453a ${(isMuted ? 0 : volume) * 100}%, rgba(97,69,58,0.25) ${(isMuted ? 0 : volume) * 100}%)`,
              borderRadius: '2px',
            }}
            aria-label="Volume"
          />
        </div>
      </div>
    </Frame>
  )
}
