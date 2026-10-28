---
name: SF Org Launcher
description: A bitmap specimen on smoked glass; the org about to open is set huge in pixels and its environment is never ambiguous.
colors:
  glass: "rgba(30, 30, 30, 0.74)"
  glass-solid: "#1E1E1E"
  edge: "rgba(255, 255, 255, 0.16)"
  ink: "#F4F5F0"
  ink-2: "rgba(244, 245, 240, 0.84)"
  ink-3: "rgba(244, 245, 240, 0.70)"
  acid-lime: "#D4FF3A"
  acid-lime-hover: "#E0FF6E"
  on-lime: "#0E1014"
  prod-red: "#FF5A4E"
  prod-red-hover: "#FF7A70"
  on-prod: "#1A0503"
  sandbox-blue: "#7FD4FF"
  scratch-amber: "#FFC857"
typography:
  specimen:
    fontFamily: "Silkscreen, Courier New, monospace"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Silkscreen, Courier New, monospace"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1
  choice:
    fontFamily: "Silkscreen, Courier New, monospace"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1
  keycap:
    fontFamily: "Silkscreen, Courier New, monospace"
    fontSize: "18px"
    fontWeight: 400
  code:
    fontFamily: "Silkscreen, Courier New, monospace"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.04em"
  input:
    fontFamily: "Hanken Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Hanken Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tnum"
  label:
    fontFamily: "Hanken Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  key: "4px"
  cap: "6px"
  button: "7px"
  panel: "8px"
  row: "9px"
  card: "12px"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  gutter: "18px"
components:
  button-primary:
    backgroundColor: "{colors.acid-lime}"
    textColor: "{colors.on-lime}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 11px"
    height: "28px"
  button-primary-hover:
    backgroundColor: "{colors.acid-lime-hover}"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.10)"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 11px"
    height: "28px"
  button-secondary-hover:
    backgroundColor: "rgba(255, 255, 255, 0.17)"
  button-danger:
    backgroundColor: "{colors.prod-red}"
    textColor: "{colors.on-prod}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 11px"
    height: "28px"
  button-danger-hover:
    backgroundColor: "{colors.prod-red-hover}"
  icon-button:
    backgroundColor: "rgba(255, 255, 255, 0.07)"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.panel}"
    size: "30px"
  org-row:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.row}"
    padding: "0 12px"
    height: "40px"
  org-row-selected:
    backgroundColor: "rgba(212, 255, 58, 0.10)"
  org-row-selected-prod:
    backgroundColor: "rgba(255, 90, 78, 0.12)"
  env-ribbon:
    textColor: "{colors.on-lime}"
    typography: "{typography.code}"
    padding: "4px 7px 3px"
  env-tag:
    typography: "{typography.code}"
    padding: "3px 5px 2px"
  choice-card:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.ink}"
    typography: "{typography.choice}"
    rounded: "{rounded.card}"
    padding: "16px 18px"
  keycap:
    backgroundColor: "rgba(255, 255, 255, 0.10)"
    textColor: "{colors.ink}"
    typography: "{typography.keycap}"
    rounded: "{rounded.cap}"
    padding: "7px 10px 6px"
  footer-key:
    backgroundColor: "rgba(255, 255, 255, 0.10)"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    padding: "3px 5px 2px"
  toast-ok:
    backgroundColor: "{colors.acid-lime}"
    textColor: "{colors.on-lime}"
    rounded: "{rounded.panel}"
    padding: "8px 14px"
  toast-error:
    backgroundColor: "{colors.prod-red}"
    textColor: "{colors.on-prod}"
    rounded: "{rounded.panel}"
    padding: "8px 14px"
---

# Design System: SF Org Launcher

## Overview

**Creative North Star: "The Bitmap Specimen on Smoked Glass"**

One fixed 620×520 frameless window, always on top, floating over whatever the user was doing. The window is Windows 11 Acrylic; the panel tints it with VS Code Dark black so the desktop shows through as a dim blur. Inside, the selected org is set as a type specimen in a bitmap face, as large as its name allows, with a solid rule underneath in its environment colour. Everything else (the search bar, the identical list rows, the shortcut footer) is set small in a quiet grotesque and stays out of the way.

The system is dense and keyboard-first. Hierarchy comes from scale contrast between the pixel headline and everything else, not from colour or weight. Colour is semantic: one acid lime for focus and the primary action, one colour per Salesforce environment, and red for anything that touches production. The pixel face carries over into small codes (environment tags, keys, row serials, setting labels), the Enter glyph, the progress bar, and the tray icon, so the bitmap grid reads as the house material rather than a headline gimmick.

**Key Characteristics:**
- Smoked glass panel (74% VS Code black over Acrylic) with a 1px light edge and a fading etched dot screen at the top.
- Silkscreen bitmap for the specimen, titles, and every code or key; Hanken Grotesk for everything read.
- Every bitmap size snapped to whole multiples of 8 device pixels, re-snapped on display-scale change.
- Acid lime is reserved for focus, the primary action, and success; environment colours carry identity; production is red everywhere.
- Motion is short and stepped where it touches the pixel world (reveal, skeleton scan); everything collapses under reduced motion.

## Colors

Near-black glass, ivory ink in three strengths, one acid accent, and a small fixed set of environment colours.

### Primary
- **Acid Lime** (acid-lime): focus outlines, caret, text selection, the primary button (Open org, Save, Add org), the selected row's tint and inset ring, the active icon button, filled progress cells, success toasts. Hover lifts to acid-lime-hover. Text on lime is always on-lime.

### Secondary (environment colours)
- **Production Red** (prod-red): production and Dev Hub orgs. Ribbon fill, env tag text, the specimen name set entirely in red, the selected-row ring for production, the danger button (Remove), error text, and error toasts. Text on red is on-prod.
- **Sandbox Blue** (sandbox-blue): sandbox ribbon fill, tag text, and specimen underline.
- **Scratch Amber** (scratch-amber): scratch org ribbon fill, tag text, and specimen underline.
- Unknown orgs fall back to ink-2 for ribbon, tag, and rule.

### Neutral
- **Smoked Glass** (glass): the panel background over Acrylic.
- **VS Code Black** (glass-solid): the panel background when Windows transparency effects are off (the `no-glass` root class) or when `prefers-reduced-transparency: reduce`; Acrylic alone would turn flat grey.
- **Ivory Ink** (ink): primary text, specimen ink, alias in rows, keycap text.
- **Ivory Ink 84** (ink-2): secondary text, sub line, icons, row metadata, setting labels.
- **Ivory Ink 70** (ink-3): placeholder, row serials, the footer count.
- **Glass Edge** (edge): the panel border, the dividers under the specimen and above the footer, setting row rules, choice card ring.
- White washes at 5/7/10/13/17% build all neutral fills (cards, icon buttons, secondary buttons, keys) and their hovers.

### Named Rules
**The One Acid Rule.** Lime means "this is focused" or "this is the action". It never decorates and never labels an environment.

**The Production Is Red Everywhere Rule.** Production and Dev Hub share prod-red on every surface: ribbon, tag, specimen ink, selected-row ring. Dev Hubs live in production orgs and get the same warning; there is no separate Dev Hub colour.

**The Ribbon Per Environment Rule.** Each environment owns exactly one colour, used as ribbon fill, tag text and border, and specimen underline. Do not add a second hue for an environment or reuse an environment hue for anything else.

## Typography

**Display Font:** Silkscreen (with Courier New, monospace), weights 400 and 700 loaded
**Body Font:** Hanken Grotesk (with Segoe UI, system-ui, sans-serif), weights 500/600/700 loaded

**Character:** A crisp bitmap face on an 8-pixel grid for anything that is a name, a code, or a key; a compact, neutral grotesque with tabular numerals for anything read as a sentence.

### Hierarchy
- **Specimen** (Silkscreen 400, 48px fitted down through 40/32/24/16, line-height 1, -0.01em, uppercase): the selected org's alias. Takes the largest step that fits the width without wrapping. Rename uses the same scale as an editable field with a 2px lime underline.
- **Title** (Silkscreen 400, 32px): loading, empty, and error state headlines, plus the bitmap headline in secondary views (the hotkey itself is the Settings specimen).
- **Choice** (Silkscreen 400, 26px): Add org choices (Production, Sandbox).
- **Keycap** (Silkscreen 400, 18px): hotkey keycaps and the "+" between them.
- **Code** (Silkscreen 11px; 700 with 0.04em tracking for ribbons and env tags, 400 for footer keys, row serials, and setting labels): every short code.
- **Input** (Hanken Grotesk 600, 15px): search field and row aliases.
- **Body** (Hanken Grotesk 500, 13–14px, line-height 1.4–1.5): sub line, choice descriptions, setting values, state paragraphs (max 46ch).
- **Label** (Hanken Grotesk 600, 12px): button text; 500 12px for footer and usage counts. Key hints inside buttons sit at 62% opacity.

### Named Rules
**The Pixel Grid Rule.** Silkscreen is only ever set at a size that is a whole multiple of 8 device pixels at the current devicePixelRatio. Sizes are declared as targets in CSS px and snapped at runtime (`round(target × dpr / 8) × 8 / dpr`), and re-snapped when the window moves to a display with a different scale. Never hard-code a bitmap font size in CSS without routing it through the snapper.

**The Bitmap Means Name Or Key Rule.** Silkscreen sets names, codes, and keys only. Sentences, usernames, descriptions, and button labels stay in Hanken Grotesk.

**The One Key Notation Rule.** Shortcuts are written `Ctrl L`, `Ctrl 1-9`, `Esc` (space-separated, no plus signs), and Enter is always the pixel Enter glyph, never the ↵ character.

## Layout

A single fixed 620×520 window; there is no responsive behaviour. The panel is a vertical stack: search bar (50px), specimen block, scrolling list or view, footer (38px). The horizontal gutter is 18px throughout (search bar left, specimen, views, footer); the list insets 10px with 12px row padding. Gaps step 2 / 6 / 8 / 12px; 12px is the default between grouped blocks. Org rows are identical 40px grid rows (22px serial, alias, env tag, 44px usage) with 2px between them; nothing about a row changes size with selection. Settings use a 112px label column with 1px edge rules between rows.

## Elevation & Depth

Depth comes from the glass, not from shadows. The panel is translucent over Acrylic with a 1px light edge and a 1px inner top highlight; the OS window shadow sits behind it. Inside, surfaces are flat and separated by edge-coloured hairlines and white washes. Selection is an inset 1px ring plus a tint, never a lift.

### Shadow Vocabulary
- **Glass top highlight** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.14)`): the panel's top lip only.
- **Selection ring** (`box-shadow: inset 0 0 0 1px rgba(212,255,58,0.55)`, production `rgba(255,90,78,0.6)`): selected row and selected choice.
- **Keycap bevel** (`box-shadow: inset 0 -2px 0 rgba(0,0,0,0.35)`): hotkey keycaps only.
- **Toast lift** (`box-shadow: 0 8px 24px rgba(0,0,0,0.4)`): the one floating element.

### Named Rules
**The Glass Or Solid Rule.** The panel is glass when Windows transparency is on and solid VS Code black when it is off or reduced transparency is requested. Never let the Acrylic fallback grey show.

**The Etched Screen Rule.** A 4px dot screen at 18% opacity fades out over the top 38% of the panel. It is the only texture; it never covers content density elsewhere.

## Shapes

Small, tight radii that grow with element size: keys 4px, keycaps 6px, buttons 7px, panel/icon buttons/toast 8px, rows 9px, choice cards 12px. Everything that is part of the pixel world is square: ribbons, env tags (1px current-colour border), progress cells (12×8px), skeleton bars, and the specimen's 4px underline. The scrollbar is a 6px thumb at 18% white.

## Components

### Buttons
Compact, quiet pills that only shout when they are the action.
- **Shape:** gently rounded (7px), 28px tall, 11px side padding, 6px icon gap.
- **Primary:** acid-lime fill, on-lime text; hover acid-lime-hover.
- **Secondary:** 10% white wash, ink text; hover 17%.
- **Danger:** prod-red fill, on-prod text; hover prod-red-hover. A softer warn variant uses 18% red wash with red text.
- **Hover / Focus / Active:** 120ms background transition; active nudges down 1px; focus is a 2px lime outline at 2px offset. Disabled at 50% opacity.
- **Icon-only:** 28px square. Toolbar icon buttons are 30px, radius 8px, 7% wash, lime-tinted when their view is open.
- Key hints (pixel Enter glyph, `Ctrl L`, `Esc`) sit inside the button at 62% opacity.

### Inputs / Fields
- **Search:** borderless, transparent, Hanken 600 15px, lime caret, ink-3 placeholder, preceded by a 17px line icon.
- **Rename:** the specimen itself becomes the input at the fitted bitmap size with a 2px lime underline.

### Org Row (signature)
Identical 40px rows: serial (Silkscreen code, ink-3, 1–9 only), alias (Hanken 600 15px, ink, ellipsis), env tag (Silkscreen 700 code in its environment colour with a 1px current-colour border), usage `×n`. Selected: lime 10% tint plus inset lime ring; selected production: red 12% tint plus red ring. When the list is filtered, non-selected rows dim to 72%. Busy rows sit at 50%.

### Specimen Block (signature)
The selected alias in Silkscreen at the largest fitting step, revealed left-to-right in 90ms over 6 steps. A 4px rule in the environment colour runs under the whole name; production and Dev Hub set the name itself in red. Below: environment ribbon (solid env-colour fill, on-lime text), username, and usage; then a left-aligned action row (Open org, Copy link, then rename and remove as icon buttons at the right edge).

### Environment Ribbon and Tag
- **Ribbon:** solid fill in the environment colour, dark on-lime text, Silkscreen 700 code, square corners.
- **Tag:** environment-colour text with a 1px current-colour border, square corners. Codes: PROD, SBX, SCR, HUB (red), ?.

### Choice Card
Add org options: 12px radius, 5% wash, inset 1px edge ring, 16×18px padding; title in Silkscreen choice size, description in body. Hover 9% wash; selected gets the lime tint and ring. A 12-cell pixel progress bar (lime cells) fills while waiting for the browser login.

### Keys
- **Footer key:** Silkscreen code 400 on a 10% wash, 4px radius, followed by a 500 12px label.
- **Hotkey keycap:** Silkscreen 18px, 6px radius, 10% wash, 2px bottom bevel; recording state turns lime on a 16% lime wash.

### States and Toast
Loading, empty, and error states centre a Silkscreen title, a 46ch paragraph, and one button. Loading uses dashed skeleton bars (6px on, 2px off) pulsing in 6 steps. The toast floats 50px above the bottom, 8px radius, lime for success and red for errors, entering in 160ms.

### Icons
- **Line icons:** 24-unit viewBox, 2px stroke, round caps and joins, currentColor, drawn at 14–17px.
- **Pixel Enter glyph:** a 10×8 bitmap drawn with crisp-edge rects in currentColor; used wherever Enter is shown.
- **App and tray icon:** a 16×16 pixel Enter tile, lime arrow on VS Code black with a #3C3C3C edge, scaled by whole pixels (32px tray). The renderer and the tray share the same grid.

## Do's and Don'ts

### Do:
- **Do** route every Silkscreen size through the pixel-grid snapper and pick from the 48/40/32/24/16 steps for fitted headlines.
- **Do** colour an org by its environment only, and treat Dev Hub exactly like production.
- **Do** keep the 18px gutter and identical 40px rows; selection changes tint and ring, never size.
- **Do** fall back to solid VS Code black (#1E1E1E) whenever transparency is off or reduced.
- **Do** write shortcuts as `Ctrl X` and draw Enter with the pixel glyph.
- **Do** use stepped timing for pixel-world motion and honour reduced motion by removing all animation.

### Don't:
- **Don't** use acid lime for decoration, environment identity, or large fills beyond the primary button and success toast.
- **Don't** set sentences, usernames, or button labels in Silkscreen.
- **Don't** set Silkscreen at an unsnapped size; fractional device pixels blur the bitmap.
- **Don't** round ribbons, env tags, progress cells, or the specimen rule.
- **Don't** use the ↵ character or `Ctrl+` notation.
