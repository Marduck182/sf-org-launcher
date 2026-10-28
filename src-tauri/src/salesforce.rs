//! Salesforce integration without the CLI: reads/writes the CLI's auth files,
//! refreshes tokens over OAuth and runs the web login flow itself.

use crate::crypto::SfCrypto;
use crate::sfdx::{self, bool_field, str_field, AuthFields};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;
use serde::Serialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

/// Connected app used by the Salesforce CLI; its callback is fixed to port 1717.
const CLIENT_ID: &str = "PlatformCLI";
const OAUTH_PORT: u16 = 1717;
const SCOPES: &str = "refresh_token api web";
const API_VERSION: &str = "62.0";
const LOGIN_TIMEOUT: Duration = Duration::from_secs(5 * 60);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SfOrg {
    pub alias: String,
    pub username: String,
    pub org_id: String,
    pub instance_url: String,
    pub connected_status: String,
    pub is_default_username: bool,
    pub is_default_dev_hub_username: bool,
    pub org_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expiration_date: Option<String>,
    // Populated by the store
    pub usage_count: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_used_at: Option<u64>,
}

enum FrontdoorError {
    /// Token expired or revoked — worth refreshing and retrying
    Unauthorized,
    Other(String),
}

pub struct SalesforceService {
    http: reqwest::Client,
    cached: Mutex<Option<Vec<SfOrg>>>,
    /// username → access token obtained during this session
    tokens: Mutex<HashMap<String, String>>,
}

impl SalesforceService {
    pub fn new() -> Self {
        Self {
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .expect("failed to build HTTP client"),
            cached: Mutex::new(None),
            tokens: Mutex::new(HashMap::new()),
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    pub fn list_orgs(&self, force_refresh: bool) -> Result<Vec<SfOrg>, String> {
        if !force_refresh {
            if let Some(cached) = self.cached.lock().unwrap().as_ref() {
                return Ok(cached.clone());
            }
        }

        let auths = sfdx::read_all_auths();
        if auths.is_empty() {
            *self.cached.lock().unwrap() = Some(vec![]);
            return Ok(vec![]);
        }

        let crypto = SfCrypto::load_or_create(&sfdx::sfdx_dir())?;
        let aliases = sfdx::read_aliases();
        let (target_org, target_dev_hub) = sfdx::global_targets();
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        let mut orgs = Vec::new();
        let mut seen = std::collections::HashSet::new();

        for a in &auths {
            let username = str_field(a, "username");
            let org_id = str_field(a, "orgId");
            if org_id.is_empty() || !seen.insert(org_id.to_string()) {
                continue;
            }

            // Skip auths we can't use (corrupt, or encrypted with another key)
            let token = a.get("refreshToken").or_else(|| a.get("accessToken"));
            match token.and_then(Value::as_str) {
                Some(t) if crypto.decrypt(t).is_ok() => {}
                _ => continue,
            }

            let is_scratch = !str_field(a, "devHubUsername").is_empty() || bool_field(a, "isScratch");
            let expiration_date = a
                .get("expirationDate")
                .and_then(Value::as_str)
                .map(str::to_string);
            if is_scratch && expiration_date.as_deref().is_some_and(|d| d < today.as_str()) {
                continue;
            }

            let org_aliases = sfdx::aliases_for(&aliases, username);
            let matches = |target: &Option<String>| {
                target
                    .as_deref()
                    .is_some_and(|t| t == username || org_aliases.iter().any(|al| al == t))
            };

            let org_type = if bool_field(a, "isDevHub") {
                "devhub"
            } else if is_scratch {
                "scratch"
            } else if bool_field(a, "isSandbox") || sfdx::has_sandbox_file(org_id) {
                "sandbox"
            } else {
                "production"
            };

            orgs.push(SfOrg {
                alias: org_aliases.first().cloned().unwrap_or_else(|| username.to_string()),
                username: username.to_string(),
                org_id: org_id.to_string(),
                instance_url: str_field(a, "instanceUrl").to_string(),
                connected_status: "Connected".into(),
                is_default_username: matches(&target_org),
                is_default_dev_hub_username: matches(&target_dev_hub),
                org_type: org_type.into(),
                expiration_date: if is_scratch { expiration_date } else { None },
                usage_count: 0,
                last_used_at: None,
            });
        }

        *self.cached.lock().unwrap() = Some(orgs.clone());
        Ok(orgs)
    }

    /// Single-use frontdoor URL that logs the browser into the org.
    pub async fn get_login_url(&self, identifier: &str) -> Result<String, String> {
        let username = sfdx::resolve_username(identifier);
        let fields = sfdx::read_auth(&username)?;
        let crypto = SfCrypto::load_or_create(&sfdx::sfdx_dir())?;
        let mut instance_url = str_field(&fields, "instanceUrl").to_string();

        let cached = self.tokens.lock().unwrap().get(&username).cloned();
        let mut token = match cached {
            Some(t) => t,
            None => crypto.decrypt(str_field(&fields, "accessToken"))?,
        };

        match self.single_access_url(&instance_url, &token).await {
            Ok(url) => return Ok(url),
            Err(FrontdoorError::Other(e)) if fields.get("refreshToken").is_none() => return Err(e),
            Err(_) => {}
        }

        // Token likely expired — refresh it and try again
        (token, instance_url) = self.refresh_token(&fields, &crypto).await?;
        self.tokens.lock().unwrap().insert(username, token.clone());

        match self.single_access_url(&instance_url, &token).await {
            Ok(url) => Ok(url),
            // Orgs where single-access isn't available still accept the classic frontdoor
            Err(_) => Ok(format!(
                "{}/secur/frontdoor.jsp?sid={}",
                instance_url.trim_end_matches('/'),
                url::form_urlencoded::byte_serialize(token.as_bytes()).collect::<String>()
            )),
        }
    }

    /// Runs the OAuth web-server flow (PKCE) on localhost:1717 and saves the
    /// resulting auth file in the CLI format.
    pub async fn login_org(
        &self,
        login_url: &str,
        open_browser: impl FnOnce(&str) -> Result<(), String>,
    ) -> Result<(), String> {
        let login_url = login_url.trim_end_matches('/');
        let redirect_uri = format!("http://localhost:{OAUTH_PORT}/OauthRedirect");

        let verifier = URL_SAFE_NO_PAD.encode(random_bytes::<32>());
        let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
        let state = hex::encode(random_bytes::<6>());

        let listener = TcpListener::bind(("127.0.0.1", OAUTH_PORT)).await.map_err(|e| {
            format!("Could not listen on port {OAUTH_PORT} ({e}). Is another Salesforce login in progress?")
        })?;

        let mut auth_url = url::Url::parse(&format!("{login_url}/services/oauth2/authorize"))
            .map_err(|e| e.to_string())?;
        auth_url
            .query_pairs_mut()
            .append_pair("response_type", "code")
            .append_pair("client_id", CLIENT_ID)
            .append_pair("redirect_uri", &redirect_uri)
            .append_pair("state", &state)
            .append_pair("prompt", "login")
            .append_pair("scope", SCOPES)
            .append_pair("code_challenge", &challenge);
        open_browser(auth_url.as_str())?;

        let code = tokio::time::timeout(LOGIN_TIMEOUT, wait_for_code(&listener, &state))
            .await
            .map_err(|_| "Login timed out — no response from the browser".to_string())??;
        drop(listener);

        // Exchange the auth code for tokens
        let tokens = self
            .post_token(
                login_url,
                &[
                    ("grant_type", "authorization_code"),
                    ("code", &code),
                    ("client_id", CLIENT_ID),
                    ("redirect_uri", &redirect_uri),
                    ("code_verifier", &verifier),
                ],
            )
            .await?;

        let access_token = json_str(&tokens, "access_token")?;
        let refresh_token = json_str(&tokens, "refresh_token")?;
        let instance_url = json_str(&tokens, "instance_url")?;
        let org_id = org_id_from_id_url(tokens["id"].as_str().unwrap_or(""))?;

        let user_info = self
            .get_json(&format!("{instance_url}/services/oauth2/userinfo"), &access_token)
            .await?;
        let username = json_str(&user_info, "preferred_username")?;

        let org = self
            .get_json(
                &format!(
                    "{instance_url}/services/data/v{API_VERSION}/query?q=SELECT+Name,InstanceName,IsSandbox,TrialExpirationDate,NamespacePrefix,OrganizationType+FROM+Organization"
                ),
                &access_token,
            )
            .await
            .ok()
            .and_then(|r| r["records"].get(0).cloned())
            .unwrap_or(Value::Null);

        // A Dev Hub is any org where ScratchOrgInfo is queryable
        let is_dev_hub = self
            .get_json(
                &format!("{instance_url}/services/data/v{API_VERSION}/query?q=SELECT+Id+FROM+ScratchOrgInfo+LIMIT+1"),
                &access_token,
            )
            .await
            .is_ok();

        let crypto = SfCrypto::load_or_create(&sfdx::sfdx_dir())?;
        let fields = json!({
            "accessToken": crypto.encrypt(&access_token)?,
            "instanceUrl": instance_url,
            "orgId": org_id,
            "username": username,
            "loginUrl": login_url,
            "refreshToken": crypto.encrypt(&refresh_token)?,
            "clientId": CLIENT_ID,
            "isDevHub": is_dev_hub,
            "instanceApiVersion": API_VERSION,
            "name": org["Name"],
            "instanceName": org["InstanceName"],
            "namespacePrefix": org["NamespacePrefix"],
            "isSandbox": org["IsSandbox"].as_bool().unwrap_or(false),
            "isScratch": false,
            "trailExpirationDate": org["TrialExpirationDate"],
            "orgEdition": org["OrganizationType"],
        });

        sfdx::write_auth(fields.as_object().unwrap())?;
        self.tokens.lock().unwrap().insert(username, access_token);
        self.invalidate();
        Ok(())
    }

    pub fn remove_org(&self, username: &str) -> Result<(), String> {
        sfdx::remove_aliases_for(username)?;
        sfdx::delete_auth(username)?;
        self.tokens.lock().unwrap().remove(username);
        self.invalidate();
        Ok(())
    }

    pub fn rename_org(&self, username: &str, new_alias: &str) -> Result<(), String> {
        sfdx::set_alias(new_alias, username)?;
        self.invalidate();
        Ok(())
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    fn invalidate(&self) {
        *self.cached.lock().unwrap() = None;
    }

    async fn single_access_url(&self, instance_url: &str, token: &str) -> Result<String, FrontdoorError> {
        let res = self
            .http
            .get(format!("{}/services/oauth2/singleaccess", instance_url.trim_end_matches('/')))
            .bearer_auth(token)
            .send()
            .await
            .map_err(|e| FrontdoorError::Other(e.to_string()))?;

        let status = res.status();
        if status == 401 || status == 403 {
            return Err(FrontdoorError::Unauthorized);
        }
        let body: Value = res.json().await.map_err(|e| FrontdoorError::Other(e.to_string()))?;
        match body["frontdoor_uri"].as_str() {
            Some(uri) if status.is_success() => Ok(uri.to_string()),
            _ => Err(FrontdoorError::Other(format!("Failed to generate a frontdoor URL ({status})"))),
        }
    }

    /// Returns `(access_token, instance_url)`.
    async fn refresh_token(&self, fields: &AuthFields, crypto: &SfCrypto) -> Result<(String, String), String> {
        let refresh = crypto.decrypt(str_field(fields, "refreshToken"))?;
        let client_id = match str_field(fields, "clientId") {
            "" => CLIENT_ID,
            id => id,
        };
        let client_secret = match fields.get("clientSecret").and_then(Value::as_str) {
            Some(s) if !s.is_empty() => crypto.decrypt(s).unwrap_or_default(),
            _ => String::new(),
        };

        let mut params = vec![
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh.as_str()),
            ("client_id", client_id),
        ];
        if !client_secret.is_empty() {
            params.push(("client_secret", client_secret.as_str()));
        }

        // Same as the CLI: refresh against the login URL, falling back to the instance
        let instance_url = str_field(fields, "instanceUrl");
        let mut hosts = vec![str_field(fields, "loginUrl"), instance_url];
        hosts.retain(|h| !h.is_empty());
        hosts.dedup();

        let mut last_err = String::from("No login URL in the auth file");
        for host in hosts {
            match self.post_token(host.trim_end_matches('/'), &params).await {
                Ok(res) => {
                    let token = json_str(&res, "access_token")?;
                    let instance = res["instance_url"].as_str().unwrap_or(instance_url).to_string();
                    return Ok((token, instance));
                }
                Err(e) => last_err = e,
            }
        }
        Err(format!("Error authenticating with the refresh token: {last_err}"))
    }

    async fn post_token(&self, base_url: &str, params: &[(&str, &str)]) -> Result<Value, String> {
        let res = self
            .http
            .post(format!("{base_url}/services/oauth2/token"))
            .form(params)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let status = res.status();
        let body: Value = res.json().await.map_err(|e| e.to_string())?;
        if status.is_success() {
            Ok(body)
        } else {
            Err(oauth_error(&body, status))
        }
    }

    async fn get_json(&self, url: &str, token: &str) -> Result<Value, String> {
        let res = self.http.get(url).bearer_auth(token).send().await.map_err(|e| e.to_string())?;
        let status = res.status();
        let body: Value = res.json().await.map_err(|e| e.to_string())?;
        if status.is_success() {
            Ok(body)
        } else {
            Err(oauth_error(&body, status))
        }
    }
}

// ── OAuth callback server ────────────────────────────────────────────────────

async fn wait_for_code(listener: &TcpListener, expected_state: &str) -> Result<String, String> {
    loop {
        let (mut stream, _) = listener.accept().await.map_err(|e| e.to_string())?;

        let mut buf = vec![0u8; 8192];
        let mut len = 0;
        while len < buf.len() {
            let n = stream.read(&mut buf[len..]).await.unwrap_or(0);
            if n == 0 {
                break;
            }
            len += n;
            if buf[..len].windows(4).any(|w| w == b"\r\n\r\n") {
                break;
            }
        }
        let request = String::from_utf8_lossy(&buf[..len]);
        let path = request.split_whitespace().nth(1).unwrap_or("/");

        let Ok(url) = url::Url::parse(&format!("http://localhost{path}")) else { continue };
        if !url.path().starts_with("/OauthRedirect") {
            let _ = respond(&mut stream, "404 Not Found", "Not found").await;
            continue;
        }

        let query: HashMap<String, String> = url.query_pairs().into_owned().collect();
        if query.get("state").map(String::as_str) != Some(expected_state) {
            let _ = respond(&mut stream, "400 Bad Request", "Invalid state parameter").await;
            continue;
        }

        if let Some(error) = query.get("error") {
            let desc = query.get("error_description").unwrap_or(error);
            let _ = respond(&mut stream, "200 OK", &page("Authentication failed", desc)).await;
            return Err(format!("Salesforce login failed: {desc}"));
        }

        if let Some(code) = query.get("code") {
            let _ = respond(
                &mut stream,
                "200 OK",
                &page("Authentication successful", "You can close this tab and return to SF Org Launcher."),
            )
            .await;
            return Ok(code.clone());
        }
    }
}

async fn respond(stream: &mut tokio::net::TcpStream, status: &str, body: &str) -> std::io::Result<()> {
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(response.as_bytes()).await?;
    stream.shutdown().await
}

fn page(title: &str, message: &str) -> String {
    let esc = |s: &str| s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
    format!(
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>{t}</title></head>\
         <body style=\"font-family:Segoe UI,system-ui,sans-serif;background:#1e1e2e;color:#cdd6f4;\
         display:flex;align-items:center;justify-content:center;height:100vh;margin:0\">\
         <div style=\"text-align:center\"><h2>{t}</h2><p style=\"color:#a6adc8\">{m}</p></div></body></html>",
        t = esc(title),
        m = esc(message)
    )
}

// ── Small utilities ───────────────────────────────────────────────────────────

fn random_bytes<const N: usize>() -> [u8; N] {
    let mut buf = [0u8; N];
    rand::thread_rng().fill_bytes(&mut buf);
    buf
}

fn json_str(v: &Value, key: &str) -> Result<String, String> {
    v[key]
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| format!("Salesforce response is missing \"{key}\""))
}

/// `https://login.salesforce.com/id/<orgId>/<userId>` → `<orgId>`
fn org_id_from_id_url(id_url: &str) -> Result<String, String> {
    let parts: Vec<&str> = id_url.trim_end_matches('/').rsplit('/').collect();
    match parts.as_slice() {
        [_user, org, ..] if !org.is_empty() => Ok(org.to_string()),
        _ => Err("Could not determine the org ID from the OAuth response".into()),
    }
}

fn oauth_error(body: &Value, status: reqwest::StatusCode) -> String {
    let first = body.get(0).unwrap_or(body);
    first["error_description"]
        .as_str()
        .or_else(|| first["message"].as_str())
        .or_else(|| first["error"].as_str())
        .map(str::to_string)
        .unwrap_or_else(|| format!("HTTP {status}"))
}

#[cfg(test)]
mod live_tests {
    use super::*;

    // Hits the real ~/.sfdx files and Salesforce: `cargo test -- --ignored`
    #[tokio::test]
    #[ignore]
    async fn lists_and_opens_real_orgs() {
        let sf = SalesforceService::new();
        let orgs = sf.list_orgs(true).unwrap();
        for o in &orgs {
            println!("{:<22} {:<10} default={}", o.alias, o.org_type, o.is_default_username);
        }
        assert!(!orgs.is_empty());
        let url = sf.get_login_url(&orgs[0].alias).await.unwrap();
        println!("login url host: {}", url::Url::parse(&url).unwrap().host_str().unwrap());
    }
}
