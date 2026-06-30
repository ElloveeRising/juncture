import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'

// Hard gate: every /admin/* route requires the admin (Ryan). Non-admins are
// redirected away by requireAdmin before any admin data is loaded.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="space-y-4">
      <div className="vt-card p-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">Arbiter console</h1>
          <nav className="flex gap-3 text-sm">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/reports">Reports</Link>
          </nav>
        </div>
        <p className="text-xs text-[#999] mt-1">
          Admin-only. This is the one place real emails are visible.
        </p>
      </div>
      {children}
    </div>
  )
}
