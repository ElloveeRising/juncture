'use client'

import { useEffect, useId, useRef, useState } from 'react'

// The Juncture turntable. Every piece of audio in the club plays on one of
// these. v2: real inertia (the platter spins up and coasts down), vinyl
// noises synthesized in WebAudio (needle drop, crackle bed, needle lift —
// no audio assets, zero storage), and the track's actual ID3 tags read in
// the browser and printed around the spinning label.

// ── Only one deck spins at a time ───────────────────────────────────────────
let currentDeck: HTMLAudioElement | null = null
function claimDeck(el: HTMLAudioElement) {
  if (currentDeck && currentDeck !== el && !currentDeck.paused) currentDeck.pause()
  currentDeck = el
}

// ── Vinyl foley, synthesized (shared AudioContext, built on first gesture) ──
let actx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!actx) {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      actx = new AC()
    } catch {
      return null
    }
  }
  return actx
}
async function withAudio(fn: (c: AudioContext) => void) {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') {
    try {
      await c.resume()
    } catch {
      return
    }
  }
  if (c.state === 'running') fn(c)
}

function makeNoise(c: AudioContext, seconds: number, shape: (i: number, n: number) => number): AudioBuffer {
  const n = Math.floor(c.sampleRate * seconds)
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = shape(i, n)
  return buf
}

/** The needle touching down: a soft low thump + a burst of contact fuzz. */
function playNeedleDrop() {
  withAudio((c) => {
    const t = c.currentTime
    // thump
    const osc = c.createOscillator()
    const og = c.createGain()
    osc.frequency.setValueAtTime(85, t)
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12)
    og.gain.setValueAtTime(0.18, t)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(og).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.18)
    // contact fuzz
    const fuzz = c.createBufferSource()
    fuzz.buffer = makeNoise(c, 0.22, (i, n) => (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5) * 0.5)
    const fg = c.createGain()
    fg.gain.value = 0.12
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3200
    fuzz.connect(lp).connect(fg).connect(c.destination)
    fuzz.start(t)
  })
}

/** The needle coming off: a tick and a tiny swish. */
function playNeedleLift() {
  withAudio((c) => {
    const t = c.currentTime
    const tick = c.createBufferSource()
    tick.buffer = makeNoise(c, 0.05, (i, n) => (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.2) * 0.4)
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1800
    const g = c.createGain()
    g.gain.value = 0.08
    tick.connect(hp).connect(g).connect(c.destination)
    tick.start(t)
  })
}

/** Continuous faint surface crackle under the music. Returns a stop function. */
function startCrackle(): () => void {
  let stopped = false
  let src: AudioBufferSourceNode | null = null
  let gain: GainNode | null = null
  withAudio((c) => {
    if (stopped) return
    src = c.createBufferSource()
    src.buffer = makeNoise(c, 2.4, () => {
      // sparse pops over a whisper of surface noise
      const pop = Math.random() < 0.0012 ? (Math.random() * 2 - 1) * Math.random() : 0
      const floor = (Math.random() * 2 - 1) * 0.012
      return pop + floor
    })
    src.loop = true
    gain = c.createGain()
    gain.gain.value = 0.055
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 5200
    src.connect(lp).connect(gain).connect(c.destination)
    src.start()
  })
  return () => {
    stopped = true
    try {
      gain?.gain.setTargetAtTime(0.0001, getCtx()?.currentTime ?? 0, 0.05)
      const s = src
      setTimeout(() => {
        try {
          s?.stop()
        } catch {}
      }, 200)
    } catch {}
  }
}

// ── ID3v2 tag reader (title / artist / album straight off the file) ────────
type Id3 = { title?: string; artist?: string; album?: string }

function syncsafe(b: DataView, off: number): number {
  return ((b.getUint8(off) & 0x7f) << 21) | ((b.getUint8(off + 1) & 0x7f) << 14) | ((b.getUint8(off + 2) & 0x7f) << 7) | (b.getUint8(off + 3) & 0x7f)
}
function decodeText(bytes: Uint8Array): string {
  if (!bytes.length) return ''
  const enc = bytes[0]
  const body = bytes.subarray(1)
  try {
    const label = enc === 0 ? 'iso-8859-1' : enc === 1 ? 'utf-16' : enc === 2 ? 'utf-16be' : 'utf-8'
    return new TextDecoder(label).decode(body).replace(/\0+$/g, '').replace(/\0/g, ' ').trim()
  } catch {
    return ''
  }
}
async function readId3(src: string): Promise<Id3> {
  try {
    const res = await fetch(src, { headers: { Range: 'bytes=0-262143' } })
    if (!res.ok) return {}
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.length < 10 || buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return {} // "ID3"
    const view = new DataView(buf.buffer)
    const version = buf[3] // 3 = v2.3, 4 = v2.4
    const flags = buf[5]
    const tagSize = syncsafe(view, 6)
    let pos = 10
    if (flags & 0x40) pos += (version === 4 ? syncsafe(view, 10) : view.getUint32(10)) // ext header
    const end = Math.min(10 + tagSize, buf.length - 10)
    const out: Id3 = {}
    while (pos + 10 <= end) {
      const id = String.fromCharCode(buf[pos], buf[pos + 1], buf[pos + 2], buf[pos + 3])
      if (!/^[A-Z0-9]{4}$/.test(id)) break
      const size = version === 4 ? syncsafe(view, pos + 4) : view.getUint32(pos + 4)
      if (size <= 0 || pos + 10 + size > buf.length) break
      const body = buf.subarray(pos + 10, pos + 10 + size)
      if (id === 'TIT2') out.title = decodeText(body)
      if (id === 'TPE1') out.artist = decodeText(body)
      if (id === 'TALB') out.album = decodeText(body)
      if (out.title && out.artist && out.album) break
      pos += 10 + size
    }
    return out
  } catch {
    return {}
  }
}

// ── The deck ────────────────────────────────────────────────────────────────
function fmtTime(t: number): string {
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
  autoplay = false,
  size = 'md',
}: {
  src: string
  title: string
  accent: string
  format: string
  autoplay?: boolean
  size?: 'md' | 'sm'
}) {
  const uid = useId().replace(/[:]/g, '')
  const audioRef = useRef<HTMLAudioElement>(null)
  const discRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const velRef = useRef(0) // deg/s
  const angleRef = useRef(0)
  const lastRef = useRef<number | null>(null)
  const playingRef = useRef(false)
  const crackleStopRef = useRef<(() => void) | null>(null)

  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(NaN)
  const [meta, setMeta] = useState<Id3>({})

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // Read the real tags off the record.
  useEffect(() => {
    let alive = true
    readId3(src).then((m) => {
      if (alive) setMeta(m)
    })
    return () => {
      alive = false
    }
  }, [src])

  // Inertia loop — the platter accelerates to speed and coasts to a stop.
  function ensureLoop() {
    if (reduceMotion || rafRef.current != null) return
    const step = (ts: number) => {
      const last = lastRef.current ?? ts
      const dt = Math.min(0.05, (ts - last) / 1000)
      lastRef.current = ts
      const target = playingRef.current ? 210 : 0
      const rate = playingRef.current ? 2.4 : 1.15 // spin-up faster than coast-down
      velRef.current += (target - velRef.current) * Math.min(1, dt * rate)
      if (!playingRef.current && velRef.current < 2) velRef.current = 0
      angleRef.current = (angleRef.current + velRef.current * dt) % 360
      if (discRef.current) discRef.current.style.transform = `rotate(${angleRef.current}deg)`
      if (playingRef.current || velRef.current > 0) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        lastRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      crackleStopRef.current?.()
      if (currentDeck === audioRef.current) currentDeck = null
    },
    [],
  )

  // Polite autoplay for visitors.
  useEffect(() => {
    if (!autoplay) return
    const audio = audioRef.current
    if (!audio) return
    const t = setTimeout(() => audio.play().catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [autoplay])

  function onPlay() {
    const el = audioRef.current
    if (el) claimDeck(el)
    playingRef.current = true
    setPlaying(true)
    playNeedleDrop()
    crackleStopRef.current?.()
    crackleStopRef.current = startCrackle()
    ensureLoop()
  }
  function onStop(lift: boolean) {
    playingRef.current = false
    setPlaying(false)
    crackleStopRef.current?.()
    crackleStopRef.current = null
    if (lift) playNeedleLift()
    ensureLoop() // keep animating the coast-down
  }
  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }

  const displayTitle = meta.title || title
  const subline = [meta.artist, meta.album].filter(Boolean).join(' — ')
  const labelText = `${(meta.title || title).toUpperCase()} ● ${(meta.artist || 'A SCHELL COMPANY').toUpperCase()} ● `

  const discPx = size === 'md' ? 112 : 72
  const labelPx = size === 'md' ? 46 : 32

  return (
    <div className={`flex items-center gap-3 flex-wrap ${size === 'sm' ? 'gap-2' : 'gap-4'}`}>
      {/* ── deck ── */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${displayTitle}` : `Play ${displayTitle}`}
        className="relative shrink-0 rounded border border-[#b09a72] cursor-pointer"
        style={{
          padding: size === 'md' ? 12 : 8,
          background: 'linear-gradient(to bottom, #8a6d45, #6d5233)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.25)',
        }}
      >
        <div className="relative" style={{ width: discPx, height: discPx }}>
          {/* vinyl — rotated by the inertia loop */}
          <div
            ref={discRef}
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'repeating-radial-gradient(circle at center, #161616 0px, #161616 2px, #222 3px, #161616 4px)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.6), inset 0 0 6px rgba(0,0,0,0.85)',
            }}
          >
            {/* label wearing the member's accent */}
            <div
              className="absolute rounded-full border border-black/30"
              style={{
                width: labelPx,
                height: labelPx,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: accent,
              }}
            >
              <div
                className="absolute rounded-full bg-[#e9ebee] border border-black/40"
                style={{ width: 6, height: 6, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
              />
            </div>
            {/* the track's real tags, pressed around the label — spins with it */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
              <defs>
                <path id={`rp-${uid}`} d="M 50,50 m -31,0 a 31,31 0 1,1 62,0 a 31,31 0 1,1 -62,0" />
              </defs>
              <text style={{ fontSize: 5.2, fontFamily: 'Courier New, monospace', fill: 'rgba(255,255,255,0.85)', letterSpacing: 0.6 }}>
                <textPath href={`#rp-${uid}`}>{labelText.repeat(2).slice(0, 110)}</textPath>
              </text>
            </svg>
          </div>
          {/* static sheen — the light source doesn't spin */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'conic-gradient(from 35deg, transparent 0deg, rgba(255,255,255,0.10) 18deg, transparent 60deg, transparent 170deg, rgba(255,255,255,0.05) 200deg, transparent 240deg)',
            }}
          />
        </div>
        {/* tone arm — drops onto the groove, settles */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: size === 'md' ? 5 : 3,
            right: size === 'md' ? 7 : 4,
            width: 10,
            height: discPx * 0.68,
            transformOrigin: '50% 6px',
            transform: playing ? 'rotate(23deg)' : 'rotate(-5deg)',
            transition: 'transform 700ms cubic-bezier(.34,1.3,.44,1)',
            filter: 'drop-shadow(1px 2px 1px rgba(0,0,0,0.35))',
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#d5d5d5] border border-[#888] mx-auto" />
          <div className="w-1 bg-[#c9c9c9] border-x border-[#909090] mx-auto" style={{ height: discPx * 0.48 }} />
          <div className="w-2 h-3 bg-[#8b8b8b] rounded-sm mx-auto" />
        </div>
      </button>

      {/* ── readout ── */}
      <div className="min-w-0 flex-1">
        <div className={`font-bold truncate ${size === 'sm' ? 'text-xs' : 'text-sm'}`} style={{ color: accent }}>
          ♫ {displayTitle}
        </div>
        {subline && (
          <div className={`text-[#666] truncate ${size === 'sm' ? 'text-[11px]' : 'text-xs'}`}>{subline}</div>
        )}
        <div
          className="inline-flex items-center gap-2 mt-1 px-2 py-0.5 rounded border border-[#333] font-mono text-[11px]"
          style={{ background: '#1a1f16', color: '#8aff5a', textShadow: '0 0 4px rgba(138,255,90,0.5)' }}
        >
          <span>{playing ? '▶ PLAYING' : '❚❚ STOPPED'}</span>
          <span>
            {fmtTime(current)} / {fmtTime(duration)}
          </span>
          <span className="opacity-80">{format}</span>
        </div>
        {size === 'md' && (
          <div className="text-xs text-[#999] mt-1">
            {playing ? 'Click the record to pause.' : 'Click the record to play.'}
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={onPlay}
        onPause={() => onStop(true)}
        onEnded={() => onStop(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
    </div>
  )
}
