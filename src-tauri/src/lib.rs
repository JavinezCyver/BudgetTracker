use std::{fs, sync::Mutex};
use tauri::Manager;

struct Store(Mutex<()>);

#[tauri::command]
fn load_data(
    app: tauri::AppHandle,
    store: tauri::State<Store>,
) -> Result<Option<serde_json::Value>, String> {
    let _guard = store.0.lock().map_err(|e| e.to_string())?;
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("budget.json");
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data)
        .map(Some)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_data(
    app: tauri::AppHandle,
    store: tauri::State<Store>,
    data: serde_json::Value,
) -> Result<(), String> {
    let _guard = store.0.lock().map_err(|e| e.to_string())?;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("budget.json");
    let temporary = dir.join("budget.tmp");
    fs::write(
        &temporary,
        serde_json::to_vec_pretty(&data).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temporary, path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Store(Mutex::new(())))
        .invoke_handler(tauri::generate_handler![load_data, save_data])
        .run(tauri::generate_context!())
        .expect("error running Folio");
}
