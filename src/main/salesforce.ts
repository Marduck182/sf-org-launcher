import { AuthInfo, Org, StateAggregator, WebOAuthServer } from '@salesforce/core'
import { shell } from 'electron'
import type { SfOrg, OrgType } from '../shared/types'
import type { Store } from './store'

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveOrgType(auth: { isDevHub?: boolean; isScratchOrg?: boolean; isSandbox?: boolean }): OrgType {
  if (auth.isDevHub) return 'devhub'
  if (auth.isScratchOrg) return 'scratch'
  if (auth.isSandbox) return 'sandbox'
  return 'production'
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SalesforceService {
  private cached: SfOrg[] | null = null

  constructor(private readonly store: Store) {}

  // ── Public API ────────────────────────────────────────────────────────────

  async listOrgs(forceRefresh = false): Promise<SfOrg[]> {
    if (this.cached && !forceRefresh) return this.withUsage(this.cached)

    const auths = await AuthInfo.listAllAuthorizations()
    const orgs: SfOrg[] = []
    const seen = new Set<string>()

    for (const a of auths) {
      if (!a.orgId || seen.has(a.orgId)) continue
      if (a.error || a.isExpired === true) continue
      seen.add(a.orgId)

      // Try to read expiration date for scratch orgs
      let expirationDate: string | undefined
      if (a.isScratchOrg) {
        try {
          const info = await AuthInfo.create({ username: a.username })
          expirationDate = info.getFields().expirationDate
        } catch { /* best effort */ }
      }

      orgs.push({
        alias:                   a.aliases?.[0] ?? a.username,
        username:                a.username,
        orgId:                   a.orgId,
        instanceUrl:             a.instanceUrl ?? '',
        connectedStatus:         'Connected',
        isDefaultUsername:        a.configs?.includes('target-org') ?? false,
        isDefaultDevHubUsername:  a.configs?.includes('target-dev-hub') ?? false,
        orgType:                 resolveOrgType(a),
        expirationDate,
        usageCount:              0,
      })
    }

    this.cached = orgs
    return this.withUsage(this.cached)
  }

  async getLoginUrl(identifier: string): Promise<string> {
    const org = await Org.create({ aliasOrUsername: identifier })
    await org.refreshAuth()
    const conn = org.getConnection()

    if (!conn.accessToken || !conn.instanceUrl) {
      throw new Error('Could not generate login URL — authentication may have expired')
    }

    return `${conn.instanceUrl}/secur/frontdoor.jsp?sid=${encodeURIComponent(conn.accessToken)}`
  }

  async openOrg(identifier: string): Promise<void> {
    const url = await this.getLoginUrl(identifier)
    await shell.openExternal(url)
  }

  getOpenCommand(identifier: string): string {
    return `sf org open --target-org "${identifier}"`
  }

  async loginOrg(loginUrl: string): Promise<void> {
    const oauthServer = await WebOAuthServer.create({ oauthConfig: { loginUrl } })
    await oauthServer.start()
    const authUrl = oauthServer.getAuthorizationUrl()
    await shell.openExternal(authUrl)
    await oauthServer.authorizeAndSave()
    this.cached = null
  }

  async removeOrg(username: string): Promise<void> {
    const sa = await StateAggregator.getInstance()
    // Remove aliases pointing to this username
    const aliases = sa.aliases.getAll(username)
    if (aliases.length > 0) {
      await sa.aliases.unsetValuesAndSave(aliases)
    }
    // Remove the auth file
    await sa.orgs.remove(username)
    this.cached = null
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private withUsage(orgs: SfOrg[]): SfOrg[] {
    const usage = this.store.getUsage()
    return orgs
      .map(org => ({
        ...org,
        usageCount: usage[org.orgId]?.count  ?? 0,
        lastUsedAt: usage[org.orgId]?.lastUsed,
      }))
      .sort((a, b) =>
        b.usageCount - a.usageCount || a.alias.localeCompare(b.alias)
      )
  }
}
