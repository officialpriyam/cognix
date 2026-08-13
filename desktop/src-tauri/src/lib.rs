use tauri::Manager;

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
        .setup(|app| {
            let _window = app.get_webview_window("main").unwrap();

            #[cfg(debug_assertions)]
            {
                let url: tauri::Url = "http://localhost:3001"
                    .parse()
                    .expect("Invalid URL");
                let _ = window.navigate(url);
                window.open_devtools();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running cognix");
}
