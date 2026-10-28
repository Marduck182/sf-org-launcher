import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { OrgType } from '../../../shared/types'
import { pixelSize, useDevicePixelRatio } from '../pixelGrid'

// Target steps in CSS px; each is snapped to the 8-device-pixel grid.
const TARGETS = [48, 40, 32, 24, 16]

const RULE: Record<OrgType, string> = {
  production: 'var(--prod)',
  devhub:     'var(--prod)',
  sandbox:    'var(--sbx)',
  scratch:    'var(--scr)',
  unknown:    'var(--ink-2)',
}

/** Picks the largest crisp size at which the measured element fits its width. */
function useFittedSize(text: string) {
  const ref = useRef<HTMLElement>(null)
  const dpr = useDevicePixelRatio()
  const sizes = useMemo(() => [...new Set(TARGETS.map(t => pixelSize(t, dpr)))], [dpr])
  const [size, setSize] = useState(sizes[0])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    for (const s of sizes) {
      el.style.fontSize = `${s}px`
      if (el.scrollWidth <= el.clientWidth) { setSize(s); return }
    }
    setSize(sizes[sizes.length - 1])
  }, [text, sizes])

  return { ref, size }
}

/**
 * The selected org's alias set as a bitmap specimen, underlined in its
 * environment colour. Production (and Dev Hub) sets the whole name in red.
 */
export function SpecimenTitle({ text, orgType }: { text: string; orgType: OrgType }) {
  const upper = text.toUpperCase()
  const { ref, size } = useFittedSize(upper)
  const prod = orgType === 'production' || orgType === 'devhub'

  return (
    <h1 ref={ref as React.RefObject<HTMLHeadingElement>} className="hl reveal" style={{ fontSize: size }} title={text}>
      <span
        className={prod ? 'word t-production' : 'word ink'}
        style={{ ['--rule' as string]: RULE[orgType] }}
      >
        {upper}
      </span>
    </h1>
  )
}

/** A bitmap headline that isn't an org (view titles, the hotkey). */
export function SpecimenText({ children }: { children: string }) {
  const { ref, size } = useFittedSize(children)
  return (
    <h1 ref={ref as React.RefObject<HTMLHeadingElement>} className="hl" style={{ fontSize: size }}>
      {children}
    </h1>
  )
}

/** Same specimen scale, editable (rename). */
export function SpecimenInput({ value, onChange, onSubmit, onCancel }: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const { ref, size } = useFittedSize(value.toUpperCase() || 'W')
  return (
    <>
      {/* Hidden twin measures the text so the input steps down like the title */}
      <span ref={ref as React.RefObject<HTMLSpanElement>} className="hl" aria-hidden
        style={{ position: 'absolute', visibility: 'hidden', left: 18, right: 18 }}>
        {value.toUpperCase() || 'W'}
      </span>
      <input
        autoFocus
        className="hl-input"
        style={{ fontSize: size }}
        value={value}
        spellCheck={false}
        aria-label="New alias"
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter')  { e.preventDefault(); e.stopPropagation(); onSubmit() }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() }
        }}
      />
    </>
  )
}
