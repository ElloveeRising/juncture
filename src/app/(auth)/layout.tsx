import { Wordmark } from '@/components/Wordmark'
import { APP_NAME } from '@/lib/config'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-5 text-center">
        <Wordmark size="lg" />
        <p className="text-[#666] text-sm mt-2">a members-only window for A Schell Company</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <p className="text-[#999] text-xs mt-6">
        {APP_NAME} &middot; you must be a member to enter
      </p>
    </main>
  )
}
