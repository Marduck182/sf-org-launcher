import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import { existsSync } from 'fs'
import { createTrayIcon } from './icon'
import type { Store } from './store'

let tray: Tray | null = null

function loadIcon(store: Store): Electron.NativeImage {
  const customPath = store.getTrayIconPath()
  if (customPath && existsSync(customPath)) {
    const img = nativeImage.createFromPath(customPath)
    if (!img.isEmpty()) return img.resize({ width: 16, height: 16 })
  }
  return createTrayIcon()
}

export function setupTray(
  win: BrowserWindow,
  onToggle: () => void,
  store: Store
): void {
  const icon = loadIcon(store)
  tray = new Tray(icon)
  tray.setToolTip('SF Org Launcher\nClick to toggle')

  // Left-click → show / hide the palette
  tray.on('click', onToggle)

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show / Hide',
      click: onToggle
    },
    {
      label: 'Refresh Orgs',
      click: () => win.webContents.send('orgs:forceRefresh')
    },
    { type: 'separator' },
    {
      label: 'Finalizar aplicación',
      click: () => {
        tray?.destroy()
        app.exit(0)   // process.exit via Electron — mata todos los procesos hijos
      }
    }
  ])

  tray.setContextMenu(menu)
}

export function updateTrayIcon(store: Store): void {
  if (!tray) return
  const icon = loadIcon(store)
  tray.setImage(icon)
}
