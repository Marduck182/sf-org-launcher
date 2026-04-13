import { spawn } from 'child_process'
import { shell } from 'electron'
import type { SfOrg, OrgType } from '../shared/types'
import type { Store } from './store'

/**
 * Environment passed to every CLI call.
 * Suppresses the Node.js plugin-missing warnings that SF CLI dev-installs emit.
 */
const CLI_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_NO_WARNINGS: '1',
  NODE_OPTIONS: '--no-warnings',
}

/**
 * Run a shell command and return the combined stdout+stderr output,
 * regardless of the exit code.  Using spawn (not exec) so we always
 * receive output even when the process exits non-zero.
 */
function runCmd(cmd: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { shell: true, env: CLI_ENV })
    let out = ''
    let timer: ReturnType<typeof setTimeout>

    child.stdout.on('data', (d: Buffer) => { out += d.toString() })
    child.stderr.on('data', (d: Buffer) => { out += d.toString() })

    child.on('close', () => {
      clearTimeout(timer)
      resolve(out)
    })

    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })

    timer = setTimeout(() => {
      child.kill()
      reject(new Error(`CLI timed out after ${timeoutMs / 1_000}s`))
    }, timeoutMs)
  })
}

/**
 * SF CLI always emits {"status": N, "result": ...}.
 * We search for that exact prefix to skip any » warning lines or
 * Node.js error messages that happen to contain bare '{' characters.
 */
function extractJson(raw: string): unknown {
  // Primary: SF CLI JSON marker
  for (const marker of ['{"status":', '{ "status":']) {
    const idx = raw.indexOf(marker)
    if (idx !== -1) {
      return JSON.parse(raw.slice(idx))
    }
  }
  // Fallback for sfdx which may use a slightly different root key
  const fallback = raw.lastIndexOf('\n{')
  if (fallback !== -1) return JSON.parse(raw.slice(fallback + 1))

  throw new Error(
    'Could not find JSON in CLI output.\n\n' +
    'First 500 chars of output:\n' +
    raw.slice(0, 500)
  )
}

// ── Raw shapes returned by the CLI ───────────────────────────────────────────

interface CliOrg {
  alias?:                  string
  username:                string
  orgId:                   string
  instanceUrl:             string
  connectedStatus?:        string
  isDefaultUsername?:      boolean
  isDefaultDevHubUsername?:boolean
  expirationDate?:         string
}

interface OrgListResult {
  nonScratchOrgs?: CliOrg[]
  scratchOrgs?:    CliOrg[]
  sandboxes?:      CliOrg[]
}

// ── Business rules ────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set(['Connected'])

function isExpired(org: CliOrg): boolean {
  if (!org.expirationDate) return false
  return new Date(org.expirationDate) < new Date()
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SalesforceService {
  private cached:      SfOrg[] | null = null
  private cliCommand:  string  = 'sf'
  private cliDetected: boolean = false

  constructor(private readonly store: Store) {}

  // ── CLI detection (runs once per session) ─────────────────────────────────

  private async detectCli(): Promise<void> {
    if (this.cliDetected) return

    for (const cmd of ['sf', 'sfdx']) {
      try {
        const out = await runCmd(`${cmd} --version`, 5_000)
        if (out.trim()) {
          this.cliCommand  = cmd
          this.cliDetected = true
          return
        }
      } catch {
        // Try next
      }
    }
    throw new Error(
      'Salesforce CLI not found.\n' +
      'Install it from https://developer.salesforce.com/tools/salesforcecli'
    )
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async listOrgs(forceRefresh = false): Promise<SfOrg[]> {
    if (this.cached && !forceRefresh) return this.withUsage(this.cached)

    await this.detectCli()

    const cmd = this.cliCommand === 'sf'
      ? 'sf org list --json'
      : 'sfdx force:org:list --json'

    const raw    = await runCmd(cmd, 60_000)
    const parsed = extractJson(raw) as { result?: OrgListResult; status?: number }
    const result = (parsed.result ?? parsed) as OrgListResult

    this.cached = this.parseOrgs(result)
    return this.withUsage(this.cached)
  }

  async getLoginUrl(identifier: string): Promise<string> {
    await this.detectCli()

    const cmd = this.cliCommand === 'sf'
      ? `sf org open --target-org "${identifier}" --url-only --json`
      : `sfdx force:org:open --targetusername "${identifier}" --urlonly --json`

    const raw    = await runCmd(cmd, 12_000)
    const parsed = extractJson(raw) as { status?: number; message?: string; result?: { url?: string } | string }

    if (parsed.status !== 0 && parsed.message) {
      throw new Error(parsed.message)
    }

    const url = typeof parsed.result === 'string'
      ? parsed.result
      : parsed.result?.url

    if (!url) throw new Error('CLI returned an empty URL')
    return url
  }

  async openOrg(identifier: string): Promise<void> {
    const url = await this.getLoginUrl(identifier)
    await shell.openExternal(url)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private parseOrgs(result: OrgListResult): SfOrg[] {
    const orgs: SfOrg[] = []

    const push = (list: CliOrg[] | undefined, type: OrgType) => {
      for (const o of list ?? []) {
        const status = o.connectedStatus ?? 'Unknown'
        if (!ACTIVE_STATUSES.has(status)) continue
        if (isExpired(o)) continue

        const resolvedType: OrgType = o.isDefaultDevHubUsername ? 'devhub' : type

        orgs.push({
          alias:                   o.alias ?? o.username,
          username:                o.username,
          orgId:                   o.orgId,
          instanceUrl:             o.instanceUrl ?? '',
          connectedStatus:         status,
          isDefaultUsername:       o.isDefaultUsername ?? false,
          isDefaultDevHubUsername: o.isDefaultDevHubUsername ?? false,
          orgType:                 resolvedType,
          expirationDate:          o.expirationDate,
          usageCount:              0,
        })
      }
    }

    push(result.nonScratchOrgs, 'production')
    push(result.scratchOrgs,    'scratch')
    push(result.sandboxes,      'sandbox')

    return orgs
  }

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
