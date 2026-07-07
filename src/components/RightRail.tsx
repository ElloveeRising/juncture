import type { CurrentUser } from '@/lib/auth'
import { QuoteWheel } from './QuoteWheel'
import { DonateCard } from './DonateCard'

export function RightRail({ user }: { user: CurrentUser }) {
  return (
    <aside className="space-y-3">
      <div className="vt-card p-3">
        <h2 className="text-sm font-bold mb-1">
          Welcome, <span className="vt-sunwash inline-block">{user.displayName}</span>
        </h2>
        {user.role === 'supporter' && (
          <p className="text-xs text-[#999] mt-1">
            Supporters can read, comment, and react. Posting is earned through
            contributing art — only the arbiters grant it.
          </p>
        )}
      </div>

      <QuoteWheel />

      <div className="vt-card p-3">
        <h2 className="text-sm font-bold mb-1">
          <a href="https://aschellcompany.com" target="_blank" rel="noreferrer">
            A Schell Company
          </a>
        </h2>
        <p className="text-xs text-[#999]">
          A window into a friendship-network of artists. Be kind; this is a small room.
        </p>
      </div>

      <DonateCard />
    </aside>
  )
}
