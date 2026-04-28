import type { SfOrg, OrgType } from '../../../shared/types'

// ── Type badge config ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<OrgType, { label: string; bg: string; text: string; border: string }> = {
  production: { label: 'PROD',    bg: 'bg-red/10',    text: 'text-red',    border: 'border-red/25'    },
  sandbox:    { label: 'SANDBOX', bg: 'bg-yellow/10', text: 'text-yellow', border: 'border-yellow/25' },
  scratch:    { label: 'SCRATCH', bg: 'bg-sky/10',    text: 'text-sky',    border: 'border-sky/25'    },
  devhub:     { label: 'DEVHUB',  bg: 'bg-mauve/10',  text: 'text-mauve',  border: 'border-mauve/25'  },
  unknown:    { label: '?',       bg: 'bg-surface0',  text: 'text-overlay0', border: 'border-surface1' }
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const isConnected    = status === 'Connected'
  const isDisconnected = status === 'Disconnected' || status.includes('Error')

  const color = isConnected    ? 'bg-green'
              : isDisconnected ? 'bg-red'
              : 'bg-overlay0'

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${color}`}
      title={status}
    />
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconOpen({ spinning, opened }: { spinning: boolean; opened: boolean }) {
  if (spinning) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="animate-spin"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    )
  }
  if (opened) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="text-green"
      >
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

function IconCopy({ copying, copied }: { copying: boolean; copied: boolean }) {
  if (copying) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="animate-spin"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    )
  }
  if (copied) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="text-green"
      >
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function IconTerminal({ copying, copied }: { copying: boolean; copied: boolean }) {
  if (copying) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="animate-spin"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    )
  }
  if (copied) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="text-green"
      >
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5"/>
      <line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24"
      fill="currentColor" className="text-yellow"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02
        12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  org:          SfOrg
  isSelected:   boolean
  isLoading:    boolean
  isOpened:     boolean
  isCopying:    boolean
  isCopied:     boolean
  isCopyingCmd: boolean
  isCopiedCmd:  boolean
  isRemoving:   boolean
  onOpen:       () => void
  onCopyLink:   () => void
  onCopyCmd:    () => void
  onRemove:     () => void
  onHover:      () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrgItem({
  org, isSelected, isLoading, isOpened, isCopying, isCopied,
  isCopyingCmd, isCopiedCmd, isRemoving, onOpen, onCopyLink, onCopyCmd, onRemove, onHover
}: Props) {
  const cfg = TYPE_CONFIG[org.orgType] ?? TYPE_CONFIG.unknown

  return (
    <div
      data-org-item
      onMouseEnter={onHover}
      onClick={onOpen}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
        transition-colors duration-75
        ${isSelected ? 'bg-surface0' : 'hover:bg-surface0/60'}
      `}
    >
      {/* ── Left: type badge ─────────────────────────────────────────────── */}
      <div className={`
        shrink-0 flex items-center justify-center
        w-9 h-9 rounded-lg border text-[9px] font-bold tracking-wider
        ${cfg.bg} ${cfg.text} ${cfg.border}
      `}>
        {cfg.label}
      </div>

      {/* ── Centre: org info ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Row 1: alias + badges */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-text text-sm font-medium truncate leading-snug">
            {org.alias}
          </span>

          {org.isDefaultUsername && (
            <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-semibold
              text-blue bg-blue/10 border border-blue/25 px-1.5 py-0.5 rounded-full leading-none">
              DEFAULT
            </span>
          )}

          {org.usageCount > 0 && (
            <span className="shrink-0 flex items-center gap-0.5 text-[9px] text-yellow leading-none">
              <IconStar />
              {org.usageCount}
            </span>
          )}
        </div>

        {/* Row 2: username + status dot */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <StatusDot status={org.connectedStatus} />
          <span className="text-subtext0 text-xs truncate leading-snug">
            {org.username}
          </span>
        </div>

        {/* Row 3: instance URL */}
        <p className="text-overlay0 text-[11px] truncate leading-snug mt-0.5">
          {org.instanceUrl}
        </p>
      </div>

      {/* ── Right: action buttons ────────────────────────────────────────── */}
      <div className={`
        flex items-center gap-1 shrink-0
        transition-opacity duration-100
        ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
      `}>
        {/* Remove org */}
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          title="Remove org (Ctrl+D)"
          disabled={isRemoving}
          className={`p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed
            text-overlay0 hover:text-red hover:bg-red/10
            ${isRemoving ? 'animate-spin' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>

        {/* Copy CLI command */}
        <button
          onClick={e => { e.stopPropagation(); onCopyCmd() }}
          title="Copy CLI command (Ctrl+K)"
          disabled={isCopyingCmd}
          className={`p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed
            ${isCopiedCmd
              ? 'text-green bg-green/10'
              : isCopyingCmd
                ? 'text-overlay0'
                : 'text-overlay0 hover:text-text hover:bg-surface1'
            }`}
        >
          <IconTerminal copying={isCopyingCmd} copied={isCopiedCmd} />
        </button>

        {/* Copy link */}
        <button
          onClick={e => { e.stopPropagation(); onCopyLink() }}
          title="Copy login URL (Ctrl+L)"
          disabled={isCopying}
          className={`p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed
            ${isCopied
              ? 'text-green bg-green/10'
              : isCopying
                ? 'text-overlay0'
                : 'text-overlay0 hover:text-text hover:bg-surface1'
            }`}
        >
          <IconCopy copying={isCopying} copied={isCopied} />
        </button>

        {/* Open */}
        <button
          onClick={e => { e.stopPropagation(); onOpen() }}
          title="Open in browser (↵)"
          disabled={isLoading || isOpened}
          className={`p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed
            ${isOpened
              ? 'text-green bg-green/10'
              : isLoading
                ? 'text-blue bg-blue/10'
                : 'text-overlay0 hover:text-blue hover:bg-blue/10'
            }`}
        >
          <IconOpen spinning={isLoading} opened={isOpened} />
        </button>
      </div>

      {/* Expiry warning for scratch orgs */}
      {org.expirationDate && (
        <div className="absolute top-1 right-1">
          <span className="text-[9px] text-peach/70 font-mono">
            exp {org.expirationDate}
          </span>
        </div>
      )}
    </div>
  )
}
