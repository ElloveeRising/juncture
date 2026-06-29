import { APP_NAME } from '@/lib/config'

// M0 placeholder — replaced in M1 with auth redirect logic
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="vt-card p-8 text-center max-w-sm w-full mx-4">
        <div
          className="text-white text-xl font-bold px-4 py-2 rounded mb-4 inline-block"
          style={{ background: 'var(--chrome)' }}
        >
          {APP_NAME}
        </div>
        <p className="text-[#666] text-sm">
          members only &middot; sign in to continue
        </p>
        <p className="text-[#999] text-xs mt-3">
          scaffold · M0
        </p>
      </div>
    </main>
  )
}
