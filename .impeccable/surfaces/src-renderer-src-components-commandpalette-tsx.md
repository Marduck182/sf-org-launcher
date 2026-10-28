---
version: 1
slug: "src-renderer-src-components-commandpalette-tsx"
primary_target: "src/renderer/src/components/CommandPalette.tsx"
related_targets: ["src/renderer/src/components/OrgItem.tsx","src/renderer/src/components/HotkeyRecorder.tsx"]
---

# Command palette surface

Scope: the whole 620×520 palette window (org list, add-org view, settings view, loading/empty/error states) plus the app/tray icon. Visitor mode: Operate.

User-pinned constraints: real glass (Windows 11 Acrylic behind a transparent window), tinted with VS Code Dark black (#1E1E1E editor, #252526 panels). Bolder register chosen on re-roll.

## Direction contract

THESIS: The selected org is typeset as a bitmap specimen headline on smoked glass, so which org is about to open is impossible to miss. Refuses the grey Raycast list where every row weighs the same.

OWN-WORLD: VS Code black glass (#1E1E1E at ~74% over Acrylic, #252526 solids), ivory ink #F4F5F0, one acid accent #D4FF3A reserved for focus/primary action; one ribbon colour per environment (prod #FF5A4E, sandbox #7FD4FF, devhub #C9A7FF, scratch #FFC857). Silkscreen bitmap for display and codes, Hanken Grotesk for everything read; a fading etched dot screen at the top edge.

STORY: Summon, type two letters, see the org's name huge in pixels with its environment ribbon, Enter. Prod is never ambiguous.

FIRST VIEWPORT: Search bar 48px; specimen block: alias in Silkscreen ~50px, env ribbon + username + usage, Open/Copy link at right; compact list of identical 40px rows (serial 1–9, alias, env code, usage); shortcut footer 36px.

FORM: Emigre bitmap specimen, dealt lead of bolder re-roll 1; seed: seed:69c59b29e3c7e472. Raises: identical row scale (botanical), one ribbon colour per environment (mascots), selection takes the headline while the rest dims (Ikeda).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Recorded deviations

- Open / Copy link sit in a left-aligned action row under the sub line instead of at the right: full-width 48px aliases (e.g. ACME RETAIL UAT 2026) leave no room beside the sub line, and rename/remove take the right edge.
- Dev Hub uses the production red (ribbon PROD · DEV HUB, Open production): Dev Hubs live in production orgs (PRODUCT principle 2).
- Environment colour moved from the last word to a 4px rule under the whole specimen; production/Dev Hub set the whole name in red.
- With Windows transparency effects off the panel is solid #1E1E1E (Acrylic fallback would be grey).

## Open decisions

- Final UI language (English vs Spanish).
- Icon: decided (delegated to designer) — pixel Enter tile on VS Code black, shipped in tray/app/installer.
