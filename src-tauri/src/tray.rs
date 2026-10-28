use crate::AppState;
use std::path::Path;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

const TRAY_ID: &str = "main";
const ICON_SIZE: u32 = 32;

/// 16×16 pixel-art ↵ tile (same grid as `PIXEL_ICON` in the renderer's icons.tsx).
const PIXEL_ICON: [&str; 16] = [
    "..eeeeeeeeeeee..",
    ".ekkkkkkkkkkkke.",
    "ekkkkkkkkkkkkkke",
    "ekkkkkkkkkkkkkke",
    "ekkkkkkkkkkllkke",
    "ekkkkkkkkkkllkke",
    "ekkkklkkkkkllkke",
    "ekkkllkkkkkllkke",
    "ekkllllllllllkke",
    "ekkllllllllllkke",
    "ekkkllkkkkkkkkke",
    "ekkkklkkkkkkkkke",
    "ekkkkkkkkkkkkkke",
    "ekkkkkkkkkkkkkke",
    ".ekkkkkkkkkkkke.",
    "..eeeeeeeeeeee..",
];

/// The pixel icon scaled by whole pixels (2× → 32px) so it stays crisp.
fn default_icon() -> Image<'static> {
    let size = ICON_SIZE as usize;
    let scale = size / 16;
    let mut buf = vec![0u8; size * size * 4]; // RGBA

    for (py, row) in PIXEL_ICON.iter().enumerate() {
        for (px, ch) in row.chars().enumerate() {
            let rgba: [u8; 4] = match ch {
                'e' => [0x3C, 0x3C, 0x3C, 255], // edge
                'k' => [0x1E, 0x1E, 0x1E, 255], // VS Code black
                'l' => [0xD4, 0xFF, 0x3A, 255], // acid lime
                _ => continue,
            };
            for dy in 0..scale {
                for dx in 0..scale {
                    let i = ((py * scale + dy) * size + px * scale + dx) * 4;
                    buf[i..i + 4].copy_from_slice(&rgba);
                }
            }
        }
    }
    Image::new_owned(buf, ICON_SIZE, ICON_SIZE)
}

fn load_custom_icon(path: &str) -> Option<Image<'static>> {
    if !Path::new(path).exists() {
        return None;
    }
    let img = image::open(path).ok()?;
    let rgba = img
        .resize_exact(ICON_SIZE, ICON_SIZE, image::imageops::FilterType::Lanczos3)
        .to_rgba8();
    Some(Image::new_owned(rgba.into_raw(), ICON_SIZE, ICON_SIZE))
}

fn load_icon(app: &AppHandle) -> Image<'static> {
    let state = app.state::<AppState>();
    let custom = state.store.lock().unwrap().tray_icon_path();
    custom
        .as_deref()
        .and_then(load_custom_icon)
        .unwrap_or_else(default_icon)
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle = MenuItem::with_id(app, "toggle", "Show / Hide", true, None::<&str>)?;
    let refresh = MenuItem::with_id(app, "refresh", "Refresh Orgs", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Finalizar aplicación", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &refresh, &separator, &quit])?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(load_icon(app))
        .tooltip("SF Org Launcher\nClick to toggle")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle" => crate::toggle_window(app),
            "refresh" => {
                let _ = app.emit("orgs:forceRefresh", ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        // Left-click → show / hide the palette
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                crate::toggle_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

pub fn update_tray_icon(app: &AppHandle) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_icon(Some(load_icon(app)));
    }
}
