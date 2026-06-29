export type PostMediaView = {
  id: number
  kind: 'image' | 'audio'
  path: string
  thumbPath: string | null
  width: number | null
  height: number | null
}

function mediaUrl(p: string): string {
  return `/media/${p}`
}

export function PostMedia({ media }: { media: PostMediaView[] }) {
  if (!media.length) return null
  const images = media.filter((m) => m.kind === 'image')
  const audio = media.filter((m) => m.kind === 'audio')

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div
          className={
            images.length === 1
              ? 'grid grid-cols-1'
              : 'grid grid-cols-2 gap-1 sm:grid-cols-3'
          }
        >
          {images.map((img) => (
            <a
              key={img.id}
              href={mediaUrl(img.path)}
              target="_blank"
              rel="noreferrer"
              className="block border border-[#d8dfea] rounded overflow-hidden bg-[#f0f0f0]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(img.thumbPath ?? img.path)}
                alt=""
                loading="lazy"
                className="w-full h-auto object-cover"
                style={images.length === 1 ? { maxHeight: 520, objectFit: 'contain' } : undefined}
              />
            </a>
          ))}
        </div>
      )}
      {audio.map((a) => (
        <audio key={a.id} controls preload="none" className="w-full" src={mediaUrl(a.path)}>
          Your browser does not support audio playback.
        </audio>
      ))}
    </div>
  )
}
