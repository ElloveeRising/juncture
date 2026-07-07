'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createPostAction } from '@/app/(app)/feed/post-actions'
import { POST_MAX, type PostState } from '@/lib/post-constants'
import {
  IMAGE_ACCEPT,
  AUDIO_ACCEPT,
  MAX_IMAGES_PER_POST,
} from '@/lib/media-constants'
import { LinkPreviewCard, type LinkPreviewView } from './LinkPreviewCard'

const CLIENT_URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/i

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn" disabled={pending}>
      {pending ? 'Sharing…' : 'Share'}
    </button>
  )
}

export function Composer({ displayName }: { displayName: string }) {
  const [state, action] = useActionState<PostState, FormData>(createPostAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [audioName, setAudioName] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [link, setLink] = useState<LinkPreviewView | null>(null)
  const [dismissedUrl, setDismissedUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      setPreviews((prev) => {
        prev.forEach(URL.revokeObjectURL)
        return []
      })
      setAudioName(null)
      setBody('')
      setLink(null)
      setDismissedUrl(null)
      router.refresh()
    }
  }, [state.ok, router])

  // Live OpenGraph unfurl of the first link as you type (debounced).
  useEffect(() => {
    const m = CLIENT_URL_RE.exec(body)
    const url = m ? m[0].replace(/[.,;:!?]+$/, '') : null
    if (!url || url === dismissedUrl) {
      setLink(null)
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`)
        if (!res.ok) return
        const data = (await res.json()) as { preview: LinkPreviewView | null }
        if (!cancelled) setLink(data.preview)
      } catch {
        /* ignore — preview is optional */
      }
    }, 700)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [body, dismissedUrl])

  // Clean up object URLs on unmount.
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  function onImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES_PER_POST)
    setPreviews((prev) => {
      prev.forEach(URL.revokeObjectURL)
      return files.map((f) => URL.createObjectURL(f))
    })
  }
  function onAudio(e: React.ChangeEvent<HTMLInputElement>) {
    setAudioName(e.target.files?.[0]?.name ?? null)
  }

  return (
    <div className="vt-card p-3">
      <form ref={formRef} action={action} className="space-y-2">
        {state.error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            {state.error}
          </div>
        )}
        <textarea
          name="body"
          className="vt-textarea"
          placeholder={`What's on your mind, ${displayName}?`}
          maxLength={POST_MAX}
          onChange={(e) => setBody(e.target.value)}
        />

        {link && (
          <div className="relative">
            <LinkPreviewCard preview={link} />
            <button
              type="button"
              title="Remove preview"
              className="absolute top-1 right-1 bg-white/90 border border-[#cfe5dd] rounded px-1 text-xs text-[#666]"
              onClick={() => {
                setDismissedUrl(link.url)
                setLink(null)
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Hidden file inputs, triggered by the toolbar buttons */}
        <input
          ref={imgInputRef}
          type="file"
          name="images"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={onImages}
        />
        <input
          ref={audioInputRef}
          type="file"
          name="audio"
          accept={AUDIO_ACCEPT}
          className="hidden"
          onChange={onAudio}
        />

        {previews.length > 0 && (
          <div className="grid grid-cols-4 gap-1">
            {previews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="w-full h-16 object-cover rounded border border-[#cfe5dd]"
              />
            ))}
          </div>
        )}
        {audioName && (
          <p className="text-xs text-[#666]">♪ {audioName}</p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="vt-btn-ghost"
            onClick={() => imgInputRef.current?.click()}
          >
            📷 Photo
          </button>
          <button
            type="button"
            className="vt-btn-ghost"
            onClick={() => audioInputRef.current?.click()}
          >
            ♪ Audio
          </button>
          <div className="ml-auto">
            <SubmitBtn />
          </div>
        </div>
      </form>
    </div>
  )
}
