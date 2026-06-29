import { APP_NAME } from '@/lib/config'

export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl px-4 py-2' : 'text-lg px-3 py-1'
  return (
    <span
      className={`inline-block font-bold text-white rounded ${cls}`}
      style={{ background: 'var(--chrome)', letterSpacing: '0.02em' }}
    >
      {APP_NAME}
    </span>
  )
}
