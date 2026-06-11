#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{Manager, State, Emitter, menu::{Menu, MenuItem}, tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AppSettings {
    gateway: GatewaySettings,
    appearance: AppearanceSettings,
    general: GeneralSettings,
    shortcuts: ShortcutSettings,
    proxy: ProxySettings,
    window: WindowSettings,
    advanced: AdvancedSettings,
    setup_complete: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GatewaySettings {
    mode: String,
    url: String,
    token_secret_ref: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AppearanceSettings {
    theme: String,
    accent_color: String,
    font_size: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GeneralSettings {
    launch_at_startup: bool,
    minimize_to_tray: bool,
    close_to_tray: bool,
    language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ShortcutSettings {
    toggle_window: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProxySettings {
    enabled: bool,
    server: String,
    bypass: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WindowSettings {
    x: Option<f64>,
    y: Option<f64>,
    width: f64,
    height: f64,
    is_maximized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AdvancedSettings {
    dev_mode: bool,
    log_level: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            gateway: GatewaySettings {
                mode: "local".into(),
                url: "http://127.0.0.1:18789".into(),
                token_secret_ref: "".into(),
            },
            appearance: AppearanceSettings {
                theme: "system".into(),
                accent_color: "amber".into(),
                font_size: "md".into(),
            },
            general: GeneralSettings {
                launch_at_startup: false,
                minimize_to_tray: true,
                close_to_tray: true,
                language: "zh-CN".into(),
            },
            shortcuts: ShortcutSettings {
                toggle_window: "CommandOrControl+Shift+Space".into(),
            },
            proxy: ProxySettings {
                enabled: false,
                server: "".into(),
                bypass: "localhost,127.0.0.1".into(),
            },
            window: WindowSettings {
                x: None,
                y: None,
                width: 1280.0,
                height: 800.0,
                is_maximized: false,
            },
            advanced: AdvancedSettings {
                dev_mode: false,
                log_level: "info".into(),
            },
            setup_complete: None,
        }
    }
}

struct AppState {
    settings: Arc<Mutex<AppSettings>>,
    gateway_url: Arc<Mutex<String>>,
    config_dir: PathBuf,
}

impl AppState {
    fn save_settings(&self) -> Result<(), String> {
        let settings = self.settings.lock().unwrap();
        let json = serde_json::to_string_pretty(&*settings).map_err(|e| e.to_string())?;
        fs::write(self.config_dir.join("settings.json"), json).map_err(|e| e.to_string())
    }

    fn load_settings(config_dir: &PathBuf) -> AppSettings {
        let path = config_dir.join("settings.json");
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(settings) = serde_json::from_str(&content) {
                    return settings;
                }
            }
        }
        AppSettings::default()
    }
}

#[tauri::command]
async fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
async fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    Ok(state.settings.lock().unwrap().clone())
}

#[tauri::command]
async fn set_settings(
    key: String,
    value: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();

    match key.as_str() {
        "gateway" => {
            if let Ok(gw) = serde_json::from_value(value) {
                settings.gateway = gw;
            }
        }
        "appearance" => {
            if let Ok(ap) = serde_json::from_value(value) {
                settings.appearance = ap;
            }
        }
        "general" => {
            if let Ok(gn) = serde_json::from_value(value) {
                settings.general = gn;
            }
        }
        "shortcuts" => {
            if let Ok(sc) = serde_json::from_value(value) {
                settings.shortcuts = sc;
            }
        }
        "proxy" => {
            if let Ok(px) = serde_json::from_value(value) {
                settings.proxy = px;
            }
        }
        "window" => {
            if let Ok(win) = serde_json::from_value(value) {
                settings.window = win;
            }
        }
        "advanced" => {
            if let Ok(adv) = serde_json::from_value(value) {
                settings.advanced = adv;
            }
        }
        "setupComplete" => {
            if let Some(setup) = value.as_bool() {
                settings.setup_complete = Some(setup);
            }
        }
        _ => {}
    }

    if key == "gateway" {
        let url = settings.gateway.url.clone();
        let mut gw_url = state.gateway_url.lock().unwrap();
        *gw_url = url;
    }

    drop(settings);
    state.save_settings()
}

#[tauri::command]
async fn get_all_settings(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    Ok(serde_json::to_value(state.settings.lock().unwrap().clone()).unwrap())
}

#[tauri::command]
async fn reset_settings(state: State<'_, AppState>) -> Result<(), String> {
    let default_settings = AppSettings::default();
    let mut settings = state.settings.lock().unwrap();
    *settings = default_settings;
    drop(settings);
    state.save_settings()
}

#[tauri::command]
async fn gateway_health(gateway_url: String) -> Result<serde_json::Value, String> {
    if gateway_url.is_empty() {
        return Ok(serde_json::json!({
            "ok": false,
            "status": "no-url",
            "error": "Gateway URL not configured"
        }));
    }

    let client = reqwest::Client::new();
    match client
        .get(format!("{}/health", gateway_url))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(resp) => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                Ok(json)
            } else {
                Ok(serde_json::json!({
                    "ok": true,
                    "status": "connected",
                    "url": gateway_url
                }))
            }
        }
        Err(e) => Ok(serde_json::json!({
            "ok": false,
            "status": "unreachable",
            "error": e.to_string(),
            "url": gateway_url
        })),
    }
}

#[tauri::command]
async fn gateway_request(
    path: String,
    init: Option<serde_json::Value>,
    gateway_url: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!("{}{}", gateway_url, path);

    let method_str = init
        .as_ref()
        .and_then(|i| i.get("method"))
        .and_then(|m| m.as_str())
        .unwrap_or("GET");

    let method = reqwest::Method::from_bytes(method_str.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut request = client.request(method, &url);

    if let Some(init_val) = init {
        if let Some(headers) = init_val.get("headers") {
            if let Some(headers_map) = headers.as_object() {
                for (key, value) in headers_map {
                    if let Some(v) = value.as_str() {
                        request = request.header(key, v);
                    }
                }
            }
        }

        if let Some(body) = init_val.get("body") {
            request = request.json(body);
        }
    }

    request = request.timeout(std::time::Duration::from_secs(30));

    match request.send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => Ok(serde_json::json!({ "ok": true, "data": json })),
            Err(_) => Ok(serde_json::json!({ "ok": true, "data": null })),
        },
        Err(e) => Ok(serde_json::json!({ "ok": false, "error": e.to_string() })),
    }
}

#[tauri::command]
async fn gateway_stream_url(gateway_url: String) -> String {
    gateway_url
}

#[tauri::command]
async fn gateway_update_url(new_url: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut url = state.gateway_url.lock().unwrap();
    *url = new_url;
    Ok(())
}

#[tauri::command]
async fn gateway_status(gateway_url: String) -> serde_json::Value {
    serde_json::json!({ "url": gateway_url, "connected": true })
}

#[tauri::command]
async fn shell_open_external(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

#[tauri::command]
async fn window_toggle(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        if let Ok(is_visible) = window.is_visible() {
            if is_visible {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn window_minimize(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.minimize();
    }
    Ok(())
}

#[tauri::command]
async fn window_maximize(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        if let Ok(is_max) = window.is_maximized() {
            if is_max {
                let _ = window.unmaximize();
            } else {
                let _ = window.maximize();
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn window_flash(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Tauri v2: request_user_attention uses Critical|Informational
    // but the type is not publicly re-exported. Use set_focus as fallback.
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.set_focus();
    }
    Ok(())
}

#[tauri::command]
async fn window_set_always_on_top(flag: bool, app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.set_always_on_top(flag);
    }
    Ok(())
}

#[tauri::command]
async fn tray_update_status(status: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    let _ = app_handle.emit("tray:status-updated", status);
    Ok(())
}

#[tauri::command]
async fn notification_show(
    app_handle: tauri::AppHandle,
    title: String,
    body: String,
    _silent: Option<bool>,
) -> Result<serde_json::Value, String> {
    use tauri_plugin_notification::NotificationExt;
    app_handle
        .notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
async fn openclaw_cron_list_json() -> Result<serde_json::Value, String> {
    let output = std::process::Command::new("openclaw")
        .args(&["cron", "list", "--json"])
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if output.status.success() {
                match serde_json::from_str::<serde_json::Value>(&stdout) {
                    Ok(json) => Ok(json),
                    Err(_) => Ok(serde_json::json!({ "ok": false, "jobs": [], "error": "JSON parse error" })),
                }
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Ok(serde_json::json!({ "ok": false, "jobs": [], "error": stderr }))
            }
        }
        Err(e) => Ok(serde_json::json!({ "ok": false, "jobs": [], "error": e.to_string() })),
    }
}

#[tauri::command]
async fn openclaw_cron_list_text() -> Result<serde_json::Value, String> {
    let output = std::process::Command::new("openclaw")
        .args(&["cron", "list"])
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            Ok(serde_json::json!({
                "ok": output.status.success(),
                "text": stdout,
                "stderr": stderr
            }))
        }
        Err(e) => Ok(serde_json::json!({ "ok": false, "text": "", "stderr": e.to_string() })),
    }
}

#[tauri::command]
async fn openclaw_cron_toggle(id: String, enabled: bool) -> Result<serde_json::Value, String> {
    let cmd = if enabled { "enable" } else { "disable" };
    let output = std::process::Command::new("openclaw")
        .args(&["cron", cmd, &id])
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            Ok(serde_json::json!({
                "ok": output.status.success(),
                "stdout": stdout,
                "stderr": stderr
            }))
        }
        Err(e) => Ok(serde_json::json!({ "ok": false, "stdout": "", "stderr": e.to_string() })),
    }
}

#[tauri::command]
async fn openclaw_cron_run(id: String) -> Result<serde_json::Value, String> {
    let output = std::process::Command::new("openclaw")
        .args(&["cron", "run", &id])
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            Ok(serde_json::json!({
                "ok": output.status.success(),
                "stdout": stdout,
                "stderr": stderr
            }))
        }
        Err(e) => Ok(serde_json::json!({ "ok": false, "stdout": "", "stderr": e.to_string() })),
    }
}

#[tauri::command]
async fn openclaw_sandbox_list() -> Result<serde_json::Value, String> {
    let output = std::process::Command::new("openclaw")
        .args(&["sandbox", "list"])
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            Ok(serde_json::json!({
                "ok": output.status.success(),
                "text": stdout,
                "stderr": stderr
            }))
        }
        Err(e) => Ok(serde_json::json!({ "ok": false, "text": "", "stderr": e.to_string() })),
    }
}

#[tauri::command]
async fn openclaw_sandbox_explain() -> Result<serde_json::Value, String> {
    let output = std::process::Command::new("openclaw")
        .args(&["sandbox", "explain"])
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            Ok(serde_json::json!({
                "ok": output.status.success(),
                "text": stdout,
                "stderr": stderr
            }))
        }
        Err(e) => Ok(serde_json::json!({ "ok": false, "text": "", "stderr": e.to_string() })),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    // Prevent multiple OpenClaw instances by attempting to lock a file in
    // the OS temp directory. If the file is already locked by another
    // running instance, exit silently to avoid spawning a second window.
    //
    // We deliberately avoid `tauri-plugin-single-instance` here: that plugin
    // creates a hidden event-target window (`{identifier}-sic`) for IPC,
    // which the user was perceiving as a second OpenClaw window.
    //
    // On Windows we use the OS-level `LockFileEx` semantics implicitly via
    // opening the file in a way that prevents concurrent writers. This is
    // done through a named pipe / file share mode set to 0 (no sharing).
    {
        use std::fs::OpenOptions;
        use std::os::windows::fs::OpenOptionsExt;

        let lock_path = std::env::temp_dir().join("openclaw-desktop.lock");

        // `dwShareMode = 0` means no other process can open this file while
        // we hold it. If another instance already holds it, this `open`
        // call will fail with ERROR_SHARING_VIOLATION.
        match OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(false)
            .share_mode(0)
            .open(&lock_path)
        {
            Ok(_file) => {
                // Successfully acquired the lock. The file handle is moved
                // into a static so it lives for the duration of the process
                // and the lock is released only on process exit.
                Box::leak(Box::new(_file));
            }
            Err(_) => {
                // Another instance is already running. Exit immediately so
                // we do not spawn a second window.
                return;
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Tauri auto-creates the "main" window from tauri.conf.json app.windows.
            // Just retrieve the reference and focus it.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }

            let config_dir = app
                .path()
                .app_config_dir()
                .expect("failed to resolve app config dir");

            fs::create_dir_all(&config_dir).expect("failed to create config dir");

            let settings = AppState::load_settings(&config_dir);
            let gateway_url = settings.gateway.url.clone();

            app.manage(AppState {
                settings: Arc::new(Mutex::new(settings)),
                gateway_url: Arc::new(Mutex::new(gateway_url)),
                config_dir,
            });

            // --- System Tray ---
            let show_item = MenuItem::with_id(app, "show", "显示 OpenClaw", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("OpenClaw")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // --- Global Shortcut: Ctrl+Shift+Space to toggle window ---
            use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
            app.global_shortcut().register(shortcut)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_platform,
            get_settings,
            set_settings,
            get_all_settings,
            reset_settings,
            gateway_health,
            gateway_request,
            gateway_stream_url,
            gateway_update_url,
            gateway_status,
            shell_open_external,
            window_toggle,
            window_minimize,
            window_maximize,
            window_flash,
            window_set_always_on_top,
            tray_update_status,
            notification_show,
            openclaw_cron_list_json,
            openclaw_cron_list_text,
            openclaw_cron_toggle,
            openclaw_cron_run,
            openclaw_sandbox_list,
            openclaw_sandbox_explain,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::WindowEvent { label, event, .. } => {
                if label == "main" {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let state = app_handle.state::<AppState>();
                        let settings = state.settings.lock().unwrap();
                        if settings.general.close_to_tray {
                            api.prevent_close();
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                    }
                }
            }
            _ => {}
        });
}
