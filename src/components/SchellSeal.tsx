// The company seal — pinned to every page so any screenshot carries the name.
// Non-interactive (clicks pass straight through it).
export function SchellSeal() {
  return (
    <div aria-hidden className="fixed bottom-2 right-2 z-50 pointer-events-none select-none">
      <div
        className="vt-pixel text-[10px] leading-tight text-right px-2 py-1 rounded border"
        style={{
          background: 'rgba(233, 235, 238, 0.92)',
          borderColor: '#b9c3d6',
          color: '#3b5998',
          boxShadow: 'inset 1px 1px 0 #fff, 0 1px 2px rgba(0,0,0,0.18)',
        }}
      >
        ★ A SCHELL COMPANY ★
        <br />
        <span style={{ color: '#8a94a6' }}>handmade network</span>
      </div>
    </div>
  )
}
