import { contextBridge, ipcRenderer } from 'electron'
import type { SfOrg, IpcResponse } from '../shared/types'

// Expose a typed, narrow API to the renderer — no raw Node/Electron access
contextBridge.exposeInMainWorld('electronAPI', {
  // ── Orgs ────────────────────────────────────────────────────────────────────
  listOrgs: (): Promise<IpcResponse<SfOrg[]>> =>
    ipcRenderer.invoke('orgs:list'),

  refreshOrgs: (): Promise<IpcResponse<SfOrg[]>> =>
    ipcRenderer.invoke('orgs:refresh'),

  openOrg: (identifier: string): Promise<IpcResponse<undefined>> =>
    ipcRenderer.invoke('orgs:open', identifier),

  getOrgLink: (identifier: string): Promise<IpcResponse<string>> =>
    ipcRenderer.invoke('orgs:getLink', identifier),

  copyOrgLink: (identifier: string): Promise<IpcResponse<undefined>> =>
    ipcRenderer.invoke('orgs:copyLink', identifier),

  copyOrgCmd: (identifier: string): Promise<IpcResponse<undefined>> =>
    ipcRenderer.invoke('orgs:copyCmd', identifier),

  incrementUsage: (orgId: string): Promise<IpcResponse<undefined>> =>
    ipcRenderer.invoke('orgs:incrementUsage', orgId),

  loginOrg: (loginUrl: string): Promise<IpcResponse<undefined>> =>
    ipcRenderer.invoke('orgs:login', loginUrl),

  removeOrg: (username: string): Promise<IpcResponse<undefined>> =>
    ipcRenderer.invoke('orgs:remove', username),

  // ── Settings ─────────────────────────────────────────────────────────────────
  getHotkey: (): Promise<IpcResponse<string>> =>
    ipcRenderer.invoke('settings:getHotkey'),

  setHotkey: (hotkey: string): Promise<IpcResponse<undefined>> =>
    ipcRenderer.invoke('settings:setHotkey', hotkey),

  // ── Export / Import ─────────────────────────────────────────────────────────
  exportData: (): Promise<IpcResponse<undefined>> =>
    ipcRenderer.invoke('store:export'),

  importData: (): Promise<IpcResponse<undefined>> =>
    ipcRenderer.invoke('store:import'),

  // ── Window ──────────────────────────────────────────────────────────────────
  hideWindow: (): void => ipcRenderer.send('window:hide'),

  // ── Events (return a cleanup function) ──────────────────────────────────────
  onWindowShow: (cb: () => void): (() => void) => {
    const handler = (): void => cb()
    ipcRenderer.on('window:show', handler)
    return () => ipcRenderer.removeListener('window:show', handler)
  },

  onOrgsRefreshed: (cb: (orgs: SfOrg[]) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, orgs: SfOrg[]): void => cb(orgs)
    ipcRenderer.on('orgs:refreshed', handler)
    return () => ipcRenderer.removeListener('orgs:refreshed', handler)
  },

  onForceRefresh: (cb: () => void): (() => void) => {
    const handler = (): void => cb()
    ipcRenderer.on('orgs:forceRefresh', handler)
    return () => ipcRenderer.removeListener('orgs:forceRefresh', handler)
  }
})
