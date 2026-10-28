// Silkscreen is drawn on an 8-pixel grid. It only renders crisp when its font
// size is a whole multiple of 8 *device* pixels, so every bitmap size is
// snapped against the current devicePixelRatio (125 % scaling = 1.25).

import { useEffect, useState } from 'react'

/** Nearest crisp CSS font size to `target` at the current display scale. */
export function pixelSize(target: number, dpr = window.devicePixelRatio || 1): number {
  return (Math.max(1, Math.round((target * dpr) / 8)) * 8) / dpr
}

// CSS custom properties consumed by globals.css (target sizes in CSS px)
const TOKENS: Record<string, number> = {
  '--fs-code':   11,  // ribbons, tags, env codes, kbd, row numbers, labels
  '--fs-cap':    18,  // hotkey keycaps
  '--fs-choice': 26,  // add-org choices
  '--fs-title':  32,  // state + view headlines
}

function applyTokens() {
  const root = document.documentElement.style
  for (const [name, target] of Object.entries(TOKENS)) {
    root.setProperty(name, `${pixelSize(target)}px`)
  }
}

const listeners = new Set<() => void>()

/** Re-snaps on display-scale changes (window moved to another monitor, zoom). */
export function watchPixelGrid() {
  applyTokens()
  const watch = () => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    mq.addEventListener('change', () => {
      applyTokens()
      listeners.forEach(fn => fn())
      watch()
    }, { once: true })
  }
  watch()
}

/** Re-renders the caller when the display scale changes. */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(window.devicePixelRatio || 1)
  useEffect(() => {
    const fn = () => setDpr(window.devicePixelRatio || 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  return dpr
}
