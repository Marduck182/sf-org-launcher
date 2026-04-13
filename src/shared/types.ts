export type OrgType = 'production' | 'sandbox' | 'scratch' | 'devhub' | 'unknown'

export type ConnectedStatus =
  | 'Connected'
  | 'Disconnected'
  | 'RefreshTokenAuthError'
  | 'Unknown'
  | string

export interface SfOrg {
  alias: string
  username: string
  orgId: string
  instanceUrl: string
  connectedStatus: ConnectedStatus
  isDefaultUsername: boolean
  isDefaultDevHubUsername: boolean
  orgType: OrgType
  expirationDate?: string
  // Populated by the store
  usageCount: number
  lastUsedAt?: number
}

export type IpcResponse<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }
