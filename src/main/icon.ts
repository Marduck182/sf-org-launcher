import { nativeImage } from 'electron'

/**
 * Generates a 16×16 Salesforce-blue circle as a raw RGBA buffer
 * so we don't need an external PNG file in development.
 */
export function createTrayIcon(): Electron.NativeImage {
  const size = 16
  const buf  = Buffer.alloc(size * size * 4) // RGBA

  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const r  = size / 2 - 1

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx  = (y * size + x) * 4
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)

      if (dist <= r) {
        // Salesforce blue #00A1E0
        buf[idx]     = 0
        buf[idx + 1] = 161
        buf[idx + 2] = 224
        buf[idx + 3] = 255
      } else {
        buf[idx + 3] = 0 // transparent
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}
