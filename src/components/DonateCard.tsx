'use client'

import { useState } from 'react'

// Support local artists — the same avenues as every A Schell Company project.
// Crypto rows copy on tap; the private options are the point.
const BMC_URL = 'https://buymeacoffee.com/aSchellCompany'
const CASHAPP_URL = 'https://cash.app/$Aircityryan'
const BTC = 'bc1q4q0u5f7ya3ylwg3h4sdq5yw7cgfpl4ghpu9uap'
const XMR =
  '4B3RLHnNS6tNeHEneTXcecTAntHknXzbLYR1yBP3yUWS9baUjdnHv4UdhjRubaSexuPGEGmJ4QKpxHdrHNjLMuZpHf15gUt'

function short(addr: string): string {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the row still shows the short form */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="w-full flex items-center justify-between gap-2 text-xs px-1.5 py-1 rounded border border-[#cfe5dd] bg-[#fbf9f3] hover:bg-[#f3efe4] cursor-pointer"
      title={`Copy ${label} address`}
    >
      <span className="font-bold text-[#555]">{label}</span>
      <span className="font-mono text-[#8a8375]">{copied ? 'copied ✓' : short(value)}</span>
    </button>
  )
}

export function DonateCard() {
  return (
    <div className="vt-card p-3">
      <h2 className="text-sm font-bold mb-1">
        <span className="vt-sunwash inline-block">Support local artists</span>
      </h2>
      <p className="text-xs text-[#999] mb-2">
        Every bit keeps the room lit and the artists fed.
      </p>
      <div className="flex flex-col gap-1">
        <a
          href={BMC_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-1.5 py-1 rounded border border-[#cfe5dd] bg-[#fbf9f3] hover:bg-[#f3efe4] font-bold"
        >
          ☕ Buy Me a Coffee
        </a>
        <a
          href={CASHAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-1.5 py-1 rounded border border-[#cfe5dd] bg-[#fbf9f3] hover:bg-[#f3efe4] font-bold"
        >
          💵 Cash App — $Aircityryan
        </a>
        <CopyRow label="₿ BTC" value={BTC} />
        <CopyRow label="ⓜ XMR" value={XMR} />
      </div>
    </div>
  )
}
