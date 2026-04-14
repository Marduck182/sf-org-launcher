import { useEffect, useRef, useState, useCallback } from 'react'
import type { SfOrg } from '../../../shared/types'
import { OrgItem } from './OrgItem'

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="text-overlay0 shrink-0"
    >
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}

function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={spinning ? 'animate-spin' : ''}
    >
      <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
      <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
    </svg>
  )
}

function IconCloud() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="text-red shrink-0 mt-0.5"
    >
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

// ── Key-hint chip ──────────────────────────────────────────────────────────────

function KeyChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded
      border border-surface1 bg-surface0 text-overlay1 text-[10px] font-mono leading-none">
      {label}
    </span>
  )
}

function KeyHint({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <span className="flex items-center gap-1 text-overlay0 text-[11px]">
      {keys.map(k => <KeyChip key={k} label={k} />)}
      <span className="ml-0.5">{desc}</span>
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  orgs:         SfOrg[]
  loadState:    'loading' | 'ready' | 'error'
  error:        string
  isRefreshing: boolean
  onRefresh:    () => void
}

// ── Fuzzy filter ──────────────────────────────────────────────────────────────

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

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast { kind: 'ok' | 'err'; msg: string }

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette({ orgs, loadState, error, isRefreshing, onRefresh }: Props) {
  const [query,        setQuery]        = useState('')
  const [selected,     setSelected]     = useState(0)
  const [toast,        setToast]        = useState<Toast | null>(null)
  const [loadingOrgId, setLoadingOrgId] = useState<string | null>(null)
  const [openedOrgId,  setOpenedOrgId]  = useState<string | null>(null)
  const [copyingOrgId, setCopyingOrgId] = useState<string | null>(null)
  const [copiedOrgId,  setCopiedOrgId]  = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  // ── Focus on show ───────────────────────────────────────────────────────────

  useEffect(() => {
    const remove = window.electronAPI.onWindowShow(() => {
      setQuery('')
      setSelected(0)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    })
    // Also focus on first render
    setTimeout(() => inputRef.current?.focus(), 80)
    return remove
  }, [])

  // ── Derived state ───────────────────────────────────────────────────────────

  const visible = filterOrgs(orgs, query)

  // Reset selection on query change
  useEffect(() => setSelected(0), [query])

  // Scroll selected item into view
  useEffect(() => {
    const items = listRef.current?.querySelectorAll<HTMLElement>('[data-org-item]')
    items?.[selected]?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  // ── Toast helper ────────────────────────────────────────────────────────────

  const showToast = useCallback((kind: Toast['kind'], msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 2_500)
  }, [])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const openOrg = useCallback(async (org: SfOrg) => {
    setLoadingOrgId(org.orgId)
    setOpenedOrgId(null)

    const guard = setTimeout(() => {
      setLoadingOrgId(null)
      showToast('err', 'Timed out — the CLI took too long to respond')
    }, 15_000)

    try {
      await window.electronAPI.incrementUsage(org.orgId)
      const res = await window.electronAPI.openOrg(org.alias || org.username)
      if (!res.success) {
        showToast('err', res.error)
      } else {
        // Mostrar palomita brevemente antes de cerrar
        setOpenedOrgId(org.orgId)
        setTimeout(() => {
          setOpenedOrgId(null)
          window.electronAPI.hideWindow()
        }, 800)
      }
    } finally {
      clearTimeout(guard)
      setLoadingOrgId(null)
    }
  }, [showToast])

  const copyLink = useCallback(async (org: SfOrg) => {
    setCopyingOrgId(org.orgId)
    setCopiedOrgId(null)

    const guard = setTimeout(() => {
      setCopyingOrgId(null)
      showToast('err', 'Timed out — could not generate login URL')
    }, 15_000)

    try {
      const res = await window.electronAPI.copyOrgLink(org.alias || org.username)
      if (!res.success) {
        showToast('err', res.error)
      } else {
        setCopiedOrgId(org.orgId)
        showToast('ok', 'Login URL copied to clipboard')
        setTimeout(() => setCopiedOrgId(null), 2_500)
      }
    } finally {
      clearTimeout(guard)
      setCopyingOrgId(null)
    }
  }, [showToast])

  // ── Keyboard navigation ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
        if (visible[selected]) openOrg(visible[selected])
        break
      case 'l':
      case 'L':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          if (visible[selected]) copyLink(visible[selected])
        }
        break
      case 'r':
      case 'R':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onRefresh()
        }
        break
      case 'Escape':
        window.electronAPI.hideWindow()
        break
    }
  }, [visible, selected, openOrg, copyLink, onRefresh])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="animate-fade-in w-[620px] flex flex-col rounded-2xl overflow-hidden
        border border-surface0 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      style={{ background: 'rgba(30,30,46,0.97)', backdropFilter: 'blur(24px)' }}
      onKeyDown={handleKeyDown}
    >
      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <IconSearch />
        <input
          ref={inputRef}
          className="search-input flex-1"
          type="text"
          placeholder="Search Salesforce orgs…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh orgs (Ctrl+R)"
          className="text-overlay0 hover:text-blue transition-colors p-1 rounded
            hover:bg-surface0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <IconRefresh spinning={isRefreshing} />
        </button>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="h-px bg-surface0" />

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div
        ref={listRef}
        className="overflow-y-auto"
        style={{ maxHeight: 380 }}
      >

        {/* Loading skeleton */}
        {loadState === 'loading' && (
          <div className="flex flex-col gap-1 p-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-surface0 animate-pulse shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="h-3 rounded bg-surface0 animate-pulse w-32" />
                  <div className="h-2.5 rounded bg-surface0 animate-pulse w-48 opacity-60" />
                </div>
              </div>
            ))}
            <p className="text-center text-overlay0 text-[11px] pb-2 pt-1">
              Cargando orgs… esto puede tardar hasta un minuto
            </p>
          </div>
        )}

        {/* Error state */}
        {loadState === 'error' && (
          <div className="flex items-start gap-3 px-5 py-6 text-sm">
            <IconAlert />
            <div>
              <p className="text-red font-medium mb-1">Could not load orgs</p>
              <p className="text-subtext0 leading-relaxed whitespace-pre-wrap text-xs">{error}</p>
              <button
                onClick={onRefresh}
                className="mt-3 text-blue text-xs hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {loadState === 'ready' && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-overlay0">
            <IconCloud />
            <p className="mt-3 text-sm">
              {query ? `No orgs match "${query}"` : 'No Salesforce orgs found'}
            </p>
            {!query && (
              <p className="text-xs mt-1 text-overlay0/60">
                Authenticate with <code className="font-mono">sf org login web</code>
              </p>
            )}
          </div>
        )}

        {/* Org list */}
        {loadState === 'ready' && visible.length > 0 && (
          <div className="flex flex-col gap-0.5 p-1.5">
            {visible.map((org, idx) => (
              <OrgItem
                key={`${org.orgId}-${org.username}`}
                org={org}
                isSelected={idx === selected}
                isLoading={loadingOrgId === org.orgId}
                isOpened={openedOrgId === org.orgId}
                isCopying={copyingOrgId === org.orgId}
                isCopied={copiedOrgId === org.orgId}
                onOpen={() => openOrg(org)}
                onCopyLink={() => copyLink(org)}
                onHover={() => setSelected(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {loadState === 'ready' && visible.length > 0 && (
        <>
          <div className="h-px bg-surface0" />
          <div className="flex items-center gap-4 flex-wrap px-4 py-2">
            <KeyHint keys={['↑', '↓']}        desc="Navigate" />
            <KeyHint keys={['↵']}              desc="Open" />
            <KeyHint keys={['Ctrl', 'L']}      desc="Copy link" />
            <KeyHint keys={['Ctrl', 'R']}      desc="Refresh" />
            <KeyHint keys={['Esc']}            desc="Close" />
            <span className="ml-auto text-[11px] text-overlay0/50">
              {visible.length} org{visible.length !== 1 ? 's' : ''}
            </span>
          </div>
        </>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`absolute bottom-14 left-1/2 -translate-x-1/2 animate-slide-up
            px-4 py-2 rounded-xl text-sm font-medium shadow-lg border
            ${toast.kind === 'ok'
              ? 'bg-green/15 border-green/30 text-green'
              : 'bg-red/15 border-red/30 text-red'
            }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
