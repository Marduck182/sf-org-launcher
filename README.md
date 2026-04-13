# SF Org Launcher

Acceso rápido a tus organizaciones de Salesforce desde la bandeja del sistema de Windows.

![Stack](https://img.shields.io/badge/Electron-28-blue?logo=electron) ![Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![Stack](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Stack](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)

---

## ¿Qué hace?

- Lista todas tus orgs de Salesforce autenticadas (producción, sandbox, scratch, devhub).
- Filtra automáticamente las orgs desconectadas o expiradas.
- Ordena por las más usadas.
- Genera un link de acceso directo y lo copia al portapapeles.
- Vive en la bandeja del sistema — sin ventana en la barra de tareas.

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| [Node.js](https://nodejs.org) | 18+ |
| [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`) | cualquier versión reciente |

> La app detecta automáticamente `sf` o `sfdx` en tu PATH.

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
| `Ctrl + R` | Refrescar lista de orgs |
| `Esc` | Cerrar la paleta |

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
│   ├── salesforce.ts         # Integración con sf/sfdx CLI
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
sf org list --json
      ↓
  SalesforceService          — filtra inactivas/expiradas, ordena por uso
      ↓
  Store (userData/*.json)    — persistencia del conteo de uso
      ↓
  IPC (contextBridge)        — canal seguro main ↔ renderer
      ↓
  CommandPalette (React)     — búsqueda, navegación, acciones
```

---

## Notas sobre el CLI

- `sf org list` puede tardar **hasta 60 segundos** en ambientes con plugins de desarrollo instalados. La app espera pacientemente y muestra un indicador de carga.
- Si el CLI emite advertencias antes del JSON (e.g. `» Warning: Could not find typescript`), la app las ignora y extrae el JSON correctamente.
- Solo se muestran orgs con estado `Connected`. Las desconectadas y las scratch expiradas se filtran automáticamente.

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
| Empaquetado | electron-builder |
