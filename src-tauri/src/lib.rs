mod backend;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(backend::AppStore(std::sync::Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            backend::load_snapshot,
            backend::execute_action
        ])
        .run(tauri::generate_context!())
        .expect("error running PocketPlan");
}
