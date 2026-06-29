import type { CurrentUser } from '@/lib/auth'

// Lightweight right rail — placeholder content for M1; "who's online" and DM
// shortcuts get wired up in later milestones.
export function RightRail({ user }: { user: CurrentUser }) {
  return (
    <aside className="space-y-3">
      <div className="vt-card p-3">
        <h2 className="text-sm font-bold mb-1">Welcome</h2>
        <p className="text-sm text-[#666]">
          You&apos;re in as <strong>{user.displayName}</strong>.
        </p>
        {user.role === 'supporter' && (
          <p className="text-xs text-[#999] mt-2">
            Supporters can read, comment, and react. Posting is earned through
            contributing art — only the admin grants it.
          </p>
        )}
      </div>
      <div className="vt-card p-3">
        <h2 className="text-sm font-bold mb-1">A Schell Company</h2>
        <p className="text-xs text-[#999]">
          A window into a friendship-network of artists. Be kind; this is a small room.
        </p>
      </div>
    </aside>
  )
}
