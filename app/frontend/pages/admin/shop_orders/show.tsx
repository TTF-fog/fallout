import type { ReactNode } from 'react'
import { useForm, Link } from '@inertiajs/react'
import AdminLayout from '@/layouts/AdminLayout'
import { Button } from '@/components/admin/ui/button'
import { Card, CardContent } from '@/components/admin/ui/card'
import { Badge } from '@/components/admin/ui/badge'

type Order = {
  id: number
  user: { id: number; display_name: string; email: string }
  shop_item: { id: number; name: string }
  frozen_price: number
  quantity: number
  total_cost: number
  state: string
  address: string | null
  phone: string | null
  admin_note: string | null
  created_at: string
  user_koi_balance: number
}

const STATES = ['pending', 'fulfilled', 'rejected', 'on_hold']

export default function AdminShopOrderShow({ order }: { order: Order }) {
  const form = useForm({
    state: order.state,
    admin_note: order.admin_note ?? '',
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form.patch(`/admin/shop_orders/${order.id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/admin/shop_orders" className="text-sm text-primary hover:underline">
          ← All Orders
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Order #{order.id}</h1>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">User</span>
            <span className="font-medium">
              {order.user.display_name} ({order.user.email})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current koi balance</span>
            <span>{order.user_koi_balance} koi</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item</span>
            <span>{order.shop_item.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price at order time</span>
            <span>
              {order.frozen_price} koi{order.quantity > 1 && ` × ${order.quantity} = ${order.total_cost} koi`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping address</span>
            <span className="text-right whitespace-pre-line max-w-xs">
              {order.address ?? <span className="italic text-muted-foreground">not provided</span>}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span>{order.phone ?? <span className="italic text-muted-foreground">not provided</span>}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ordered</span>
            <span>{order.created_at}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">State</span>
            <Badge variant="outline">{order.state}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium mb-1.5">State</span>
              <select
                value={form.data.state}
                onChange={(e) => form.setData('state', e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Rejecting refunds the user's koi automatically (order drops from their balance calculation).
              </p>
            </label>

            <label className="block">
              <span className="block text-sm font-medium mb-1.5">Admin Note</span>
              <textarea
                value={form.data.admin_note}
                onChange={(e) => form.setData('admin_note', e.target.value)}
                rows={3}
                placeholder="Tracking number, notes, etc."
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
              />
            </label>

            <Button type="submit" disabled={form.processing}>
              {form.processing ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

AdminShopOrderShow.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>
