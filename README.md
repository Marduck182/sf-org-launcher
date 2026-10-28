# SF Org Launcher

Acceso rápido a tus organizaciones de Salesforce desde la bandeja del sistema de Windows.

![Stack](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri) ![Stack](https://img.shields.io/badge/Rust-stable-000000?logo=rust) ![Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![Stack](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Stack](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)

---

## Diseño

La org seleccionada se compone en letra bitmap (Silkscreen) sobre cristal Acrylic teñido con el negro de VS Code, subrayada con el color de su entorno: rojo para producción y Dev Hub, cian para sandbox, ámbar para scratch. Las reglas del sistema visual están en [DESIGN.md](DESIGN.md).

> Si Windows tiene apagados los *Efectos de transparencia*, el panel usa negro sólido `#1E1E1E` en lugar del cristal.

## ¿Qué hace?

- Lista todas tus orgs de Salesforce autenticadas (producción, sandbox, scratch, devhub).
- Filtra automáticamente las orgs desconectadas o expiradas.
- Ordena por las más usadas.
- Genera un link de acceso directo y lo copia al portapapeles.
- Copia el comando CLI (`sf org open`) al portapapeles.
- Agrega nuevas orgs vía OAuth directamente desde la app.
- Elimina orgs de la lista local.
- Exporta e importa datos de uso y configuración (backup o migración entre PCs).
- Vive en la bandeja del sistema — sin ventana en la barra de tareas.

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| [Node.js](https://nodejs.org) | 18+ |
| [Rust](https://rustup.rs) | stable (MSVC) |
| WebView2 | incluido en Windows 10/11 |

> **No se requiere Salesforce CLI instalado.** La app lee y escribe directamente los archivos de autenticación del CLI (`~/.sfdx`), con el mismo cifrado, así que es compatible en ambos sentidos: ve las orgs que autenticaste con `sf`, y `sf` ve las que agregues desde la app.

---

## Instalación

```bash
# 1. Clona o descarga el repositorio
cd sf-org-launcher

# 2. Instala dependencias
npm install

# 3. Ejecuta en modo desarrollo
npm run dev
```

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia la app en modo desarrollo con hot-reload |
| `npm run build` | Compila solo el frontend en `out/renderer` |
| `npm run typecheck` | Verifica tipos del frontend |
| `npm run package` | Genera instalador NSIS + `.exe` portable |

---

## Uso

### Abrir la paleta

| Método | Acción |
|---|---|
| **Clic en el ícono** de la bandeja del sistema | Muestra / oculta la paleta |
| `Ctrl + Shift + S` | Atajo global desde cualquier ventana |

### Navegación con teclado

| Tecla | Acción |
|---|---|
| `↑` / `↓` | Mover selección |
| `Enter` | Abrir org en el navegador |
| `Ctrl + 1…9` | Abrir directo la org en esa posición |
| `Ctrl + L` | Copiar link de acceso (un solo uso) al portapapeles |
| `Ctrl + E` | Renombrar el alias |
| `Ctrl + D` | Eliminar el login local (pide confirmación: otra vez `Ctrl + D` o `Enter`) |
| `Ctrl + N` | Agregar org |
| `Ctrl + ,` | Ajustes |
| `Ctrl + R` | Refrescar lista de orgs |
| `Esc` | Volver a la lista / cerrar la paleta |

### Agregar una org

1. Haz clic en el botón **`+`** en la barra de búsqueda.
2. Elige el tipo de entorno: **Production / Developer** o **Sandbox**.
3. Se abre tu navegador con la página de login de Salesforce.
4. Inicia sesión normalmente.
5. La org aparece automáticamente en la lista.

### Eliminar una org

- Haz hover sobre la org y haz clic en el ícono de papelera, o usa `Ctrl + D`.
- Esto solo elimina la autenticación local — la org sigue existiendo en Salesforce.

### Exportar / Importar datos

1. Abre **Settings** (ícono de engranaje en la barra de búsqueda).
2. En la sección **Data**, usa:
   - **📤 Export** — guarda un archivo `.json` con tus estadísticas de uso y hotkey configurado.
   - **📥 Import** — carga un archivo `.json` previamente exportado. Los datos se reemplazan y la lista se refresca automáticamente.

> Útil para migrar entre máquinas o como backup.

### Menú del tray (clic derecho)

- **Show / Hide** — muestra u oculta la paleta
- **Refresh Orgs** — recarga desde `~/.sfdx`
- **Finalizar aplicación** — cierra la aplicación

---

## Estructura del proyecto

```
src/
├── shared/
│   └── types.ts              # Tipos compartidos con el frontend
│
└── renderer/                 # Interfaz de usuario (React + Vite)
    └── src/
        ├── api.ts            # Wrapper tipado de los comandos de Tauri
        ├── App.tsx
        └── components/
            ├── CommandPalette.tsx   # Paleta principal de búsqueda
            ├── HotkeyRecorder.tsx   # Configuración de atajo global
            └── OrgItem.tsx          # Fila de cada org

src-tauri/                    # Backend en Rust
├── tauri.conf.json           # Ventana, bundle, CSP
└── src/
    ├── main.rs               # Bootstrap, comandos, ventana, shortcut global
    ├── salesforce.rs         # Listar / abrir orgs, refresh de tokens, login OAuth
    ├── sfdx.rs               # Lectura/escritura de ~/.sfdx (auths, alias, config)
    ├── crypto.rs             # Cifrado AES-256-GCM compatible con @salesforce/core
    ├── store.rs              # Persistencia de uso por org (JSON)
    └── tray.rs               # Ícono y menú de bandeja del sistema
```

---

## Distribución

`npm run package` genera:

| Archivo | Descripción |
|---|---|
| `src-tauri/target/release/bundle/nsis/SF Org Launcher_1.0.0_x64-setup.exe` | Instalador (~2 MB) — instala por usuario en `%LOCALAPPDATA%`, no requiere admin |
| `dist/SF Org Launcher 1.0.0 portable.exe` | Portable (~5 MB) — un solo exe con el frontend embebido; no extrae nada a `%TEMP%` |

---

## Cómo funciona

```
~/.sfdx/<username>.json, alias.json, key.json
      ↓
  sfdx.rs + crypto.rs        — lee auths y descifra tokens (AES-256-GCM)
      ↓
  salesforce.rs              — filtra expiradas, refresca tokens vía OAuth
      ↓
  Store (%APPDATA%/*.json)   — persistencia del conteo de uso
      ↓
  Comandos Tauri (invoke)    — canal main ↔ renderer
      ↓
  CommandPalette (React)     — búsqueda, navegación, acciones
```

### Abrir una org

Pide un link de un solo uso a `/services/oauth2/singleaccess` (igual que `sf org open`). Si el access token expiró, lo refresca con el refresh token y reintenta.

### OAuth login flow

```
Botón "+" → Elige entorno → servidor local en localhost:1717 → Browser login (PKCE)
      ↓
  Salesforce redirige al servidor local con auth code
      ↓
  Intercambio por tokens → se guarda cifrado en ~/.sfdx/ → lista se refresca
```

Usa la connected app `PlatformCLI` (la misma del CLI), por eso el puerto 1717 es fijo.

---

## Datos persistidos

La app guarda el conteo de uso en:

```
%APPDATA%\sf-org-launcher\sf-org-launcher-store.json
```

```json
{
  "usage": {
    "00D000000000001": { "count": 12, "lastUsed": 1712345678901 },
    "00D000000000002": { "count":  3, "lastUsed": 1712300000000 }
  }
}
```

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework desktop | Tauri 2 (WebView2) |
| UI | React 18 + TypeScript |
| Backend | Rust (reqwest, aes-gcm, tokio) |
| Bundler | Vite 5 |
| Estilos | CSS propio sobre Tailwind 3 · Silkscreen + Hanken Grotesk (empaquetadas) · Acrylic de Windows 11 |
| Empaquetado | Tauri bundler (NSIS) |
