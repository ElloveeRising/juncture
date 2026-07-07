'use client'

// Otto the Octopus — SmallTalk's mascot, cameoing in Juncture. A badge press
// summons him to cross the screen; each badge is a different act. Drawn to
// Ryan's canon: flat single-color fill, arms the same color as the body and
// rooted on its underside, arms bigger than feels safe, both eyes open,
// side-glance pupils + asymmetric smirk (adorable AND mischievous).

export type OttoAct = 'swim' | 'drift' | 'flower' | 'jet'

const ACTS: Record<
  OttoAct,
  { kf: string; dur: number; skin: string; top: string; flower?: boolean; ink?: boolean }
> = {
  swim: { kf: 'vt-otto-swim', dur: 7, skin: '#35a893', top: '58vh' },
  drift: { kf: 'vt-otto-drift', dur: 8.5, skin: '#ef7d68', top: '0vh' },
  flower: { kf: 'vt-otto-swim', dur: 9.5, skin: '#9b7fd4', top: '28vh', flower: true },
  jet: { kf: 'vt-otto-jet', dur: 5.4, skin: '#1f8a7d', top: '44vh', ink: true },
}

function OttoSVG({ skin, flower }: { skin: string; flower?: boolean }) {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" aria-hidden>
      {/* eight arms — same color as the body, rooted on the underside curve */}
      <g stroke={skin} fill="none" strokeLinecap="round">
        <path d="M34 50 Q20 62 12 58 Q6 55 10 50" strokeWidth="8" />
        <path d="M40 55 Q34 72 22 74 Q14 75 16 68" strokeWidth="8" />
        <path d="M48 57 Q46 76 36 82 Q30 85 30 78" strokeWidth="7" />
        <path d="M56 58 Q58 78 50 88" strokeWidth="7" />
        <path d="M64 57 Q70 76 80 80 Q86 82 84 74" strokeWidth="7" />
        <path d="M72 55 Q84 68 94 66 Q100 64 96 58" strokeWidth="8" />
        <path d="M78 50 Q92 52 98 44 Q102 38 96 36" strokeWidth="8" />
        <path d="M70 32 Q86 18 82 6 Q80 0 74 4" strokeWidth="7" />
      </g>
      {/* mantle — flat fill, no dither */}
      <ellipse cx="58" cy="36" rx="30" ry="24" fill={skin} />
      {/* both eyes open, pupils side-glancing at his own waving arm */}
      <rect x="44" y="26" width="10" height="13" rx="2" fill="#fff" />
      <rect x="62" y="26" width="10" height="13" rx="2" fill="#fff" />
      <rect x="49" y="30" width="4" height="5" fill="#1f2528" />
      <rect x="67" y="30" width="4" height="5" fill="#1f2528" />
      {/* asymmetric smirk — one corner pulled up */}
      <path d="M50 50 Q58 56 68 51 q3 -2 4 -5" stroke="#1f2528" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* blush */}
      <circle cx="42" cy="44" r="3.5" fill="rgba(239,125,104,0.55)" />
      <circle cx="76" cy="44" r="3.5" fill="rgba(239,125,104,0.55)" />
      {/* the canonical sunflower, when he's carrying it */}
      {flower && (
        <g>
          <path d="M98 44 Q100 38 100 32" stroke="#2d7d5a" strokeWidth="2" fill="none" />
          <g fill="#ffd95e">
            <circle cx="100" cy="26" r="3.4" />
            <circle cx="105" cy="30" r="3.4" />
            <circle cx="103" cy="36" r="3.4" />
            <circle cx="97" cy="36" r="3.4" />
            <circle cx="95" cy="30" r="3.4" />
          </g>
          <circle cx="100" cy="31" r="3" fill="#8a5a2a" />
        </g>
      )}
    </svg>
  )
}

export function OttoSwim({ act, onDone }: { act: OttoAct; onDone: () => void }) {
  const a = ACTS[act]
  return (
    <div className="vt-otto-stage fixed inset-0 pointer-events-none z-[70] overflow-hidden" aria-hidden>
      <div
        style={{
          position: 'absolute',
          top: a.top,
          left: 0,
          animation: `${a.kf} ${a.dur}s linear forwards`,
        }}
        onAnimationEnd={onDone}
      >
        {/* bubble trail */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: -6 - i * 14,
              top: 34 + (i % 2) * 14,
              width: 8 - i,
              height: 8 - i,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.8)',
              background: 'rgba(255,255,255,0.25)',
              animation: `vt-bubble 1.5s ease-in ${i * 0.35}s infinite`,
            }}
          />
        ))}
        <OttoSVG skin={a.skin} flower={a.flower} />
      </div>
      {/* the NO ALGORITHM act ends with a defiant ink poof mid-flight */}
      {a.ink && (
        <div
          style={{
            position: 'absolute',
            top: `calc(${a.top} + 20px)`,
            left: '62vw',
            width: 90,
            height: 70,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(31,37,40,0.85), rgba(31,37,40,0.4) 60%, transparent 75%)',
            opacity: 0,
            animation: `vt-ink 0.8s ease-out ${a.dur * 0.58}s forwards`,
          }}
        />
      )}
    </div>
  )
}
