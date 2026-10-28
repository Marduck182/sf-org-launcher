// Copies the standalone release exe next to the installer so `dist/` holds both.
// The Tauri exe embeds the frontend, so it runs on its own (WebView2 ships with Windows 10/11).
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

mkdirSync('dist', { recursive: true })
copyFileSync(
  'src-tauri/target/release/sf-org-launcher.exe',
  `dist/SF Org Launcher ${version} portable.exe`
)
console.log(`Portable exe → dist/SF Org Launcher ${version} portable.exe`)
