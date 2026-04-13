import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

interface UsageEntry {
  count: number
  lastUsed: number
}

interface StoreData {
  usage: Record<string, UsageEntry>
}

const EMPTY: StoreData = { usage: {} }

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
}
