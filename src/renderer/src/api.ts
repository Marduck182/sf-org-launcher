import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { SfOrg, IpcResponse } from '../../shared/types'

// Typed, narrow wrapper over the Rust commands. Commands reject with a string
// on failure; normalise that into the IpcResponse shape the UI expects.
async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<IpcResponse<T>> {
  try {
    return { success: true, data: await invoke<T>(cmd, args) }
  } catch (e: unknown) {
    return { success: false, error: String(e) }
  }
}

/** Subscribe to a backend event and return a synchronous cleanup function. */
function subscribe<T>(event: string, cb: (payload: T) => void): () => void {
  let unlisten: UnlistenFn | null = null
  let disposed = false
  listen<T>(event, e => cb(e.payload)).then(fn => {
    if (disposed) fn()
    else unlisten = fn
  })
  return () => {
    disposed = true
    unlisten?.()
  }
}

export const api = {
  // ── Orgs ────────────────────────────────────────────────────────────────────
  listOrgs:       () => call<SfOrg[]>('list_orgs'),
  refreshOrgs:    () => call<SfOrg[]>('refresh_orgs'),
  openOrg:        (identifier: string) => call<undefined>('open_org', { identifier }),
  getOrgLink:     (identifier: string) => call<string>('get_org_link', { identifier }),
  copyOrgLink:    (identifier: string) => call<undefined>('copy_org_link', { identifier }),
  incrementUsage: (orgId: string) => call<undefined>('increment_usage', { orgId }),
  loginOrg:       (loginUrl: string) => call<undefined>('login_org', { loginUrl }),
  removeOrg:      (username: string) => call<undefined>('remove_org', { username }),
  renameOrg:      (username: string, newAlias: string) =>
    call<undefined>('rename_org', { username, newAlias }),

  // ── Settings ─────────────────────────────────────────────────────────────────
  getHotkey:      () => call<string>('get_hotkey'),
  setHotkey:      (hotkey: string) => call<undefined>('set_hotkey', { hotkey }),
  setTrayIcon:    () => call<string>('set_tray_icon'),
  getTrayIcon:    () => call<string | null>('get_tray_icon'),
  resetTrayIcon:  () => call<undefined>('reset_tray_icon'),

  // ── Export / Import ─────────────────────────────────────────────────────────
  exportData:     () => call<undefined>('export_data'),
  importData:     () => call<undefined>('import_data'),

  // ── Window ──────────────────────────────────────────────────────────────────
  hideWindow:     (): void => { void invoke('hide_window') },
  transparencyEnabled: () => call<boolean>('transparency_enabled'),

  // ── Events (return a cleanup function) ──────────────────────────────────────
  onWindowShow:    (cb: () => void) => subscribe<null>('window:show', () => cb()),
  onOrgsRefreshed: (cb: (orgs: SfOrg[]) => void) => subscribe<SfOrg[]>('orgs:refreshed', cb),
  onForceRefresh:  (cb: () => void) => subscribe<null>('orgs:forceRefresh', () => cb()),
}
