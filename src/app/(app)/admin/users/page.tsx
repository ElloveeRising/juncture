import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { listAllUsers } from '@/lib/admin'
import { UserAdminControls } from './UserAdminControls'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const admin = await requireAdmin()
  const users = listAllUsers()

  return (
    <div className="vt-card p-0 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#f0f2f7] text-left text-xs text-[#666]">
            <th className="p-2">Member</th>
            <th className="p-2">Email (private)</th>
            <th className="p-2">Role</th>
            <th className="p-2">Posts</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-[#eee] align-top">
              <td className="p-2">
                <Link href={`/u/${u.handle}`} className="font-bold">
                  {u.displayName}
                </Link>
                <div className="text-xs text-[#999]">
                  @{u.handle}
                  {u.isAnonymous && <span className="ml-1">🕶</span>}
                </div>
                <div className="text-xs text-[#bbb]">acct: {u.username}</div>
              </td>
              <td className="p-2 text-[#666]">{u.email}</td>
              <td className="p-2 capitalize">{u.role}</td>
              <td className="p-2">{u.postCount}</td>
              <td className="p-2">
                {u.status === 'suspended' ? (
                  <span className="text-[#c0503c] font-bold">suspended</span>
                ) : (
                  <span className="text-[#2d7d5a]">active</span>
                )}
              </td>
              <td className="p-2">
                <UserAdminControls
                  userId={u.id}
                  role={u.role}
                  status={u.status}
                  isSelf={u.id === admin.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
