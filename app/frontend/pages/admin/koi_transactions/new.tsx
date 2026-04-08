import type { ReactNode } from 'react'
import { useForm, usePage, Link } from '@inertiajs/react'
import AdminLayout from '@/layouts/AdminLayout'
import { Button } from '@/components/admin/ui/button'
import { Card, CardContent } from '@/components/admin/ui/card'
import { Alert, AlertDescription } from '@/components/admin/ui/alert'
import type { SharedProps } from '@/types'

export default function AdminKoiTransactionsNew({ prefill_user_id }: { prefill_user_id: string }) {
  const { errors } = usePage<SharedProps>().props
  const form = useForm({
    user_id: prefill_user_id,
    amount: '',
    description: '',
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form.post('/admin/koi_transactions')
  }

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/admin/koi_transactions" className="text-sm text-primary hover:underline">
          ← Transactions
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Adjust Koi</h1>

      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {Object.values(errors)
              .flat()
              .map((msg, i) => (
                <p key={i}>{msg}</p>
              ))}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium mb-1.5">User ID</span>
              <input
                type="number"
                value={form.data.user_id}
                onChange={(e) => form.setData('user_id', e.target.value)}
                required
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
                placeholder="User ID (find on /admin/users)"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium mb-1.5">Amount</span>
              <input
                type="number"
                value={form.data.amount}
                onChange={(e) => form.setData('amount', e.target.value)}
                required
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
                placeholder="Positive to add, negative to deduct (e.g. -10)"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium mb-1.5">Description</span>
              <textarea
                value={form.data.description}
                onChange={(e) => form.setData('description', e.target.value)}
                required
                rows={3}
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
                placeholder="Reason for adjustment (e.g. 'bonus for summit help')"
              />
            </label>

            <Button type="submit" disabled={form.processing}>
              {form.processing ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

AdminKoiTransactionsNew.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>
