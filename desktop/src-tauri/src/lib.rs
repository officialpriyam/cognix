use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }

            #[cfg(not(debug_assertions))]
            {
                let url: tauri::Url = "https://cognix.iampriyam.me/"
                    .parse()
                    .expect("Invalid URL");
                window.navigate(url);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running cognix");
}
