import type { SfOrg, OrgType } from '../../../shared/types'

/** Dev Hubs live in production orgs, so they get the same warning treatment. */
export const isProduction = (t: OrgType) => t === 'production' || t === 'devhub'

export const ENV_LABEL: Record<OrgType, string> = {
  production: 'PRODUCTION',
  sandbox:    'SANDBOX',
  scratch:    'SCRATCH',
  devhub:     'PROD · DEV HUB',
  unknown:    'ORG',
}

const ENV_CODE: Record<OrgType, string> = {
  production: 'PROD',
  sandbox:    'SBX',
  scratch:    'SCR',
  devhub:     'HUB',
  unknown:    '?',
}

interface Props {
  org:        SfOrg
  index:      number
  isSelected: boolean
  isBusy:     boolean
  onOpen:     () => void
  onHover:    () => void
}

/** One list row. Every row has the same structure; only text and environment code change. */
export function OrgItem({ org, index, isSelected, isBusy, onOpen, onHover }: Props) {
  return (
    <button
      type="button"
      data-org-item
      className={`row${isSelected ? ' sel' : ''}${isSelected && isProduction(org.orgType) ? ' prod' : ''}${isBusy ? ' busy' : ''}`}
      onClick={onOpen}
      onMouseMove={onHover}
      tabIndex={-1}
      title={org.username}
    >
      <span className="n">{index < 9 ? index + 1 : ''}</span>
      <span className="a">{org.alias}</span>
      <span className={`c t-${org.orgType}`}>{ENV_CODE[org.orgType]}</span>
      <span className="u">{org.usageCount > 0 ? `×${org.usageCount}` : ''}</span>
    </button>
  )
}
