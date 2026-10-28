// Line icons share one stroke weight; the pixel icon mirrors the tray/app icon.

type P = { size?: number }

const line = (size: number, children: React.ReactNode, sw = 2) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)

export const IconSearch  = ({ size = 17 }: P) => line(size, <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>)
export const IconPlus    = ({ size = 14 }: P) => line(size, <path d="M12 5v14M5 12h14"/>)
export const IconBack    = ({ size = 14 }: P) => line(size, <path d="M15 6l-6 6 6 6"/>)
export const IconPencil  = ({ size = 14 }: P) => line(size, <><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></>)
export const IconTrash   = ({ size = 14 }: P) => line(size, <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></>)
export const IconSliders = ({ size = 14 }: P) => line(size, <><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></>)

export function IconRefresh({ size = 14, spinning = false }: P & { spinning?: boolean }) {
  return (
    <span style={{ display: 'grid', animation: spinning ? 'spin 0.8s linear infinite' : undefined }}>
      {line(size, <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></>)}
    </span>
  )
}

// ── Pixel Enter glyph (replaces the ↵ character, which the app fonts lack) ────

const ENTER_GLYPH = [
  '........##',
  '........##',
  '..#.....##',
  '.##.....##',
  '##########',
  '##########',
  '.##.......',
  '..#.......',
]

/** Enter key glyph drawn on the same pixel grid; inherits the text colour. */
export function EnterGlyph({ height = 8 }: { height?: number }) {
  return (
    <svg width={height * 1.25} height={height} viewBox="0 0 10 8" shapeRendering="crispEdges"
      fill="currentColor" aria-label="Enter" role="img" style={{ display: 'inline-block', flex: 'none' }}>
      {ENTER_GLYPH.flatMap((row, y) =>
        [...row].map((ch, x) => ch === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null))}
    </svg>
  )
}

// ── Pixel ↵ tile (same grid as the tray icon in src-tauri/src/tray.rs) ────────

export const PIXEL_ICON = [
  '..eeeeeeeeeeee..',
  '.ekkkkkkkkkkkke.',
  'ekkkkkkkkkkkkkke',
  'ekkkkkkkkkkkkkke',
  'ekkkkkkkkkkllkke',
  'ekkkkkkkkkkllkke',
  'ekkkklkkkkkllkke',
  'ekkkllkkkkkllkke',
  'ekkllllllllllkke',
  'ekkllllllllllkke',
  'ekkkllkkkkkkkkke',
  'ekkkklkkkkkkkkke',
  'ekkkkkkkkkkkkkke',
  'ekkkkkkkkkkkkkke',
  '.ekkkkkkkkkkkke.',
  '..eeeeeeeeeeee..',
]
const PIXEL_COLORS: Record<string, string> = { e: '#3C3C3C', k: '#1E1E1E', l: '#D4FF3A' }

export function PixelIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      {PIXEL_ICON.flatMap((row, y) =>
        [...row].map((ch, x) => ch === '.' ? null :
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PIXEL_COLORS[ch]} />)
      )}
    </svg>
  )
}
