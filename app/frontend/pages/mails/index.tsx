import type { ReactNode } from 'react'
import { router } from '@inertiajs/react'
// @ts-expect-error useModalStack lacks type declarations in this beta package
import { useModalStack, Modal } from '@inertiaui/modal-react'
import Frame from '@/components/shared/Frame'
import type { MailItem } from '@/types'

type PageProps = {
  mails: MailItem[]
  is_modal: boolean
}

function MailsIndex({ mails, is_modal }: PageProps) {
  const { visitModal } = useModalStack()

  function handleReadAll() {
    router.post('/mails/read_all', {}, { preserveScroll: true })
  }

  const hasUnread = mails.some((m) => !m.is_read)

  const content = (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-2xl text-dark-brown">Your Mail</h1>
        {hasUnread && (
          <button
            onClick={handleReadAll}
            className="text-sm text-dark-brown/60 hover:text-dark-brown underline cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {mails.length === 0 ? (
        <p className="text-dark-brown/50 text-center py-12">You don't have any mail yet! Check back later!</p>
      ) : (
        <div className="flex flex-col gap-2">
          {mails.map((mail) => (
            <button
              key={mail.id}
              onClick={() => visitModal(`/mails/${mail.id}`)}
              className={`text-left p-4 rounded-lg border-2 transition-all cursor-pointer ${
                mail.pinned ? 'border-coral/40 bg-coral/5' : 'border-dark-brown/20 hover:border-dark-brown/40'
              }`}
            >
              <div className="flex items-start gap-3">
                {!mail.is_read && <span className="mt-1.5 shrink-0 size-2.5 rounded-full bg-coral" />}
                {mail.is_read && <span className="mt-1.5 shrink-0 size-2.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {mail.pinned && <span className="text-xs text-coral font-bold uppercase">Pinned</span>}
                    <span className={`truncate ${mail.is_read ? 'text-dark-brown/60' : 'text-dark-brown font-bold'}`}>
                      {mail.summary}
                    </span>
                  </div>
                  <span className="text-xs text-dark-brown/40 mt-1">{mail.created_at}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  if (is_modal) {
    return (
      <Modal panelClasses="h-full" paddingClasses="max-w-2xl mx-auto" closeButton={false} maxWidth="3xl">
        <Frame className="h-full">{content}</Frame>
      </Modal>
    )
  }

  return content
}

MailsIndex.layout = (page: ReactNode) => page

export default MailsIndex
