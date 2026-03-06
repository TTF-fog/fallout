import { type ReactNode, useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import Frame from '@/components/shared/Frame'
import FlashMessages from '@/components/FlashMessages'

interface MenuLink {
  type: 'link'
  title: string
  path: string
}

interface MenuSection {
  type: 'section'
  title: string
  items: { title: string; path: string }[]
}

type MenuItem = MenuLink | MenuSection

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={`block px-3 py-1.5 rounded ${active ? 'bg-brown text-light-brown font-bold' : ''}`}>
      {children}
    </Link>
  )
}

function CollapsibleSection({
  title,
  items,
  currentPath,
}: {
  title: string
  items: { title: string; path: string }[]
  currentPath: string
}) {
  const storageKey = `docs-nav-${title}`
  const hasActiveChild = items.some((item) => currentPath === item.path)
  const [open, setOpen] = useState(() => {
    if (hasActiveChild) return true
    const stored = localStorage.getItem(storageKey)
    return stored !== null ? stored === 'true' : true
  })

  function toggle() {
    const next = !open
    setOpen(next)
    localStorage.setItem(storageKey, String(next))
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full px-3 py-1.5 font-bold text-left cursor-pointer"
      >
        {title}
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>&#8250;</span>
      </button>
      {open && (
        <div className="ml-3 border-l-2 border-dark-brown/20 flex flex-col gap-0.5 mt-0.5">
          {items.map((item) => (
            <NavLink key={item.path} href={item.path} active={currentPath === item.path}>
              {item.title}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MarkdownLayout({ children }: { children: ReactNode }) {
  const { menu_items } = usePage<{ menu_items: MenuItem[] }>().props
  const currentPath = usePage().url.split('?')[0]

  return (
    <div className="min-h-screen">
      <aside className="fixed top-0 left-0 h-screen w-80 p-4 flex z-10">
        <Frame className="flex-1">
          <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto h-full">
            <NavLink href="/docs" active={currentPath === '/docs'}>
              Overview
            </NavLink>
            {menu_items.map((item, i) =>
              item.type === 'section' ? (
                <CollapsibleSection key={i} title={item.title} items={item.items} currentPath={currentPath} />
              ) : (
                <NavLink key={item.path} href={item.path} active={currentPath === item.path}>
                  {item.title}
                </NavLink>
              ),
            )}
          </nav>
        </Frame>
      </aside>
      <div className="ml-80">
        <FlashMessages />
        <main className="py-6 max-w-4xl mx-auto">{children}</main>
      </div>
    </div>
  )
}
