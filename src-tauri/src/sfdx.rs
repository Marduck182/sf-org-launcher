//! Reads and writes the same local state files the Salesforce CLI uses:
//!
//! - `~/.sfdx/<username>.json`   one auth file per org (tokens encrypted)
//! - `~/.sfdx/alias.json`        `{ "orgs": { "<alias>": "<username>" } }`
//! - `~/.sfdx/<orgId>.sandbox.json` marks an org as a sandbox
//! - `~/.sf/config.json`         global config (`target-org`, `target-dev-hub`)

use serde_json::{Map, Value};
use std::fs;
use std::path::PathBuf;

pub type AuthFields = Map<String, Value>;

pub fn sfdx_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_default().join(".sfdx")
}

fn sf_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_default().join(".sf")
}

fn auth_path(username: &str) -> PathBuf {
    sfdx_dir().join(format!("{username}.json"))
}

fn read_json(path: &PathBuf) -> Option<Value> {
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

// ── Auth files ────────────────────────────────────────────────────────────────

/// Every `<username>.json` in `~/.sfdx`, sorted by username.
pub fn read_all_auths() -> Vec<AuthFields> {
    let Ok(entries) = fs::read_dir(sfdx_dir()) else { return vec![] };

    let mut auths: Vec<AuthFields> = entries
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            let username = name.strip_suffix(".json")?;
            // Usernames always contain '@'; this skips key.json, alias.json, etc.
            if !username.contains('@') {
                return None;
            }
            match read_json(&entry.path())? {
                Value::Object(map) if map.get("username").is_some() => Some(map),
                _ => None,
            }
        })
        .collect();

    auths.sort_by(|a, b| str_field(a, "username").cmp(str_field(b, "username")));
    auths
}

pub fn read_auth(username: &str) -> Result<AuthFields, String> {
    match read_json(&auth_path(username)) {
        Some(Value::Object(map)) => Ok(map),
        _ => Err(format!("No authorization information found for {username}")),
    }
}

pub fn write_auth(fields: &AuthFields) -> Result<(), String> {
    let username = str_field(fields, "username");
    if username.is_empty() {
        return Err("Cannot save an auth file without a username".into());
    }
    fs::create_dir_all(sfdx_dir()).map_err(|e| e.to_string())?;
    let body = serde_json::to_string_pretty(fields).map_err(|e| e.to_string())?;
    fs::write(auth_path(username), body).map_err(|e| e.to_string())
}

pub fn delete_auth(username: &str) -> Result<(), String> {
    let path = auth_path(username);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn has_sandbox_file(org_id: &str) -> bool {
    !org_id.is_empty() && sfdx_dir().join(format!("{org_id}.sandbox.json")).exists()
}

pub fn str_field<'a>(fields: &'a AuthFields, key: &str) -> &'a str {
    fields.get(key).and_then(Value::as_str).unwrap_or("")
}

pub fn bool_field(fields: &AuthFields, key: &str) -> bool {
    fields.get(key).and_then(Value::as_bool).unwrap_or(false)
}

// ── Aliases ───────────────────────────────────────────────────────────────────

fn alias_path() -> PathBuf {
    sfdx_dir().join("alias.json")
}

/// alias → username
pub fn read_aliases() -> Map<String, Value> {
    read_json(&alias_path())
        .and_then(|v| v.get("orgs").and_then(Value::as_object).cloned())
        .unwrap_or_default()
}

fn write_aliases(aliases: Map<String, Value>) -> Result<(), String> {
    let mut root = match read_json(&alias_path()) {
        Some(Value::Object(map)) => map,
        _ => Map::new(),
    };
    root.insert("orgs".into(), Value::Object(aliases));
    fs::create_dir_all(sfdx_dir()).map_err(|e| e.to_string())?;
    fs::write(alias_path(), Value::Object(root).to_string()).map_err(|e| e.to_string())
}

pub fn aliases_for(aliases: &Map<String, Value>, username: &str) -> Vec<String> {
    aliases
        .iter()
        .filter(|(_, v)| v.as_str() == Some(username))
        .map(|(k, _)| k.clone())
        .collect()
}

/// Accepts an alias or a username and returns the username.
pub fn resolve_username(identifier: &str) -> String {
    read_aliases()
        .get(identifier)
        .and_then(Value::as_str)
        .unwrap_or(identifier)
        .to_string()
}

pub fn remove_aliases_for(username: &str) -> Result<(), String> {
    let mut aliases = read_aliases();
    let before = aliases.len();
    aliases.retain(|_, v| v.as_str() != Some(username));
    if aliases.len() != before {
        write_aliases(aliases)?;
    }
    Ok(())
}

pub fn set_alias(alias: &str, username: &str) -> Result<(), String> {
    let mut aliases = read_aliases();
    aliases.retain(|_, v| v.as_str() != Some(username));
    aliases.insert(alias.to_string(), Value::String(username.to_string()));
    write_aliases(aliases)
}

// ── Global config ─────────────────────────────────────────────────────────────

/// Returns the global `(target-org, target-dev-hub)` values, if set.
pub fn global_targets() -> (Option<String>, Option<String>) {
    let get = |cfg: &Option<Value>, key: &str| {
        cfg.as_ref()
            .and_then(|c| c.get(key))
            .and_then(Value::as_str)
            .map(str::to_string)
    };

    let sf = read_json(&sf_dir().join("config.json"));
    let legacy = read_json(&sfdx_dir().join("sfdx-config.json"));

    (
        get(&sf, "target-org").or_else(|| get(&legacy, "defaultusername")),
        get(&sf, "target-dev-hub").or_else(|| get(&legacy, "defaultdevhubusername")),
    )
}
