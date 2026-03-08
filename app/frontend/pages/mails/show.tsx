import type { ReactNode } from 'react'
import { router } from '@inertiajs/react'
import { Modal } from '@inertiaui/modal-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Frame from '@/components/shared/Frame'
import type { MailDetail } from '@/types'

type PageProps = {
  mail: MailDetail
  is_modal: boolean
}

function MailShow({ mail, is_modal }: PageProps) {
  function handleDismiss() {
    router.post(`/mails/${mail.id}/dismiss`, {}, { preserveScroll: true })
  }

  const content = (
    <div className="w-full h-full overflow-y-auto p-6">
      <h1 className="font-bold text-2xl text-dark-brown mb-1">{mail.summary}</h1>
      <p className="text-sm text-dark-brown/40 mb-6">{mail.created_at}</p>

      {mail.content && (
        <div className="prose prose-sm max-w-none text-dark-brown mb-6">
          <Markdown remarkPlugins={[remarkGfm]}>{mail.content}</Markdown>
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        {mail.action_url && (
          <a
            href={mail.action_url}
            className="px-4 py-2 bg-dark-brown text-white rounded-lg font-bold hover:opacity-90"
          >
            View
          </a>
        )}
        {mail.dismissable && (
          <button
            onClick={handleDismiss}
            className="px-4 py-2 border-2 border-dark-brown/30 text-dark-brown/60 rounded-lg hover:border-dark-brown/50 cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>
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

MailShow.layout = (page: ReactNode) => page

export default MailShow
