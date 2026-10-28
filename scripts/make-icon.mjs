// Renders the 16×16 pixel ↵ icon (same grid as src-tauri/src/tray.rs) to a
// 1024px PNG with whole-pixel scaling. Then: `npx tauri icon app-icon.png`.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const GRID = [
  '..eeeeeeeeeeee..',
  '.ekkkkkkkkkkkke.',
  'ekkkkkkkkkkkkkke',
  'ekkkkkkkkkkkkkke',
  'ekkkkkkkkkkllkke',
  'ekkkkkkkkkkllkke',
  'ekkkklkkkkkllkke',
  'ekkkllkkkkkllkke',
  'ekkllllllllllkke',
  'ekkllllllllllkke',
  'ekkkllkkkkkkkkke',
  'ekkkklkkkkkkkkke',
  'ekkkkkkkkkkkkkke',
  'ekkkkkkkkkkkkkke',
  '.ekkkkkkkkkkkke.',
  '..eeeeeeeeeeee..',
]
const COLORS = { e: [0x3c, 0x3c, 0x3c, 255], k: [0x1e, 0x1e, 0x1e, 255], l: [0xd4, 0xff, 0x3a, 255] }

const SIZE = 1024
const SCALE = SIZE / 16
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const c = COLORS[GRID[Math.floor(y / SCALE)][Math.floor(x / SCALE)]]
    if (c) raw.set(c, y * (SIZE * 4 + 1) + 1 + x * 4)
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let k = n
  for (let j = 0; j < 8; j++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1
  return k >>> 0
})
const crc = buf => { let k = ~0; for (const b of buf) k = crcTable[(k ^ b) & 255] ^ (k >>> 8); return ~k >>> 0 }
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body))
  return Buffer.concat([len, body, sum])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 6

writeFileSync('app-icon.png', Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
]))
console.log('app-icon.png written')
