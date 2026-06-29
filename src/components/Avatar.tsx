// Small square avatar — image if present, otherwise initials on a muted block.
// Boxy and bordered, to match the early-2000s skin.
export function Avatar({
  displayName,
  src,
  size = 36,
}: {
  displayName: string
  src?: string | null
  size?: number
}) {
  const initials = displayName.trim().slice(0, 2).toUpperCase() || '?'
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={displayName}
        width={size}
        height={size}
        className="rounded border border-[#d8dfea] object-cover bg-[#eee]"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded border border-[#d8dfea] flex items-center justify-center text-white font-bold select-none"
      style={{ width: size, height: size, background: 'var(--chrome-sec)', fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials}
    </div>
  )
}
