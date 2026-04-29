import { useCallback, useEffect, useRef, useState } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map browser KeyboardEvent.key → Electron accelerator token */
function keyToAccelerator(key: string): string | null {
  const map: Record<string, string> = {
    Control: 'CommandOrControl', Meta: 'CommandOrControl',
    Shift: 'Shift', Alt: 'Alt',
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Enter: 'Return', Backspace: 'Backspace', Delete: 'Delete',
    Tab: 'Tab', Escape: 'Escape', ' ': 'Space',
    '+': 'Plus', '-': 'numsub',
  }
  if (map[key]) return map[key]
  if (/^F(\d{1,2})$/.test(key)) return key            // F1-F12
  if (key.length === 1) return key.toUpperCase()        // A-Z, 0-9
  return null
}

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Shift', 'Alt'])

/** Convert an Electron accelerator string to a human-readable label */
function formatForDisplay(accel: string): string {
  return accel
    .replace(/CommandOrControl/g, 'Ctrl')
    .replace(/\+/g, ' + ')
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HotkeyRecorder({ onClose }: Props) {
  const [current, setCurrent]   = useState('')
  const [recording, setRecording] = useState(false)
  const [combo, setCombo]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const recorderRef = useRef<HTMLButtonElement>(null)

  // Load current hotkey
  useEffect(() => {
    window.electronAPI.getHotkey().then(res => {
      if (res.success) setCurrent(res.data)
    })
  }, [])

  // Build accelerator string from a keyboard event
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()

    // Ignore lone modifier presses
    if (MODIFIER_KEYS.has(e.key)) return

    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
    if (e.shiftKey)             parts.push('Shift')
    if (e.altKey)               parts.push('Alt')

    const mainKey = keyToAccelerator(e.key)
    if (!mainKey) return

    // Require at least one modifier
    if (parts.length === 0) {
      setError('Use at least one modifier (Ctrl, Shift, Alt)')
      return
    }

    parts.push(mainKey)
    const accelerator = parts.join('+')
    setCombo(accelerator)
    setRecording(false)
    setError('')
  }, [recording])

  const startRecording = useCallback(() => {
    setRecording(true)
    setCombo('')
    setError('')
    // Focus the recorder button so it captures key events
    requestAnimationFrame(() => recorderRef.current?.focus())
  }, [])

  const save = useCallback(async () => {
    if (!combo) return
    setSaving(true)
    setError('')
    const res = await window.electronAPI.setHotkey(combo)
    setSaving(false)
    if (res.success) {
      setCurrent(combo)
      setCombo('')
      onClose()
    } else {
      setError(res.error)
    }
  }, [combo, onClose])

  const handleExport = useCallback(async () => {
    setExporting(true)
    setError('')
    const res = await window.electronAPI.exportData()
    setExporting(false)
    if (!res.success && res.error !== 'Cancelled') setError(res.error)
  }, [])

  const handleImport = useCallback(async () => {
    setImporting(true)
    setError('')
    const res = await window.electronAPI.importData()
    setImporting(false)
    if (res.success) {
      // Reload current hotkey after import
      const hk = await window.electronAPI.getHotkey()
      if (hk.success) setCurrent(hk.data)
      onClose()
    } else if (res.error !== 'Cancelled') {
      setError(res.error)
    }
  }, [onClose])

  return (
    <div className="animate-fade-in flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-text text-sm font-semibold">Global Hotkey</h2>
        <button
          onClick={onClose}
          className="text-overlay0 hover:text-text text-xs px-2 py-1 rounded
            hover:bg-surface0 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Current */}
      <div className="flex items-center gap-2">
        <span className="text-subtext0 text-xs">Current:</span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
          bg-surface0 border border-surface1 text-text text-xs font-mono">
          {current ? formatForDisplay(current) : '…'}
        </span>
      </div>

      {/* Recorder */}
      <button
        ref={recorderRef}
        onClick={startRecording}
        onKeyDown={handleKeyDown}
        className={`
          w-full py-4 rounded-xl border-2 border-dashed text-sm font-medium
          transition-colors outline-none
          ${recording
            ? 'border-blue text-blue bg-blue/5 animate-pulse'
            : combo
              ? 'border-green/40 text-green bg-green/5'
              : 'border-surface1 text-overlay0 hover:border-overlay0 hover:text-text'
          }
        `}
      >
        {recording
          ? 'Press your desired key combination…'
          : combo
            ? formatForDisplay(combo)
            : 'Click here to record a new hotkey'
        }
      </button>

      {/* Error */}
      {error && (
        <p className="text-red text-xs">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs text-overlay0 hover:text-text
            hover:bg-surface0 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!combo || saving}
          className="px-4 py-1.5 rounded-lg text-xs font-medium
            bg-blue text-crust hover:bg-blue/90 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* ── Export / Import ──────────────────────────────────────────────── */}
      <div className="h-px bg-surface0 mt-1" />

      <div className="flex flex-col gap-2">
        <h2 className="text-text text-sm font-semibold">Data</h2>
        <p className="text-overlay0 text-[11px] leading-relaxed">
          Export or import your usage stats and settings to transfer between machines or as a backup.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium
              border border-surface1 bg-surface0/50 hover:bg-surface0
              text-text transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting…' : '📤 Export'}
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium
              border border-surface1 bg-surface0/50 hover:bg-surface0
              text-text transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing…' : '📥 Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
