import type { ReactNode } from 'react'
import FlashMessages from '@/components/FlashMessages'

export default function DefaultLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <FlashMessages />
      <main>{children}</main>
    </div>
  )
}
