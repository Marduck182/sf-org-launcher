import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { PixelIcon } from './icons'
import { SpecimenText } from './Specimen'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map browser KeyboardEvent.key → Electron-style accelerator token (the backend converts it). */
function keyToAccelerator(key: string): string | null {
  const map: Record<string, string> = {
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

/** "CommandOrControl+Shift+S" → ['CTRL', 'SHIFT', 'S'] */
function keycaps(accel: string): string[] {
  return accel.split('+').map(k => (k === 'CommandOrControl' ? 'Ctrl' : k).toUpperCase())
}

function Keycaps({ accel, recording }: { accel: string; recording?: boolean }) {
  const caps = keycaps(accel)
  return (
    <>
      {caps.map((c, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <span className="plus">+</span>}
          <span className={`cap${recording ? ' rec' : ''}`}>{c}</span>
        </span>
      ))}
    </>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsView({ orgCount, onClose }: { orgCount: number; onClose: () => void }) {
  const [current,    setCurrent]    = useState('')
  const [recording,  setRecording]  = useState(false)
  const [combo,      setCombo]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [exporting,  setExporting]  = useState(false)
  const [importing,  setImporting]  = useState(false)
  const [iconStatus, setIconStatus] = useState<'idle' | 'setting' | 'done'>('idle')
  const [customIcon, setCustomIcon] = useState(false)
  const recorderRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    api.getHotkey().then(res => { if (res.success) setCurrent(res.data) })
    api.getTrayIcon().then(res => { if (res.success) setCustomIcon(!!res.data) })
  }, [])

  const handleRecordKey = useCallback((e: React.KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') { setRecording(false); setCombo(''); return }
    if (MODIFIER_KEYS.has(e.key)) return

    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
    if (e.shiftKey)             parts.push('Shift')
    if (e.altKey)               parts.push('Alt')

    const mainKey = keyToAccelerator(e.key)
    if (!mainKey) return
    if (parts.length === 0) {
      setError('Use at least one modifier: Ctrl, Shift or Alt.')
      return
    }

    parts.push(mainKey)
    setCombo(parts.join('+'))
    setRecording(false)
    setError('')
  }, [recording])

  const startRecording = useCallback(() => {
    setRecording(true)
    setCombo('')
    setError('')
    requestAnimationFrame(() => recorderRef.current?.focus())
  }, [])

  const save = useCallback(async () => {
    if (!combo) return
    setSaving(true)
    setError('')
    const res = await api.setHotkey(combo)
    setSaving(false)
    if (res.success) {
      setCurrent(combo)
      setCombo('')
    } else {
      setError(res.error)
    }
  }, [combo])

  const handleExport = useCallback(async () => {
    setExporting(true)
    setError('')
    const res = await api.exportData()
    setExporting(false)
    if (!res.success && res.error !== 'Cancelled') setError(res.error)
  }, [])

  const handleImport = useCallback(async () => {
    setImporting(true)
    setError('')
    const res = await api.importData()
    setImporting(false)
    if (res.success) {
      const hk = await api.getHotkey()
      if (hk.success) setCurrent(hk.data)
      onClose()
    } else if (res.error !== 'Cancelled') {
      setError(res.error)
    }
  }, [onClose])

  const handleSetIcon = useCallback(async () => {
    setIconStatus('setting')
    const res = await api.setTrayIcon()
    if (res.success) {
      setCustomIcon(true)
      setIconStatus('done')
      setTimeout(() => setIconStatus('idle'), 2000)
    } else {
      setIconStatus('idle')
      if (res.error !== 'Cancelled') setError(res.error)
    }
  }, [])

  const handleResetIcon = useCallback(async () => {
    await api.resetTrayIcon()
    setCustomIcon(false)
    setIconStatus('idle')
  }, [])

  const shown = combo || current || 'CommandOrControl+Shift+S'

  return (
    <>
    {/* The setting that matters most, set at specimen scale */}
    <div className="spec">
      <SpecimenText>{keycaps(shown).join('+')}</SpecimenText>
      <div className="sub">
        {combo ? 'New hotkey · press Save to apply' : 'Global hotkey · opens this palette from any app'}
      </div>
    </div>
    <div className="view" style={{ gap: 0 }}>
      <div className="set">
        <span className="lbl">HOTKEY</span>
        <span className="val">
          <button
            ref={recorderRef}
            type="button"
            onKeyDown={handleRecordKey}
            onBlur={() => setRecording(false)}
            onClick={startRecording}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            aria-label="Record a new global hotkey"
          >
            {recording
              ? <span className="cap rec">PRESS KEYS…</span>
              : <Keycaps accel={shown} recording={!!combo} />}
          </button>
          <span className="end">
            {combo
              ? <>
                  <button type="button" className="k p" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="k" onClick={() => setCombo('')}>Cancel</button>
                </>
              : <button type="button" className="k" onClick={startRecording}>{recording ? 'Listening…' : 'Record new'}</button>}
          </span>
        </span>
      </div>

      <div className="set">
        <span className="lbl">DATA</span>
        <span className="val">
          Usage counts and hotkey, as JSON
          <span className="end">
            <button type="button" className="k" onClick={handleExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export'}</button>
            <button type="button" className="k" onClick={handleImport} disabled={importing}>{importing ? 'Importing…' : 'Import'}</button>
          </span>
        </span>
      </div>

      <div className="set">
        <span className="lbl">TRAY ICON</span>
        <span className="val">
          <PixelIcon size={16} />
          {customIcon ? 'Custom image' : 'Pixel Enter (default)'}
          <span className="end">
            <button type="button" className="k" onClick={handleSetIcon} disabled={iconStatus === 'setting'}>
              {iconStatus === 'setting' ? 'Choosing…' : iconStatus === 'done' ? 'Changed' : 'Change'}
            </button>
            <button type="button" className="k" onClick={handleResetIcon}>Reset</button>
          </span>
        </span>
      </div>

      <div className="set">
        <span className="lbl">ORGS</span>
        <span className="val">{orgCount} org{orgCount === 1 ? '' : 's'} in ~/.sfdx · works without the sf CLI</span>
      </div>

      {error && <p className="err-text" role="alert" style={{ margin: '8px 0 0' }}>{error}</p>}
    </div>
    </>
  )
}
