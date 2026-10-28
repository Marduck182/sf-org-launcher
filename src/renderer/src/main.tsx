import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/silkscreen/400.css'
import '@fontsource/silkscreen/700.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'
import '@fontsource/hanken-grotesk/700.css'
import App from './App'
import { api } from './api'
import { watchPixelGrid } from './pixelGrid'
import './styles/globals.css'

watchPixelGrid()

// With Windows transparency effects off, Acrylic falls back to an opaque grey;
// switch the panel to solid VS Code black instead of tinting that grey.
function syncGlass() {
  api.transparencyEnabled().then(res => {
    document.documentElement.classList.toggle('no-glass', res.success && !res.data)
  })
}
syncGlass()
api.onWindowShow(syncGlass)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
