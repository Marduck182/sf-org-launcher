// Hide the console window in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod crypto;
mod salesforce;
mod sfdx;
mod store;
mod tray;

use salesforce::{SalesforceService, SfOrg};
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use store::Store;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, State, WebviewWindow, WindowEvent};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_opener::OpenerExt;

pub struct AppState {
    pub store: Mutex<Store>,
    sf: SalesforceService,
    /// When the window was last hidden because it lost focus
    last_blur_hide: Mutex<Option<Instant>>,
    /// A native file dialog is open — don't auto-hide on blur
    dialog_open: AtomicBool,
}

type CmdResult<T = ()> = Result<T, String>;

// ── Window ────────────────────────────────────────────────────────────────────

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

/// Centred on the display where the cursor is, 18 % from the top.
fn position_window(win: &WebviewWindow) {
    let Ok(cursor) = win.cursor_position() else { return };
    let monitor = win
        .monitor_from_point(cursor.x, cursor.y)
        .ok()
        .flatten()
        .or_else(|| win.primary_monitor().ok().flatten());
    let (Some(monitor), Ok(size)) = (monitor, win.outer_size()) else { return };

    let area = monitor.work_area();
    let x = area.position.x + (area.size.width as i32 - size.width as i32) / 2;
    let y = area.position.y + (area.size.height as f64 * 0.18) as i32;
    let _ = win.set_position(PhysicalPosition::new(x, y));
}

pub fn toggle_window(app: &AppHandle) {
    let Some(win) = main_window(app) else { return };

    if win.is_visible().unwrap_or(false) {
        let _ = win.hide();
        return;
    }

    // Clicking the tray icon blurs (and hides) the window just before the click
    // arrives — don't immediately re-open it in that case.
    let state = app.state::<AppState>();
    let recently_hidden = state
        .last_blur_hide
        .lock()
        .unwrap()
        .is_some_and(|t| t.elapsed() < Duration::from_millis(300));
    if recently_hidden {
        return;
    }

    position_window(&win);
    let _ = win.show();
    let _ = win.set_focus();
    // Tell the renderer to reset its state
    let _ = win.emit("window:show", ());
}

fn setup_window(app: &AppHandle) {
    let Some(win) = main_window(app) else { return };
    let handle = app.clone();

    win.on_window_event(move |event| match event {
        // Auto-hide when the window loses focus (click outside)
        WindowEvent::Focused(false) => {
            let state = handle.state::<AppState>();
            if state.dialog_open.load(Ordering::SeqCst) {
                return;
            }
            if let Some(w) = main_window(&handle) {
                let _ = w.hide();
            }
            *state.last_blur_hide.lock().unwrap() = Some(Instant::now());
        }
        // Hide instead of close when the OS tries to close it
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            if let Some(w) = main_window(&handle) {
                let _ = w.hide();
            }
        }
        _ => {}
    });
}

// ── Hotkey ────────────────────────────────────────────────────────────────────

/// Electron-style accelerator (what the settings UI records) → global-hotkey syntax.
fn to_shortcut(accelerator: &str) -> String {
    accelerator
        .split('+')
        .map(|part| match part {
            "CommandOrControl" | "CmdOrCtrl" => "Control",
            "Return" => "Enter",
            "Plus" => "Equal",
            "numsub" => "Minus",
            "Up" => "ArrowUp",
            "Down" => "ArrowDown",
            "Left" => "ArrowLeft",
            "Right" => "ArrowRight",
            other => other,
        })
        .collect::<Vec<_>>()
        .join("+")
}

fn register_hotkey(app: &AppHandle, accelerator: &str) -> CmdResult {
    app.global_shortcut()
        .register(to_shortcut(accelerator).as_str())
        .map_err(|e| e.to_string())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn with_usage(state: &AppState, orgs: Vec<SfOrg>) -> Vec<SfOrg> {
    let store = state.store.lock().unwrap();
    let usage = store.usage();
    let mut orgs: Vec<SfOrg> = orgs
        .into_iter()
        .map(|mut org| {
            if let Some(u) = usage.get(&org.org_id) {
                org.usage_count = u.count;
                org.last_used_at = Some(u.last_used);
            }
            org
        })
        .collect();
    orgs.sort_by(|a, b| {
        b.usage_count
            .cmp(&a.usage_count)
            .then_with(|| a.alias.to_lowercase().cmp(&b.alias.to_lowercase()))
    });
    orgs
}

/// Re-reads the orgs and pushes them to the renderer.
fn refresh_and_emit(app: &AppHandle, state: &AppState) -> CmdResult<Vec<SfOrg>> {
    let data = with_usage(state, state.sf.list_orgs(true)?);
    let _ = app.emit("orgs:refreshed", &data);
    Ok(data)
}

fn open_dialog<T>(state: &AppState, f: impl FnOnce() -> T) -> T {
    state.dialog_open.store(true, Ordering::SeqCst);
    let result = f();
    state.dialog_open.store(false, Ordering::SeqCst);
    result
}

// ── Commands: orgs ────────────────────────────────────────────────────────────

#[tauri::command]
async fn list_orgs(state: State<'_, AppState>) -> CmdResult<Vec<SfOrg>> {
    Ok(with_usage(&state, state.sf.list_orgs(false)?))
}

#[tauri::command]
async fn refresh_orgs(app: AppHandle, state: State<'_, AppState>) -> CmdResult<Vec<SfOrg>> {
    refresh_and_emit(&app, &state)
}

#[tauri::command]
async fn open_org(app: AppHandle, state: State<'_, AppState>, identifier: String) -> CmdResult {
    let url = state.sf.get_login_url(&identifier).await?;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_org_link(state: State<'_, AppState>, identifier: String) -> CmdResult<String> {
    state.sf.get_login_url(&identifier).await
}

#[tauri::command]
async fn copy_org_link(app: AppHandle, state: State<'_, AppState>, identifier: String) -> CmdResult {
    let url = state.sf.get_login_url(&identifier).await?;
    app.clipboard().write_text(url).map_err(|e| e.to_string())
}

#[tauri::command]
async fn increment_usage(state: State<'_, AppState>, org_id: String) -> CmdResult {
    state.store.lock().unwrap().increment_usage(&org_id)
}

#[tauri::command]
async fn login_org(app: AppHandle, state: State<'_, AppState>, login_url: String) -> CmdResult {
    let opener = app.clone();
    state
        .sf
        .login_org(&login_url, move |url| {
            opener.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
        })
        .await?;
    refresh_and_emit(&app, &state).map(|_| ())
}

#[tauri::command]
async fn remove_org(app: AppHandle, state: State<'_, AppState>, username: String) -> CmdResult {
    state.sf.remove_org(&username)?;
    refresh_and_emit(&app, &state).map(|_| ())
}

#[tauri::command]
async fn rename_org(
    app: AppHandle,
    state: State<'_, AppState>,
    username: String,
    new_alias: String,
) -> CmdResult {
    state.sf.rename_org(&username, &new_alias)?;
    refresh_and_emit(&app, &state).map(|_| ())
}

// ── Commands: settings ────────────────────────────────────────────────────────

#[tauri::command]
fn get_hotkey(state: State<'_, AppState>) -> String {
    state.store.lock().unwrap().hotkey()
}

#[tauri::command]
fn set_hotkey(app: AppHandle, state: State<'_, AppState>, hotkey: String) -> CmdResult {
    let prev = state.store.lock().unwrap().hotkey();
    let _ = app.global_shortcut().unregister_all();

    if let Err(e) = register_hotkey(&app, &hotkey) {
        // Re-register old hotkey on failure
        let _ = register_hotkey(&app, &prev);
        return Err(format!(
            "Could not register \"{hotkey}\". It may be in use by another application. ({e})"
        ));
    }
    state.store.lock().unwrap().set_hotkey(&hotkey)
}

#[tauri::command]
async fn set_tray_icon(app: AppHandle, state: State<'_, AppState>) -> CmdResult<String> {
    let picked = open_dialog(&state, || {
        let mut dialog = app
            .dialog()
            .file()
            .set_title("Select Tray Icon")
            .add_filter("Images", &["png", "ico", "jpg", "jpeg"]);
        if let Some(win) = main_window(&app) {
            dialog = dialog.set_parent(&win);
        }
        dialog.blocking_pick_file()
    });
    let src = picked
        .ok_or("Cancelled")?
        .into_path()
        .map_err(|e| e.to_string())?;

    // Copy to the app data dir so it persists
    let icons_dir = store::data_dir().join("icons");
    fs::create_dir_all(&icons_dir).map_err(|e| e.to_string())?;
    let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("png");
    let dest = icons_dir.join(format!("tray-icon.{ext}"));
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;

    let dest = dest.to_string_lossy().to_string();
    state.store.lock().unwrap().set_tray_icon_path(Some(dest.clone()))?;
    tray::update_tray_icon(&app);
    Ok(dest)
}

#[tauri::command]
fn get_tray_icon(state: State<'_, AppState>) -> Option<String> {
    state.store.lock().unwrap().tray_icon_path()
}

#[tauri::command]
fn reset_tray_icon(app: AppHandle, state: State<'_, AppState>) -> CmdResult {
    state.store.lock().unwrap().set_tray_icon_path(None)?;
    tray::update_tray_icon(&app);
    Ok(())
}

// ── Commands: export / import ─────────────────────────────────────────────────

#[tauri::command]
async fn export_data(app: AppHandle, state: State<'_, AppState>) -> CmdResult {
    let picked = open_dialog(&state, || {
        let mut dialog = app
            .dialog()
            .file()
            .set_title("Export SF Org Launcher Data")
            .set_file_name("sf-org-launcher-backup.json")
            .add_filter("JSON", &["json"]);
        if let Some(win) = main_window(&app) {
            dialog = dialog.set_parent(&win);
        }
        dialog.blocking_save_file()
    });
    let path = picked.ok_or("Cancelled")?.into_path().map_err(|e| e.to_string())?;
    let data = state.store.lock().unwrap().export_data();
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
async fn import_data(app: AppHandle, state: State<'_, AppState>) -> CmdResult {
    let picked = open_dialog(&state, || {
        let mut dialog = app
            .dialog()
            .file()
            .set_title("Import SF Org Launcher Data")
            .add_filter("JSON", &["json"]);
        if let Some(win) = main_window(&app) {
            dialog = dialog.set_parent(&win);
        }
        dialog.blocking_pick_file()
    });
    let path = picked.ok_or("Cancelled")?.into_path().map_err(|e| e.to_string())?;
    let raw = fs::read_to_string(Path::new(&path)).map_err(|e| e.to_string())?;
    state.store.lock().unwrap().import_data(&raw)?;

    // The imported file may carry a different hotkey
    let hotkey = state.store.lock().unwrap().hotkey();
    let _ = app.global_shortcut().unregister_all();
    let _ = register_hotkey(&app, &hotkey);

    // Refresh orgs to reflect imported usage data
    refresh_and_emit(&app, &state).map(|_| ())
}

/// Windows "Transparency effects" setting; when off, Acrylic renders as opaque grey.
#[tauri::command]
fn transparency_enabled() -> bool {
    #[cfg(windows)]
    {
        use winreg::enums::HKEY_CURRENT_USER;
        winreg::RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")
            .and_then(|key| key.get_value::<u32, _>("EnableTransparency"))
            .map(|v| v != 0)
            .unwrap_or(true)
    }
    #[cfg(not(windows))]
    {
        true
    }
}

#[tauri::command]
fn hide_window(app: AppHandle) {
    if let Some(win) = main_window(&app) {
        let _ = win.hide();
    }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        // Must be first: a second launch toggles the existing palette instead
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| toggle_window(app)))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_window(app);
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            store: Mutex::new(Store::new()),
            sf: SalesforceService::new(),
            last_blur_hide: Mutex::new(None),
            dialog_open: AtomicBool::new(false),
        })
        .setup(|app| {
            let handle = app.handle().clone();
            setup_window(&handle);
            tray::setup_tray(&handle)?;

            // Global shortcut: stored hotkey (defaults to Ctrl+Shift+S)
            let hotkey = handle.state::<AppState>().store.lock().unwrap().hotkey();
            if let Err(e) = register_hotkey(&handle, &hotkey) {
                eprintln!("Could not register hotkey {hotkey}: {e}");
            }

            // Warm-up: load orgs in the background so the first open is instant
            let warm = handle.clone();
            std::thread::spawn(move || {
                let _ = warm.state::<AppState>().sf.list_orgs(false);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_orgs,
            refresh_orgs,
            open_org,
            get_org_link,
            copy_org_link,
            increment_usage,
            login_org,
            remove_org,
            rename_org,
            get_hotkey,
            set_hotkey,
            set_tray_icon,
            get_tray_icon,
            reset_tray_icon,
            export_data,
            import_data,
            transparency_enabled,
            hide_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SF Org Launcher");
}
