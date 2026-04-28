/// <reference types="vite/client" />

import type { SfOrg, IpcResponse } from '../../shared/types'

declare global {
  interface Window {
    electronAPI: {
      listOrgs:       ()                          => Promise<IpcResponse<SfOrg[]>>
      refreshOrgs:    ()                          => Promise<IpcResponse<SfOrg[]>>
      openOrg:        (identifier: string)        => Promise<IpcResponse<undefined>>
      getOrgLink:     (identifier: string)        => Promise<IpcResponse<string>>
      copyOrgLink:    (identifier: string)        => Promise<IpcResponse<undefined>>
      copyOrgCmd:     (identifier: string)        => Promise<IpcResponse<undefined>>
      incrementUsage: (orgId: string)             => Promise<IpcResponse<undefined>>
      loginOrg:       (loginUrl: string)            => Promise<IpcResponse<undefined>>
      removeOrg:      (username: string)            => Promise<IpcResponse<undefined>>
      getHotkey:      ()                          => Promise<IpcResponse<string>>
      setHotkey:      (hotkey: string)            => Promise<IpcResponse<undefined>>
      hideWindow:     ()                          => void
      onWindowShow:   (cb: () => void)            => () => void
      onOrgsRefreshed:(cb: (orgs: SfOrg[]) => void) => () => void
      onForceRefresh: (cb: () => void)            => () => void
    }
  }
}
