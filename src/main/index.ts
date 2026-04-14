import { app, BrowserWindow, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { Store } from './store'
import { SalesforceService } from './salesforce'
import { setupIPC } from './ipc'
import { setupTray } from './tray'

// ── Reduce process count ──────────────────────────────────────────────────────
// This is a lightweight tray app — no GPU or background network service needed.
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('disable-background-networking')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

// Keep a global reference so the window isn't garbage-collected
let mainWindow: BrowserWindow | null = null

// ── Window factory ────────────────────────────────────────────────────────────

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width:       620,
    height:      520,
    show:        false,
    frame:       false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable:   false,
    movable:     false,
    webPreferences: {
      preload:           join(__dirname, '../preload/index.js'),
      contextIsolation:  true,
      nodeIntegration:   false,
      sandbox:           false
    }
  })

  // Hide instead of close when the OS tries to close it
  win.on('close', e => {
    e.preventDefault()
    win.hide()
  })

  // Auto-hide when the window loses focus (click outside)
  win.on('blur', () => {
    if (!win.webContents.isDevToolsOpened()) {
      win.hide()
    }
  })

  // Load the renderer
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

// ── Toggle helper ─────────────────────────────────────────────────────────────

function toggleWindow(): void {
  if (!mainWindow) return

  if (mainWindow.isVisible()) {
    mainWindow.hide()
    return
  }

  // Position: horizontally centred, 20 % from the top
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const [ww, wh] = mainWindow.getSize()
  mainWindow.setPosition(
    Math.floor((sw - ww) / 2),
    Math.floor(sh * 0.18)
  )

  mainWindow.show()
  mainWindow.focus()
  // Tell the renderer to reset its state
  mainWindow.webContents.send('window:show')
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Single-instance guard
  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) {
    app.quit()
    return
  }

  app.on('second-instance', toggleWindow)

  // On Windows the app might appear in the taskbar during boot — prevent it
  app.setAppUserModelId('com.sfOrg.launcher')

  const store = new Store()
  const sf    = new SalesforceService(store)

  mainWindow = createWindow()

  setupIPC(mainWindow, sf, store, toggleWindow)
  setupTray(mainWindow, toggleWindow)

  // Warm-up: load orgs in the background so the first open is instant
  sf.listOrgs().catch(() => { /* surfaced to the renderer on demand */ })

  // Global shortcut: use stored hotkey (defaults to Ctrl+Shift+S)
  const hotkey = store.getHotkey()
  globalShortcut.register(hotkey, toggleWindow)
})

// Keep the app alive in the tray; don't quit when all windows are closed
app.on('window-all-closed', () => { /* intentional no-op */ })

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
