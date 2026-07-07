'use client'

import { useEffect, useRef, useState } from 'react'

// A little turntable for the profile song. One record, one song — the member's.
// The vinyl spins while playing, the tone arm drops onto the groove, and the
// readout shows the track info. Autoplay is attempted on arrival; if the
// browser vetoes sound-on-load (they often do until the visitor has interacted
// with the site), the needle simply waits for a click. Pure CSS/SVG — costs no
// storage, spins no bytes.

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '--:--'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RecordPlayer({
  src,
  title,
  accent,
  format,
  autoplay = true,
}: {
  src: string
  title: string
  accent: string
  format: string
  autoplay?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(NaN)

  // Try to drop the needle on arrival; fall back silently if the browser says no.
  useEffect(() => {
    if (!autoplay) return
    const audio = audioRef.current
    if (!audio) return
    const t = setTimeout(() => {
      audio.play().catch(() => {
        /* autoplay blocked — the needle waits, ready */
      })
    }, 300)
    return () => clearTimeout(t)
  }, [autoplay])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* ── The deck ── */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause the record' : 'Play the record'}
        className="relative shrink-0 rounded border border-[#b09a72] p-3 cursor-pointer"
        style={{
          background: 'linear-gradient(to bottom, #8a6d45, #6d5233)', // the wood
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.25)',
        }}
      >
        {/* platter + vinyl */}
        <div
          className={`vt-vinyl relative w-28 h-28 rounded-full ${playing ? 'spinning' : ''}`}
          style={{
            background:
              'repeating-radial-gradient(circle at center, #181818 0px, #181818 2px, #232323 3px, #181818 4px)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.6), inset 0 0 6px rgba(0,0,0,0.8)',
          }}
        >
          {/* label — wears the member's accent color */}
          <div
            className="absolute inset-0 m-auto w-11 h-11 rounded-full border border-black/30 flex items-center justify-center"
            style={{ background: accent }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#e9ebee] border border-black/40" />
          </div>
          {/* a glint so it reads as vinyl, not a void */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 40deg, transparent 0deg, rgba(255,255,255,0.08) 20deg, transparent 55deg, transparent 175deg, rgba(255,255,255,0.05) 200deg, transparent 235deg)',
            }}
          />
        </div>
        {/* tone arm — swings onto the groove while playing */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 6,
            right: 8,
            width: 10,
            height: 76,
            transformOrigin: '50% 6px',
            transform: playing ? 'rotate(24deg)' : 'rotate(-4deg)',
            transition: 'transform 600ms cubic-bezier(.4,0,.2,1)',
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#d5d5d5] border border-[#888] mx-auto" />
          <div className="w-1 h-14 bg-[#c9c9c9] border-x border-[#909090] mx-auto" />
          <div className="w-2 h-3 bg-[#8b8b8b] rounded-sm mx-auto" />
        </div>
      </button>

      {/* ── Readout ── */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold truncate" style={{ color: accent }}>
          ♫ {title}
        </div>
        <div
          className="inline-flex items-center gap-2 mt-1 px-2 py-1 rounded border border-[#333] font-mono text-xs"
          style={{ background: '#1a1f16', color: '#8aff5a', textShadow: '0 0 4px rgba(138,255,90,0.5)' }}
        >
          <span>{playing ? '▶ PLAYING' : '❚❚ STOPPED'}</span>
          <span>
            {fmt(current)} / {fmt(duration)}
          </span>
          <span className="opacity-80">{format}</span>
        </div>
        <div className="text-xs text-[#999] mt-1">
          {playing ? 'Click the record to pause.' : 'Click the record to play.'}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
    </div>
  )
}
