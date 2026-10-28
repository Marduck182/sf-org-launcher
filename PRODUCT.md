# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Rendered in a Tauri 2 WebView2 window on Windows: a frameless, transparent, always-on-top 620×520 palette summoned from the system tray or a global hotkey. Not a website; no responsive/mobile surface.)

## Users

One person: a Salesforce developer/consultant (the author) who juggles roughly 5–15 authenticated orgs across clients — mostly sandboxes per client project, plus a Dev Hub / production org. They summon the launcher dozens of times a day mid-task, pick an org, and get back to work.

## Product Purpose

Get into the right Salesforce org in under two seconds without a terminal. Success is: hotkey → type two letters → Enter → the org is open in the browser, with zero doubt about *which* org (client, environment) is about to open.

## Positioning

A tray-resident launcher that talks to Salesforce directly (reads and writes the CLI's own `~/.sfdx` auth store, same encryption) so it works with or without the `sf` CLI installed, and learns which orgs you use most.

## Operating Context

- Summoned over whatever the user is doing (IDE, browser, Teams); dismissed on blur or Esc.
- Keyboard-first: ↑/↓, Enter to open, Ctrl+L copy single-use login link, Ctrl+E rename alias, Ctrl+D remove, Ctrl+R refresh.
- Orgs sorted by personal usage count.
- Corporate Windows laptop; Windows 11.

## Capabilities and Constraints

- Org list: alias (or username), username, org type (production, sandbox, scratch, devhub), instance URL, default-org flags, scratch expiration date, usage count.
- Actions: open org in browser, copy login link, rename alias, remove local auth, refresh list.
- Add org: OAuth web login against login.salesforce.com (production/developer) or test.salesforce.com (sandbox); waits for the browser round-trip.
- Settings: global hotkey recorder, export/import usage data (JSON), custom tray icon (or default).
- Fixed window size 620×520, transparent frameless window; the panel itself must carry its own background and shape.
- Tray icon renders at 16×16 (and 32×32 on high-DPI); the app icon is also used by the installer and taskbar-less window.
- No client names, logos or real org data may be invented for public material; demonstration data in mockups must be labeled synthetic.

## Brand Commitments

- Name: "SF Org Launcher".
- Must not imitate Salesforce's official branding (logo, Salesforce cloud mark) — it is an unofficial personal tool.
- Mixed UI language today (English UI with a few Spanish strings); the user communicates in Spanish. Undecided: final UI language.

## Evidence on Hand

- Real usage scene: the author's own ~6 orgs (several sandboxes across two clients and one Dev Hub). Not to be published.
- No testimonials, metrics or external users.

## Product Principles

1. Speed over ceremony: every screen must be operable from the keyboard in one or two keystrokes.
2. Never open the wrong org: environment (prod vs sandbox) and client must be unmistakable at a glance.
3. Quiet when idle, precise when summoned: it lives in the tray and should feel like part of Windows, not a separate app.
4. Works with nothing else installed.
