import Link from 'next/link'
import { adminCounts } from '@/lib/admin'

export const dynamic = 'force-dynamic'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="vt-card p-3 text-center">
      <div className="text-2xl font-bold text-[#3b5998]">{value}</div>
      <div className="text-xs text-[#666]">{label}</div>
    </div>
  )
}

export default function AdminOverview() {
  const c = adminCounts()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Members" value={c.users} />
        <Stat label="Creators" value={c.creators} />
        <Stat label="Posts" value={c.posts} />
        <Stat label="Open reports" value={c.openReports} />
      </div>
      <div className="vt-card p-4 text-sm">
        <p className="mb-2">
          <strong>You are the sole arbiter.</strong> Posting is earned in art — promote a
          supporter to creator from <Link href="/admin/users">Users</Link>, and the grant is
          logged with your note.
        </p>
        {c.openReports > 0 && (
          <p className="text-[#8b1a1a]">
            {c.openReports} open report{c.openReports === 1 ? '' : 's'} waiting in{' '}
            <Link href="/admin/reports">Reports</Link>.
          </p>
        )}
      </div>
    </div>
  )
}
