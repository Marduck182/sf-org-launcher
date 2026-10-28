import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '../api'
import type { SfOrg } from '../../../shared/types'
import { OrgItem, ENV_LABEL, isProduction } from './OrgItem'
import { SettingsView } from './SettingsView'
import { SpecimenInput, SpecimenText, SpecimenTitle } from './Specimen'
import {
  EnterGlyph, IconBack, IconPencil, IconPlus, IconRefresh, IconSearch, IconSliders, IconTrash
} from './icons'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  orgs:         SfOrg[]
  loadState:    'loading' | 'ready' | 'error'
  error:        string
  isRefreshing: boolean
  onRefresh:    () => void
}

type View  = 'list' | 'add' | 'settings'
type Toast = { kind: 'ok' | 'err'; msg: string }

const LOGIN_URLS = {
  production: 'https://login.salesforce.com',
  sandbox:    'https://test.salesforce.com',
} as const

// ── Filter ────────────────────────────────────────────────────────────────────

function filterOrgs(orgs: SfOrg[], q: string): SfOrg[] {
  if (!q.trim()) return orgs
  const lower = q.toLowerCase()
  return orgs.filter(o =>
    (o.alias ?? '').toLowerCase().includes(lower)       ||
    (o.username ?? '').toLowerCase().includes(lower)    ||
    (o.instanceUrl ?? '').toLowerCase().includes(lower) ||
    (o.orgId ?? '').toLowerCase().includes(lower)
  )
}

function formatExpiry(date?: string): string | null {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return `Expires ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette({ orgs, loadState, error, isRefreshing, onRefresh }: Props) {
  const [query,         setQuery]         = useState('')
  const [selected,      setSelected]      = useState(0)
  const [view,          setView]          = useState<View>('list')
  const [toast,         setToast]         = useState<Toast | null>(null)
  const [openingId,     setOpeningId]     = useState<string | null>(null)
  const [openedId,      setOpenedId]      = useState<string | null>(null)
  const [copyingId,     setCopyingId]     = useState<string | null>(null)
  const [copiedId,      setCopiedId]      = useState<string | null>(null)
  const [renamingId,    setRenamingId]    = useState<string | null>(null)
  const [renameValue,   setRenameValue]   = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removingId,    setRemovingId]    = useState<string | null>(null)
  const [loggingIn,     setLoggingIn]     = useState<keyof typeof LOGIN_URLS | null>(null)
  const [progress,      setProgress]      = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  const visible = filterOrgs(orgs, query)
  const current = visible[selected] as SfOrg | undefined

  // ── Show / focus ────────────────────────────────────────────────────────────

  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  useEffect(() => {
    const remove = api.onWindowShow(() => {
      setQuery('')
      setSelected(0)
      setView('list')
      setRenamingId(null)
      setConfirmRemove(null)
      focusSearch()
    })
    setTimeout(() => inputRef.current?.focus(), 80)
    return remove
  }, [focusSearch])

  // Back to the list → search gets focus again; other views take keyboard focus on the panel
  useEffect(() => {
    if (view === 'list') focusSearch()
    else panelRef.current?.focus()
  }, [view, focusSearch])

  useEffect(() => { setSelected(0) }, [query])
  useEffect(() => { setConfirmRemove(null) }, [selected, query])
  useEffect(() => {
    if (selected >= visible.length && visible.length > 0) setSelected(visible.length - 1)
  }, [visible.length, selected])

  useEffect(() => {
    const items = listRef.current?.querySelectorAll<HTMLElement>('[data-org-item]')
    items?.[selected]?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  // Pixel progress bar while waiting for the browser login
  useEffect(() => {
    if (!loggingIn) { setProgress(0); return }
    const id = setInterval(() => setProgress(p => (p + 1) % 13), 380)
    return () => clearInterval(id)
  }, [loggingIn])

  // ── Toast ───────────────────────────────────────────────────────────────────

  const showToast = useCallback((kind: Toast['kind'], msg: string) => {
    clearTimeout(toastTimer.current)
    setToast({ kind, msg })
    toastTimer.current = setTimeout(() => setToast(null), 2_600)
  }, [])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const openOrg = useCallback(async (org: SfOrg) => {
    if (openingId) return
    setOpeningId(org.orgId)
    setOpenedId(null)
    const guard = setTimeout(() => {
      setOpeningId(null)
      showToast('err', 'Salesforce took too long to respond. Try again.')
    }, 15_000)

    try {
      await api.incrementUsage(org.orgId)
      const res = await api.openOrg(org.alias || org.username)
      if (!res.success) {
        showToast('err', res.error)
      } else {
        setOpenedId(org.orgId)
        setTimeout(() => {
          setOpenedId(null)
          api.hideWindow()
        }, 650)
      }
    } finally {
      clearTimeout(guard)
      setOpeningId(null)
    }
  }, [openingId, showToast])

  const copyLink = useCallback(async (org: SfOrg) => {
    setCopyingId(org.orgId)
    setCopiedId(null)
    const guard = setTimeout(() => {
      setCopyingId(null)
      showToast('err', 'Could not generate the login link in time. Try again.')
    }, 15_000)

    try {
      const res = await api.copyOrgLink(org.alias || org.username)
      if (!res.success) {
        showToast('err', res.error)
      } else {
        setCopiedId(org.orgId)
        showToast('ok', 'Login link copied · single use')
        setTimeout(() => setCopiedId(null), 2_500)
      }
    } finally {
      clearTimeout(guard)
      setCopyingId(null)
    }
  }, [showToast])

  const loginOrg = useCallback(async (env: keyof typeof LOGIN_URLS) => {
    if (loggingIn) return
    setLoggingIn(env)
    try {
      const res = await api.loginOrg(LOGIN_URLS[env])
      if (!res.success) {
        showToast('err', res.error)
      } else {
        showToast('ok', 'Org added')
        setView('list')
      }
    } finally {
      setLoggingIn(null)
    }
  }, [loggingIn, showToast])

  /** First press arms, second press removes — no accidental deletes. */
  const removeOrg = useCallback(async (org: SfOrg) => {
    if (confirmRemove !== org.orgId) {
      setConfirmRemove(org.orgId)
      return
    }
    setConfirmRemove(null)
    setRemovingId(org.orgId)
    try {
      const res = await api.removeOrg(org.username)
      if (!res.success) showToast('err', res.error)
      else showToast('ok', `${org.alias} removed from this computer`)
    } finally {
      setRemovingId(null)
      focusSearch()
    }
  }, [confirmRemove, showToast, focusSearch])

  const renameStart = useCallback((org: SfOrg) => {
    setConfirmRemove(null)
    setRenamingId(org.orgId)
    setRenameValue(org.alias)
  }, [])

  const renameCancel = useCallback(() => {
    setRenamingId(null)
    focusSearch()
  }, [focusSearch])

  const renameSubmit = useCallback(async () => {
    const org = orgs.find(o => o.orgId === renamingId)
    const next = renameValue.trim()
    if (!org || !next || next === org.alias) { renameCancel(); return }
    try {
      const res = await api.renameOrg(org.username, next)
      if (!res.success) showToast('err', res.error)
      else showToast('ok', `Renamed to ${next}`)
    } finally {
      renameCancel()
    }
  }, [orgs, renamingId, renameValue, showToast, renameCancel])

  const goTo = useCallback((v: View) => {
    setRenamingId(null)
    setConfirmRemove(null)
    setView(prev => (prev === v ? 'list' : v))
  }, [])

  // ── Keyboard ────────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey

    if (e.key === 'Escape') {
      e.preventDefault()
      if (confirmRemove) setConfirmRemove(null)
      else if (view !== 'list') setView('list')
      else api.hideWindow()
      return
    }
    if (ctrl && e.key.toLowerCase() === 'n') { e.preventDefault(); goTo('add'); return }
    if (ctrl && e.key === ',')               { e.preventDefault(); goTo('settings'); return }
    if (ctrl && e.key.toLowerCase() === 'r') { e.preventDefault(); onRefresh(); return }

    if (view === 'add') {
      if (e.key === '1') loginOrg('production')
      if (e.key === '2') loginOrg('sandbox')
      return
    }
    if (view !== 'list' || renamingId) return

    if (ctrl && /^[1-9]$/.test(e.key)) {
      e.preventDefault()
      const target = visible[Number(e.key) - 1]
      if (target) { setSelected(Number(e.key) - 1); openOrg(target) }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelected(i => Math.min(i + 1, visible.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelected(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (current && confirmRemove === current.orgId) removeOrg(current)
        else if (current) openOrg(current)
        break
    }
    if (!ctrl || !current) return
    switch (e.key.toLowerCase()) {
      case 'l': e.preventDefault(); copyLink(current);    break
      case 'd': e.preventDefault(); removeOrg(current);   break
      case 'e': e.preventDefault(); renameStart(current); break
    }
  }, [view, renamingId, confirmRemove, visible, current, goTo, onRefresh, loginOrg, openOrg, copyLink, removeOrg, renameStart])

  // ── Pieces ──────────────────────────────────────────────────────────────────

  const searchBar = (
    <div className="bar">
      {view === 'list'
        ? <>
            <IconSearch />
            <input
              ref={inputRef}
              className="search-input"
              type="text"
              placeholder="Search orgs by alias, user or URL"
              value={query}
              onChange={e => setQuery(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-label="Search orgs"
            />
          </>
        : <>
            <button type="button" className="ic" onClick={() => setView('list')} title="Back (Esc)" aria-label="Back to orgs">
              <IconBack />
            </button>
            <span style={{ flex: 1 }} />
          </>}
      <button type="button" className="ic" onClick={onRefresh} disabled={isRefreshing} title="Refresh orgs (Ctrl R)" aria-label="Refresh orgs">
        <IconRefresh spinning={isRefreshing} />
      </button>
      <button type="button" className={`ic${view === 'add' ? ' on' : ''}`} onClick={() => goTo('add')} title="Add org (Ctrl N)" aria-label="Add org">
        <IconPlus />
      </button>
      <button type="button" className={`ic${view === 'settings' ? ' on' : ''}`} onClick={() => goTo('settings')} title="Settings (Ctrl ,)" aria-label="Settings">
        <IconSliders />
      </button>
    </div>
  )

  const specimen = current && (
    <div className="spec">
      {renamingId === current.orgId
        ? <SpecimenInput value={renameValue} onChange={setRenameValue} onSubmit={renameSubmit} onCancel={renameCancel} />
        : <SpecimenTitle key={current.orgId} text={current.alias} orgType={current.orgType} />}

      <div className="sub">
        <span className={`ribbon b-${current.orgType}`}>{ENV_LABEL[current.orgType]}</span>
        {current.isDefaultUsername && <span className="tag">DEFAULT</span>}
        <span className="user">{current.username}</span>
        {formatExpiry(current.expirationDate) && <span>{formatExpiry(current.expirationDate)}</span>}
        {current.usageCount > 0 && <span>×{current.usageCount}</span>}
      </div>

      <div className="actions">
        {renamingId === current.orgId ? (
          <>
            <button type="button" className="k p" onClick={renameSubmit}>Save alias <span className="hint"><EnterGlyph /></span></button>
            <button type="button" className="k" onClick={renameCancel}>Cancel <span className="hint">Esc</span></button>
          </>
        ) : confirmRemove === current.orgId ? (
          <>
            <button type="button" className="k danger" onClick={() => removeOrg(current)}>Remove {current.alias} <span className="hint"><EnterGlyph /></span></button>
            <button type="button" className="k" onClick={() => setConfirmRemove(null)}>Keep it <span className="hint">Esc</span></button>
            <span className="spacer" />
            <span style={{ color: 'var(--ink-2)', fontSize: 12 }}>Only removes the login from this computer</span>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`k ${isProduction(current.orgType) ? 'danger' : 'p'}`}
              onClick={() => openOrg(current)}
              disabled={!!openingId}
            >
              {openingId === current.orgId ? 'Opening…'
                : openedId === current.orgId ? 'Opened'
                : isProduction(current.orgType) ? 'Open production' : 'Open'}
              <span className="hint"><EnterGlyph /></span>
            </button>
            <button type="button" className="k" onClick={() => copyLink(current)} disabled={copyingId === current.orgId}>
              {copyingId === current.orgId ? 'Copying…' : copiedId === current.orgId ? 'Copied' : 'Copy link'}
              <span className="hint">Ctrl L</span>
            </button>
            <span className="spacer" />
            <button type="button" className="k icon" onClick={() => renameStart(current)} title="Rename alias (Ctrl E)" aria-label="Rename alias">
              <IconPencil />
            </button>
            <button type="button" className="k icon" onClick={() => removeOrg(current)} title="Remove from this computer (Ctrl D)" aria-label="Remove org">
              <IconTrash />
            </button>
          </>
        )}
      </div>
    </div>
  )

  const listView = (() => {
    if (loadState === 'loading') return (
      <div className="state">
        <h1 className="hl">LOADING</h1>
        <div className="skeleton"><i /><i /><i /></div>
        <p>Reading your orgs from ~/.sfdx…</p>
      </div>
    )
    if (loadState === 'error') return (
      <div className="state">
        <h1 className="hl t-production">CAN'T LOAD</h1>
        <p>{error}</p>
        <button type="button" className="k" onClick={onRefresh}>Try again <span className="hint">Ctrl R</span></button>
      </div>
    )
    if (visible.length === 0) return query ? (
      <div className="state">
        <h1 className="hl">NO MATCH</h1>
        <p>No org matches “{query}”. Search looks at alias, username, URL and org ID.</p>
      </div>
    ) : (
      <div className="state">
        <h1 className="hl">NO ORGS</h1>
        <p>There are no Salesforce logins on this computer yet. Add your first org with your Salesforce username.</p>
        <button type="button" className="k p" onClick={() => setView('add')}>Add org <span className="hint">Ctrl N</span></button>
      </div>
    )
    return (
      <>
        {specimen}
        <div ref={listRef} className="list dim" role="listbox" aria-label="Orgs">
          {visible.map((org, idx) => (
            <OrgItem
              key={`${org.orgId}-${org.username}`}
              org={org}
              index={idx}
              isSelected={idx === selected}
              isBusy={removingId === org.orgId}
              onOpen={() => openOrg(org)}
              onHover={() => { if (idx !== selected) setSelected(idx) }}
            />
          ))}
        </div>
      </>
    )
  })()

  const addView = (
    <>
      <div className="spec">
        <SpecimenText>ADD ORG</SpecimenText>
        <div className="sub">Your browser opens the Salesforce login. Come back here when you're done.</div>
      </div>
      <div className="view">
        {(['production', 'sandbox'] as const).map((env, i) => (
          <button
            key={env}
            type="button"
            className={`choice${loggingIn === env ? ' sel' : ''}`}
            onClick={() => loginOrg(env)}
            disabled={!!loggingIn}
          >
            <span className="t">{env === 'production' ? 'PRODUCTION' : 'SANDBOX'}</span>
            <span className="kk"><span className="k">{i + 1}</span></span>
            <span className="d">
              <span className={`ribbon b-${env}`}>{env === 'production' ? 'PROD' : 'SBX'}</span>
              {env === 'production' ? 'login.salesforce.com · also Developer Edition' : 'test.salesforce.com'}
              {loggingIn === env && ' · waiting for the browser…'}
            </span>
            {loggingIn === env && (
              <span className="progress" aria-hidden>
                {Array.from({ length: 12 }, (_, j) => <i key={j} className={j < progress ? 'on' : ''} />)}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )

  const footer = view === 'list' ? (
    <div className="foot">
      <span><kbd><EnterGlyph /></kbd>Open</span>
      <span><kbd>Ctrl 1-9</kbd>Jump</span>
      <span><kbd>Ctrl L</kbd>Link</span>
      <span><kbd>Ctrl E</kbd>Rename</span>
      <span><kbd>Ctrl D</kbd>Remove</span>
      <span className="n">{visible.length} org{visible.length === 1 ? '' : 's'}</span>
    </div>
  ) : view === 'add' ? (
    <div className="foot">
      <span><kbd>1</kbd>Production</span>
      <span><kbd>2</kbd>Sandbox</span>
      <span><kbd>Esc</kbd>Back</span>
      <span className="n">Login waits up to 5 min</span>
    </div>
  ) : (
    <div className="foot">
      <span><kbd>Esc</kbd>Back</span>
      <span className="n">SF Org Launcher</span>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={panelRef} className="panel" tabIndex={-1} onKeyDown={handleKeyDown} style={{ outline: 'none' }}>
      {searchBar}
      {view === 'list' && listView}
      {view === 'add' && addView}
      {view === 'settings' && <SettingsView orgCount={orgs.length} onClose={() => setView('list')} />}
      {footer}
      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.msg}</div>}
    </div>
  )
}
