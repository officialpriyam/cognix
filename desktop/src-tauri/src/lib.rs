use tauri::Manager;

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(
            tauri_plugin_single_instance::init(|app, argv, _cwd| {
                println!("Single instance triggered with args: {argv:?}");
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            }),
        );
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![open_url])
        .setup(|app| {
            let _window = app.get_webview_window("main").unwrap();

            #[cfg(debug_assertions)]
            {
                let url: tauri::Url = "http://localhost:3001"
                    .parse()
                    .expect("Invalid URL");
                let _ = _window.navigate(url);
                _window.open_devtools();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running cognix");
}
