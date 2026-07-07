'use client'

import { useEffect, useMemo, useState } from 'react'
import { QUOTES } from '@/lib/quotes'

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// One quote at a time, shuffled, ~32s each — the full wheel takes minutes to
// come back around. Stake it out if you want to see them all.
export function QuoteWheel() {
  const deck = useMemo(() => shuffled(QUOTES), [])
  const [i, setI] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setI((n) => (n + 1) % deck.length)
        setVisible(true)
      }, 650)
    }, 32000)
    return () => clearInterval(t)
  }, [deck.length])

  const q = deck[i]
  return (
    <div className="vt-card p-3">
      <div
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 650ms ease',
          minHeight: 54,
        }}
      >
        <div className="vt-sunwash inline-block">
          <p className="text-sm italic text-[#41403a] leading-snug">“{q.text}”</p>
        </div>
        {q.attribution && (
          <p className="text-xs text-[#8a8375] mt-1 text-right">— {q.attribution}</p>
        )}
      </div>
    </div>
  )
}
