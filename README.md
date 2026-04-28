# SF Org Launcher

Acceso rápido a tus organizaciones de Salesforce desde la bandeja del sistema de Windows.

![Stack](https://img.shields.io/badge/Electron-28-blue?logo=electron) ![Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![Stack](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Stack](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)

---

## ¿Qué hace?

- Lista todas tus orgs de Salesforce autenticadas (producción, sandbox, scratch, devhub).
- Filtra automáticamente las orgs desconectadas o expiradas.
- Ordena por las más usadas.
- Genera un link de acceso directo y lo copia al portapapeles.
- Copia el comando CLI (`sf org open`) al portapapeles.
- Agrega nuevas orgs vía OAuth directamente desde la app.
- Elimina orgs de la lista local.
- Vive en la bandeja del sistema — sin ventana en la barra de tareas.

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| [Node.js](https://nodejs.org) | 18+ |

> **No se requiere Salesforce CLI instalado.** La app usa [`@salesforce/core`](https://github.com/forcedotcom/sfdx-core) directamente para leer las autenticaciones y generar URLs de login. Solo necesitas haberte autenticado al menos una vez (vía `sf org login web` o desde la propia app).

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
| `npm run build` | Compila todo para producción en `out/` |
| `npm run start` | Previsualiza el build de producción |
| `npm run package` | Genera instalador + portable `.exe` en `dist/` |

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
| `↵ Enter` | Abrir org en el navegador |
| `Ctrl + L` | Copiar link de acceso al portapapeles |
| `Ctrl + K` | Copiar comando CLI al portapapeles |
| `Ctrl + D` | Eliminar org de la lista local |
| `Ctrl + R` | Refrescar lista de orgs |
| `Esc` | Cerrar la paleta |

### Agregar una org

1. Haz clic en el botón **`+`** en la barra de búsqueda.
2. Elige el tipo de entorno: **Production / Developer** o **Sandbox**.
3. Se abre tu navegador con la página de login de Salesforce.
4. Inicia sesión normalmente.
5. La org aparece automáticamente en la lista.

### Eliminar una org

- Haz hover sobre la org y haz clic en el ícono de papelera, o usa `Ctrl + D`.
- Esto solo elimina la autenticación local — la org sigue existiendo en Salesforce.

### Menú del tray (clic derecho)

- **Show / Hide** — muestra u oculta la paleta
- **Refresh Orgs** — recarga desde el CLI
- **Quit** — cierra la aplicación

---

## Estructura del proyecto

```
src/
├── shared/
│   └── types.ts              # Tipos compartidos entre procesos
│
├── main/                     # Proceso principal (Node.js / Electron)
│   ├── index.ts              # Bootstrap, ventana, shortcut global
│   ├── salesforce.ts         # Integración con @salesforce/core (sin CLI)
│   ├── store.ts              # Persistencia de uso por org (JSON)
│   ├── tray.ts               # Ícono y menú de bandeja del sistema
│   ├── ipc.ts                # Handlers de comunicación IPC
│   └── icon.ts               # Ícono generado programáticamente
│
├── preload/
│   └── index.ts              # Bridge seguro entre main y renderer
│
└── renderer/                 # Interfaz de usuario (React + Vite)
    └── src/
        ├── App.tsx
        └── components/
            ├── CommandPalette.tsx   # Paleta principal de búsqueda
            ├── HotkeyRecorder.tsx  # Configuración de atajo global
            └── OrgItem.tsx          # Fila de cada org
```

---

## Distribución

`npm run package` genera dos archivos en `dist/`:

| Archivo | Descripción |
|---|---|
| `SF Org Launcher Setup 1.0.0.exe` | Instalador NSIS — instala en `Program Files`, crea accesos directos, aparece en "Agregar o quitar programas" |
| `SF Org Launcher 1.0.0.exe` | Portable — un solo archivo, sin instalación, se puede copiar y ejecutar en cualquier PC |

---

## Cómo funciona

```
@salesforce/core
      ↓
  AuthInfo.listAllAuthorizations()  — lee ~/.sf/ auth files
      ↓
  SalesforceService                 — filtra expiradas, ordena por uso
      ↓
  Store (userData/*.json)           — persistencia del conteo de uso
      ↓
  IPC (contextBridge)               — canal seguro main ↔ renderer
      ↓
  CommandPalette (React)            — búsqueda, navegación, acciones
```

### OAuth login flow

```
Botón "+" → Elige entorno → WebOAuthServer (localhost) → Browser login
      ↓
  Salesforce redirige al servidor local con auth code
      ↓
  authorizeAndSave() → se guarda en ~/.sf/ → lista se refresca
```

---

## Notas

- La app lee directamente los archivos de autenticación de `~/.sf/` vía `@salesforce/core`, sin depender del CLI.
- Las orgs con `isExpired === true` y las que tienen errores de autenticación se filtran automáticamente.
- Para generar URLs de acceso, la app usa `Org.refreshAuth()` + front-door URL con el access token.

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
| Framework desktop | Electron 28 |
| UI | React 18 + TypeScript |
| Bundler | electron-vite + Vite 5 |
| Estilos | Tailwind CSS 3 (tema Catppuccin Mocha) |
| Salesforce API | @salesforce/core |
| Empaquetado | electron-builder |
