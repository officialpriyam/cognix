use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(debug_assertions)]
            {
                // In dev, load from Vite dev server
                let url: tauri::Url = "http://localhost:3001"
                    .parse()
                    .expect("Invalid URL");
                window.navigate(url);
                window.open_devtools();
            }

            #[cfg(not(debug_assertions))]
            {
                // In production, load from the bundled dist
                // The frontendDist is set in tauri.conf.json
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running cognix");
}
