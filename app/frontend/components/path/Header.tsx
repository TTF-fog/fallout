import { useState } from 'react'
import { usePage, router } from '@inertiajs/react'
import { useModalStack } from '@inertiaui/modal-react'
import type { SharedProps } from '@/types'
import { useClickOutside } from '@/hooks/useClickOutside'
import { notify } from '@/lib/notifications'

type Props = {
  koiBalance: number
  avatar: string
  displayName: string
}

export default function Header({ koiBalance, avatar, displayName }: Props) {
  const shared = usePage<SharedProps>().props
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false))
  const { visitModal } = useModalStack()

  function signOut(e: React.MouseEvent) {
    e.preventDefault()
    router.delete(shared.sign_out_path)
  }

  return (
    <header className="flex justify-between relative items-start">
      <div ref={containerRef} className="flex items-start">
        <img
          src={avatar}
          alt={displayName}
          onClick={() => setIsOpen(!isOpen)}
          className="top-0 left-0 rounded-full aspect-square size-10 xs:size-16 bg-dark-brown border-2 border-dark-brown w-fit z-12 cursor-pointer"
        />
        <div className={`flex-col -ml-5 xs:-ml-8 ${isOpen ? 'flex' : 'hidden xs:flex'}`}>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            onClick={() => setIsOpen(!isOpen)}
            className={`h-10 xs:h-16 bg-light-brown pl-10 border-2 border-dark-brown text-dark-brown text-xl flex items-center rounded-r-full z-11 cursor-pointer transition-all duration-200 ${isOpen ? 'pr-5 min-w-40' : 'pr-3 min-w-0 xs:pr-5 xs:min-w-40'}`}
          >
            <span
              className={`-mt-0.5 overflow-hidden whitespace-nowrap transition-all duration-200 xs:max-w-40 xs:opacity-100 ${isOpen ? 'max-w-40 opacity-100' : 'max-w-0 opacity-0'}`}
            >
              {displayName}
            </span>
          </button>

          <div
            aria-hidden={!isOpen}
            className={`bg-dark-brown overflow-hidden transition-all duration-200 rounded-bl-2xl -mt-5 xs:-mt-8 pt-8  ${
              isOpen ? 'max-h-48 rounded-br-4xl' : 'max-h-0 rounded-br-[3rem]'
            }`}
          >
            {shared.auth.user?.is_staff && (
              <a
                href="/admin"
                tabIndex={isOpen ? 0 : -1}
                className="text-light-brown w-full pl-10 pr-5 py-3 text-left text-lg hover:brightness-150 transition-all cursor-pointer block"
              >
                Admin
              </a>
            )}
            <button
              type="button"
              tabIndex={isOpen ? 0 : -1}
              onClick={signOut}
              className="text-light-brown w-full pl-10 pr-5 py-3 text-left text-lg hover:brightness-150 transition-all cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="flex space-x-8 items-center">
        <button
          type="button"
          onClick={() => visitModal('/streak_goal')}
          className="flex items-center space-x-1 cursor-pointer group relative"
          aria-label="Streak"
        >
          <img src="/fire.svg" alt="streak" className="h-8 xl:h-10" />
          <span className="text-coral text-4xl xl:text-5xl font-bold">{shared.current_streak}</span>
          <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-dark-brown px-2 py-1 text-xs text-light-brown opacity-0 transition-opacity group-hover:opacity-100">
            Streak
          </span>
        </button>
        <button
          type="button"
          onClick={() => visitModal('/streak_goal')}
          className="flex items-center space-x-1 cursor-pointer group relative"
          aria-label="Streak freezes"
        >
          <img src="/frozen-fire.svg" alt="streak freeze" className="h-8 xl:h-10" />
          <span className="text-ice-blue text-4xl xl:text-5xl font-bold">{shared.streak_freezes}</span>
          <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-dark-brown px-2 py-1 text-xs text-light-brown opacity-0 transition-opacity group-hover:opacity-100">
            Streak Freezes
          </span>
        </button>
        <div className="flex items-center space-x-2 group relative">
          <img src="/koifish.webp" alt="koi" className="h-10" />
          <span className="text-coral text-4xl xl:text-5xl font-bold">{koiBalance}</span>
          <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-dark-brown px-2 py-1 text-xs text-light-brown opacity-0 transition-opacity group-hover:opacity-100">
            Koi Balance
          </span>
        </div>
        <button
          type="button"
          className="relative cursor-pointer group"
          onClick={() => {
            if (shared.auth.user?.is_trial) {
              notify('alert', 'Please verify your account to access your mail.')
              return
            }
            if (shared.has_unread_mail) {
              new Audio('/sfx/youve-got-mail.mp3').play().catch(() => {})
            }
            visitModal('/mails')
          }}
        >
          <img src="/envelope.webp" alt="mail" className="h-10" />
          {shared.has_unread_mail && (
            <>
              <span className="absolute top-1 right-0 rounded-full size-3 bg-coral" />
              <span className="absolute top-1 right-0 rounded-full size-3 bg-coral animate-ping" />
            </>
          )}
          <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-dark-brown px-2 py-1 text-xs text-light-brown opacity-0 transition-opacity group-hover:opacity-100">
            Mail
          </span>
        </button>
      </div>
    </header>
  )
}
