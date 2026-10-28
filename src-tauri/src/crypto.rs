//! Port of `@salesforce/core` Crypto (generic Windows keychain).
//!
//! The key lives in `~/.sfdx/key.json`. Encrypted values look like
//! `<iv-hex><ciphertext-hex>:<tag-hex>` using AES-256-GCM.
//!
//! - v1 (32-char key): the key's UTF-8 bytes are the AES key and the IV is the
//!   UTF-8 bytes of a 12-char hex string (6 random bytes).
//! - v2 (64-char key): the key is hex-decoded and the IV is 12 hex-decoded bytes.

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use rand::RngCore;
use serde_json::json;
use std::fs;
use std::path::Path;

const SERVICE: &str = "sfdx";
const ACCOUNT: &str = "local";

pub struct SfCrypto {
    cipher: Aes256Gcm,
    v2: bool,
}

impl SfCrypto {
    /// Loads the key from `key.json`, creating a v1 key (same as `sf` does by
    /// default) if none exists yet, so `sf` can read what we write and vice versa.
    pub fn load_or_create(sfdx_dir: &Path) -> Result<Self, String> {
        let key_file = sfdx_dir.join("key.json");

        let key = if key_file.exists() {
            let raw = fs::read_to_string(&key_file)
                .map_err(|e| format!("Could not read {}: {e}", key_file.display()))?;
            let parsed: serde_json::Value = serde_json::from_str(&raw)
                .map_err(|e| format!("Invalid {}: {e}", key_file.display()))?;
            if parsed["service"] != SERVICE || parsed["account"] != ACCOUNT {
                return Err(format!("Unexpected service/account in {}", key_file.display()));
            }
            parsed["key"]
                .as_str()
                .ok_or_else(|| format!("No key found in {}", key_file.display()))?
                .to_string()
        } else {
            let mut bytes = [0u8; 16];
            rand::thread_rng().fill_bytes(&mut bytes);
            let key = hex::encode(bytes);
            let contents = json!({ "account": ACCOUNT, "key": key, "service": SERVICE });
            fs::create_dir_all(sfdx_dir).map_err(|e| e.to_string())?;
            fs::write(&key_file, serde_json::to_string_pretty(&contents).unwrap())
                .map_err(|e| format!("Could not create {}: {e}", key_file.display()))?;
            key
        };

        let (key_bytes, v2) = match key.len() {
            64 => (hex::decode(&key).map_err(|e| e.to_string())?, true),
            32 => (key.into_bytes(), false),
            n => return Err(format!("Unsupported key length in key.json ({n} chars)")),
        };

        Ok(Self {
            cipher: Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key_bytes)),
            v2,
        })
    }

    pub fn decrypt(&self, text: &str) -> Result<String, String> {
        let (body, tag) = text
            .split_once(':')
            .ok_or("The encrypted data is not properly formatted")?;

        let iv_hex_len = if self.v2 { 24 } else { 12 };
        if body.len() < iv_hex_len {
            return Err("The encrypted data is not properly formatted".into());
        }
        let (iv_hex, secret_hex) = body.split_at(iv_hex_len);

        let iv = if self.v2 {
            hex::decode(iv_hex).map_err(|e| e.to_string())?
        } else {
            iv_hex.as_bytes().to_vec()
        };

        let mut payload = hex::decode(secret_hex).map_err(|e| e.to_string())?;
        payload.extend(hex::decode(tag).map_err(|e| e.to_string())?);

        let plain = self
            .cipher
            .decrypt(Nonce::from_slice(&iv), payload.as_ref())
            .map_err(|_| "Failed to decipher auth data")?;
        String::from_utf8(plain).map_err(|e| e.to_string())
    }

    pub fn encrypt(&self, text: &str) -> Result<String, String> {
        let (iv_hex, iv) = if self.v2 {
            let mut raw = [0u8; 12];
            rand::thread_rng().fill_bytes(&mut raw);
            (hex::encode(raw), raw.to_vec())
        } else {
            let mut raw = [0u8; 6];
            rand::thread_rng().fill_bytes(&mut raw);
            let iv_hex = hex::encode(raw);
            let iv = iv_hex.as_bytes().to_vec();
            (iv_hex, iv)
        };

        let mut out = self
            .cipher
            .encrypt(Nonce::from_slice(&iv), text.as_bytes())
            .map_err(|_| "Failed to encrypt auth data")?;
        let tag = out.split_off(out.len() - 16);

        Ok(format!("{iv_hex}{}:{}", hex::encode(out), hex::encode(tag)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn crypto_with_key(key: &str) -> SfCrypto {
        let dir = std::env::temp_dir().join(format!("sfcrypto-test-{}", key.len()));
        fs::create_dir_all(&dir).unwrap();
        let contents = json!({ "account": ACCOUNT, "key": key, "service": SERVICE });
        fs::write(dir.join("key.json"), contents.to_string()).unwrap();
        SfCrypto::load_or_create(&dir).unwrap()
    }

    #[test]
    fn round_trips_v1_and_v2() {
        for key in ["0123456789abcdef0123456789abcdef", &"ab".repeat(32)] {
            let c = crypto_with_key(key);
            let enc = c.encrypt("00D!secret-token").unwrap();
            assert_eq!(c.decrypt(&enc).unwrap(), "00D!secret-token");
        }
    }
}
