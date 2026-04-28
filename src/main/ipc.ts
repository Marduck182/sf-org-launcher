import { ipcMain, clipboard, globalShortcut, BrowserWindow } from 'electron'
import type { SalesforceService } from './salesforce'
import type { Store } from './store'

export function setupIPC(
  win: BrowserWindow,
  sf:  SalesforceService,
  store: Store,
  onToggle: () => void
): void {

  // ── Orgs ────────────────────────────────────────────────────────────────────

  ipcMain.handle('orgs:list', async () => {
    try {
      return { success: true, data: await sf.listOrgs() }
    } catch (e: unknown) {
      return { success: false, error: String((e as Error).message ?? e) }
    }
  })

  ipcMain.handle('orgs:refresh', async () => {
    try {
      const data = await sf.listOrgs(true)
      win.webContents.send('orgs:refreshed', data)
      return { success: true, data }
    } catch (e: unknown) {
      return { success: false, error: String((e as Error).message ?? e) }
    }
  })

  ipcMain.handle('orgs:open', async (_, identifier: string) => {
    try {
      await sf.openOrg(identifier)
      return { success: true, data: undefined }
    } catch (e: unknown) {
      return { success: false, error: String((e as Error).message ?? e) }
    }
  })

  ipcMain.handle('orgs:getLink', async (_, identifier: string) => {
    try {
      return { success: true, data: await sf.getLoginUrl(identifier) }
    } catch (e: unknown) {
      return { success: false, error: String((e as Error).message ?? e) }
    }
  })

  ipcMain.handle('orgs:copyLink', async (_, identifier: string) => {
    try {
      const url = await sf.getLoginUrl(identifier)
      clipboard.writeText(url)
      return { success: true, data: undefined }
    } catch (e: unknown) {
      return { success: false, error: String((e as Error).message ?? e) }
    }
  })

  ipcMain.handle('orgs:copyCmd', (_, identifier: string) => {
    try {
      const cmd = sf.getOpenCommand(identifier)
      clipboard.writeText(cmd)
      return { success: true, data: undefined }
    } catch (e: unknown) {
      return { success: false, error: String((e as Error).message ?? e) }
    }
  })

  ipcMain.handle('orgs:incrementUsage', (_, orgId: string) => {
    store.incrementUsage(orgId)
    return { success: true, data: undefined }
  })

  ipcMain.handle('orgs:login', async (_, loginUrl: string) => {
    try {
      await sf.loginOrg(loginUrl)
      const data = await sf.listOrgs(true)
      win.webContents.send('orgs:refreshed', data)
      return { success: true, data: undefined }
    } catch (e: unknown) {
      return { success: false, error: String((e as Error).message ?? e) }
    }
  })

  ipcMain.handle('orgs:remove', async (_, username: string) => {
    try {
      await sf.removeOrg(username)
      const data = await sf.listOrgs(true)
      win.webContents.send('orgs:refreshed', data)
      return { success: true, data: undefined }
    } catch (e: unknown) {
      return { success: false, error: String((e as Error).message ?? e) }
    }
  })

  // ── Settings ─────────────────────────────────────────────────────────────────

  ipcMain.handle('settings:getHotkey', () => {
    return { success: true, data: store.getHotkey() }
  })

  ipcMain.handle('settings:setHotkey', (_, hotkey: string) => {
    try {
      globalShortcut.unregisterAll()
      const ok = globalShortcut.register(hotkey, onToggle)
      if (!ok) {
        // Re-register old hotkey on failure
        const prev = store.getHotkey()
        globalShortcut.register(prev, onToggle)
        return { success: false, error: `Could not register "${hotkey}". It may be in use by another application.` }
      }
      store.setHotkey(hotkey)
      return { success: true, data: undefined }
    } catch (e: unknown) {
      // Re-register old hotkey on error
      const prev = store.getHotkey()
      try { globalShortcut.register(prev, onToggle) } catch { /* best effort */ }
      return { success: false, error: String((e as Error).message ?? e) }
    }
  })

  // ── Window ──────────────────────────────────────────────────────────────────

  ipcMain.on('window:hide', () => win.hide())
}
