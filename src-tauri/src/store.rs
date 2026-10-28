//! Usage counts and settings, persisted as JSON.
//!
//! Uses the same location as the Electron build (`%APPDATA%\sf-org-launcher`)
//! so existing usage stats and settings carry over.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub const DEFAULT_HOTKEY: &str = "CommandOrControl+Shift+S";

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct UsageEntry {
    pub count: u64,
    pub last_used: u64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoreData {
    #[serde(default)]
    pub usage: HashMap<String, UsageEntry>,
    #[serde(default)]
    pub hotkey: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tray_icon_path: Option<String>,
}

pub struct Store {
    file_path: PathBuf,
    data: StoreData,
}

pub fn data_dir() -> PathBuf {
    dirs::config_dir().unwrap_or_default().join("sf-org-launcher")
}

impl Store {
    pub fn new() -> Self {
        let dir = data_dir();
        let _ = fs::create_dir_all(&dir);
        let file_path = dir.join("sf-org-launcher-store.json");

        // Corrupted or missing store — start fresh
        let data = fs::read_to_string(&file_path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or(StoreData {
                usage: HashMap::new(),
                hotkey: DEFAULT_HOTKEY.into(),
                tray_icon_path: None,
            });

        Self { file_path, data }
    }

    fn save(&self) -> Result<(), String> {
        fs::write(&self.file_path, self.export_data()).map_err(|e| e.to_string())
    }

    pub fn usage(&self) -> &HashMap<String, UsageEntry> {
        &self.data.usage
    }

    pub fn increment_usage(&mut self, org_id: &str) -> Result<(), String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        let entry = self.data.usage.entry(org_id.to_string()).or_default();
        entry.count += 1;
        entry.last_used = now;
        self.save()
    }

    pub fn hotkey(&self) -> String {
        if self.data.hotkey.is_empty() {
            DEFAULT_HOTKEY.into()
        } else {
            self.data.hotkey.clone()
        }
    }

    pub fn set_hotkey(&mut self, hotkey: &str) -> Result<(), String> {
        self.data.hotkey = hotkey.to_string();
        self.save()
    }

    pub fn tray_icon_path(&self) -> Option<String> {
        self.data.tray_icon_path.clone()
    }

    pub fn set_tray_icon_path(&mut self, path: Option<String>) -> Result<(), String> {
        self.data.tray_icon_path = path;
        self.save()
    }

    pub fn export_data(&self) -> String {
        serde_json::to_string_pretty(&self.data).unwrap_or_default()
    }

    pub fn import_data(&mut self, raw: &str) -> Result<(), String> {
        let parsed: serde_json::Value =
            serde_json::from_str(raw).map_err(|_| "Invalid store file format".to_string())?;
        if !parsed.get("usage").is_some_and(|u| u.is_object()) {
            return Err("Invalid store file format".into());
        }
        let mut data: StoreData =
            serde_json::from_value(parsed).map_err(|_| "Invalid store file format".to_string())?;
        if data.hotkey.is_empty() {
            data.hotkey = DEFAULT_HOTKEY.into();
        }
        self.data = data;
        self.save()
    }
}
