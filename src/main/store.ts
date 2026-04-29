import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

interface UsageEntry {
  count: number
  lastUsed: number
}

interface StoreData {
  usage: Record<string, UsageEntry>
  hotkey: string
}

const DEFAULT_HOTKEY = 'CommandOrControl+Shift+S'

const EMPTY: StoreData = { usage: {}, hotkey: DEFAULT_HOTKEY }

export class Store {
  private filePath: string
  private data: StoreData

  constructor() {
    const userDataPath = app.getPath('userData')
    mkdirSync(userDataPath, { recursive: true })
    this.filePath = join(userDataPath, 'sf-org-launcher-store.json')
    this.data = this.load()
  }

  private load(): StoreData {
    try {
      if (existsSync(this.filePath)) {
        return JSON.parse(readFileSync(this.filePath, 'utf-8')) as StoreData
      }
    } catch {
      // Corrupted store — start fresh
    }
    return structuredClone(EMPTY)
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  getUsage(): Record<string, UsageEntry> {
    return this.data.usage
  }

  incrementUsage(orgId: string): void {
    if (!this.data.usage[orgId]) {
      this.data.usage[orgId] = { count: 0, lastUsed: 0 }
    }
    this.data.usage[orgId].count++
    this.data.usage[orgId].lastUsed = Date.now()
    this.save()
  }

  getHotkey(): string {
    return this.data.hotkey || DEFAULT_HOTKEY
  }

  setHotkey(hotkey: string): void {
    this.data.hotkey = hotkey
    this.save()
  }

  exportData(): string {
    return JSON.stringify(this.data, null, 2)
  }

  importData(raw: string): void {
    const parsed = JSON.parse(raw) as StoreData
    if (!parsed || typeof parsed !== 'object' || typeof parsed.usage !== 'object') {
      throw new Error('Invalid store file format')
    }
    this.data = {
      usage: parsed.usage ?? {},
      hotkey: parsed.hotkey || DEFAULT_HOTKEY
    }
    this.save()
  }
}
