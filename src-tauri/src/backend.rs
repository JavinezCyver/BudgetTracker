use pocketplan_core::storage::{Snapshot, Store};
use serde_json::Value;
use std::sync::Mutex;
use tauri::Manager;
pub struct AppStore(pub Mutex<Option<Store>>);
#[tauri::command]
pub async fn load_snapshot(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, AppStore>,
) -> Result<Snapshot, String> {
    if window.label() != "main" {
        return Err("Unrecognized application window.".into());
    }
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("budget.json");
    let mut store = state
        .0
        .lock()
        .map_err(|_| "Application storage is unavailable.")?;
    let loaded = Store::open(path)?;
    let snapshot = loaded.snapshot();
    *store = Some(loaded);
    Ok(snapshot)
}
#[tauri::command]
pub async fn execute_action(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, AppStore>,
    action: Value,
    revision: u64,
) -> Result<Snapshot, String> {
    if window.label() != "main" {
        return Err("Unrecognized application window.".into());
    }
    let mut store = state
        .0
        .lock()
        .map_err(|_| "Application storage is unavailable.")?;
    store
        .as_mut()
        .ok_or("Load saved data before making changes.")?
        .execute(&action, revision)
}
