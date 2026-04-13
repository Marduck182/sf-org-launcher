import { Tray, Menu, app, BrowserWindow } from 'electron'
import { createTrayIcon } from './icon'

let tray: Tray | null = null

export function setupTray(
  win: BrowserWindow,
  onToggle: () => void
): void {
  const icon = createTrayIcon()
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
