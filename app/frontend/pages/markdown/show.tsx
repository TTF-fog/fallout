import type { ReactNode } from 'react'
import { Head } from '@inertiajs/react'
import MarkdownLayout from '@/layouts/MarkdownLayout'

function MarkdownShow({ content_html, page_title }: { content_html: string; page_title: string }) {
  return (
    <>
      <Head title={`${page_title} - Fallout`}>
        <style>{`:root { background-color: var(--color-light-green); }`}</style>
      </Head>
      <div className="markdown-content" dangerouslySetInnerHTML={{ __html: content_html }} />
    </>
  )
}

MarkdownShow.layout = (page: ReactNode) => <MarkdownLayout>{page}</MarkdownLayout>

export default MarkdownShow
