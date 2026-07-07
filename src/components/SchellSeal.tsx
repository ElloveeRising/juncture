// The company seal — pinned to every page so any screenshot carries the name.
// Non-interactive (clicks pass straight through it).
export function SchellSeal() {
  return (
    <div aria-hidden className="fixed bottom-2 right-2 z-50 pointer-events-none select-none">
      <div
        className="vt-pixel text-[10px] leading-tight text-right px-2 py-1 rounded border"
        style={{
          background: 'rgba(247, 243, 234, 0.92)',
          borderColor: '#bcd8cd',
          color: '#1f8a7d',
          boxShadow: 'inset 1px 1px 0 #fff, 0 1px 2px rgba(0,0,0,0.18)',
        }}
      >
        ★ A SCHELL COMPANY ★
        <br />
        <span style={{ color: '#8a9489' }}>handmade network</span>
      </div>
    </div>
  )
}
