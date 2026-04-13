import { ipcMain, clipboard, BrowserWindow } from 'electron'
import type { SalesforceService } from './salesforce'
import type { Store } from './store'

export function setupIPC(
  win: BrowserWindow,
  sf:  SalesforceService,
  store: Store
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

  ipcMain.handle('orgs:incrementUsage', (_, orgId: string) => {
    store.incrementUsage(orgId)
    return { success: true, data: undefined }
  })

  // ── Window ──────────────────────────────────────────────────────────────────

  ipcMain.on('window:hide', () => win.hide())
}
