import type { ReactNode } from 'react'
import { Link, usePage } from '@inertiajs/react'
import Frame from '@/components/shared/Frame'
import FlashMessages from '@/components/FlashMessages'

interface MenuItem {
  title: string
  path: string
  description?: string
}

export default function MarkdownLayout({ children }: { children: ReactNode }) {
  const { menu_items, page_title } = usePage<{ menu_items: MenuItem[]; page_title: string }>().props
  const currentPath = usePage().url.split('?')[0]

  return (
    <div className="min-h-screen">
      <aside className="fixed top-0 left-0 h-screen w-80 p-4 flex z-10">
        <Frame className="flex-1">
          <nav className="flex flex-col gap-1">
            <Link
              href="/docs"
              className={`block px-3 py-2 rounded font-bold text-lg ${currentPath === '/docs' ? 'bg-brown text-light-brown' : ''}`}
            >
              Docs
            </Link>
            {menu_items.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`block px-3 py-2 rounded ${currentPath === item.path ? 'bg-brown text-light-brown font-bold' : ''}`}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </Frame>
      </aside>
      <div className="ml-80">
        <FlashMessages />
        <main>{children}</main>
      </div>
    </div>
  )
}
