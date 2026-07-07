export type LinkPreviewView = {
  url: string
  title: string | null
  description: string | null
  imagePath: string | null
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function LinkPreviewCard({ preview }: { preview: LinkPreviewView }) {
  const host = hostOf(preview.url)
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer nofollow"
      className="mt-2 flex border border-[#cfe5dd] rounded overflow-hidden hover:bg-[#f7f7f7] no-underline"
    >
      {preview.imagePath && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/media/${preview.imagePath}`}
          alt=""
          loading="lazy"
          className="w-24 sm:w-32 object-cover bg-[#f0f0f0] shrink-0"
        />
      )}
      <div className="p-2 min-w-0">
        <div className="text-xs text-[#999] uppercase tracking-wide">{host}</div>
        {preview.title && (
          <div className="text-sm font-bold text-[#333] truncate">{preview.title}</div>
        )}
        {preview.description && (
          <div className="text-xs text-[#666] line-clamp-2">{preview.description}</div>
        )}
      </div>
    </a>
  )
}
