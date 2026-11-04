use crate::*;
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
};
const MAX_FILE: u64 = 64 * 1024 * 1024;
#[derive(Serialize, Deserialize)]
pub struct Snapshot {
    pub data: Value,
    pub revision: u64,
    pub analysis: Value,
}
pub struct Store {
    data: Value,
    revision: u64,
    path: PathBuf,
    file_existed: bool,
}
impl Store {
    pub fn open(path: PathBuf) -> Result<Self> {
        let _lock = lock(&path)?;
        let saved = if path.exists() {
            if fs::metadata(&path).map_err(|e| e.to_string())?.len() > MAX_FILE {
                return Err("Saved data is too large to load safely.".into());
            }
            let mut body = String::new();
            File::open(&path)
                .map_err(|e| e.to_string())?
                .take(MAX_FILE + 1)
                .read_to_string(&mut body)
                .map_err(|e| e.to_string())?;
            serde_json::from_str::<Value>(&body).map_err(|_| {
                "Saved data could not be read. The original file has been kept.".to_string()
            })?
        } else {
            initial()
        };
        let data = migrate(saved.clone())?;
        let revision = data.get("_revision").and_then(Value::as_u64).unwrap_or(0);
        if data != saved {
            atomic_write(&path, &data)?
        }
        let file_existed = path.exists();
        Ok(Self {
            data,
            revision,
            path,
            file_existed,
        })
    }
    pub fn snapshot(&self) -> Snapshot {
        Snapshot {
            data: self.data.clone(),
            revision: self.revision,
            analysis: analyze(&self.data, &today()),
        }
    }
    pub fn execute(&mut self, action: &Value, revision: u64) -> Result<Snapshot> {
        let _lock = lock(&self.path)?;
        if serde_json::to_vec(action).map_err(|e| e.to_string())?.len() > 64 * 1024 {
            return Err("This action is too large.".into());
        }
        if revision != self.revision {
            return Err("Your view is out of date. Reload before making another change.".into());
        }
        // Also detect another app instance changing the file; never overwrite newer records.
        if self.file_existed && !self.path.exists() {
            return Err("Saved data was removed outside the app. Reload before saving.".into());
        }
        if self.path.exists() {
            if fs::metadata(&self.path).map_err(|e| e.to_string())?.len() > MAX_FILE {
                return Err("Saved data changed and exceeds the supported size.".into());
            }
            let saved: Value =
                serde_json::from_slice(&fs::read(&self.path).map_err(|e| e.to_string())?)
                    .map_err(|_| "Saved data changed and could not be read.".to_string())?;
            if saved != self.data {
                return Err("Saved data changed in another window. Reload before saving.".into());
            }
        }
        let mut next = apply_action(&self.data, action, &today())?;
        let revision = self
            .revision
            .checked_add(1)
            .ok_or("Revision limit reached.")?;
        next["_revision"] = json!(revision);
        atomic_write(&self.path, &next)?;
        self.data = next;
        self.revision = revision;
        self.file_existed = true;
        Ok(self.snapshot())
    }
}
fn lock(path: &Path) -> Result<File> {
    let dir = path.parent().ok_or("Invalid storage path.")?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(dir.join("budget.lock"))
        .map_err(|e| e.to_string())?;
    file.try_lock()
        .map_err(|_| "Another app window is saving. Please try again.")?;
    Ok(file)
}
pub fn atomic_write(path: &Path, data: &Value) -> Result<()> {
    let dir = path.parent().ok_or("Invalid storage path.")?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let temporary = dir.join(format!("budget-{}.tmp", id()));
    let result = (|| {
        let body = serde_json::to_vec(data).map_err(|e| e.to_string())?;
        if body.len() as u64 > MAX_FILE {
            return Err("Saved data exceeds the supported size.".into());
        }
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
            .map_err(|e| e.to_string())?;
        file.write_all(&body)
            .and_then(|_| file.sync_all())
            .map_err(|e| e.to_string())?;
        drop(file);
        fs::rename(&temporary, path).map_err(|e| e.to_string())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}
