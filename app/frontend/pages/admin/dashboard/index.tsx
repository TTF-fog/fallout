import type { ReactNode } from 'react'
import AdminLayout from '@/layouts/AdminLayout'

export default function AdminDashboardIndex() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground mt-1">Welcome to the Fallout admin panel.</p>
    </div>
  )
}

AdminDashboardIndex.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>
