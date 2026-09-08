mod commands;
mod storage;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 单实例：二次启动时把已有主窗口拉到前台后退出新进程，
        // 避免双开同时写 commands.json 互相覆盖
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_always_on_top(true);
                let _ = window.set_focus();
                let _ = window.set_always_on_top(false);
            }
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Build tray menu
            let show_item = MenuItemBuilder::with_id("show", "显示 CmdPad")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出")
                .build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &quit_item])
                .build()?;

            // Create tray icon with explicit icon (avoid duplicate from config)
            let icon = app.default_window_icon()
                .cloned()
                .expect("No default window icon configured");
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip(format!(
                    "CmdPad v{} - 智能命令便签",
                    env!("CARGO_PKG_VERSION")
                ))
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_always_on_top(true);
                                let _ = window.set_focus();
                                let _ = window.set_always_on_top(false);
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
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
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_always_on_top(true);
                            let _ = window.set_focus();
                            let _ = window.set_always_on_top(false);
                        }
                    }
                })
                .build(app)?;

            // Register global shortcut: Ctrl+Alt+C to toggle CmdPad
            // （不用 Ctrl+Shift+C：与 Explorer 复制文件路径、浏览器 DevTools 检查元素冲突；
            //   不用 Ctrl+Shift+S：是 VS Code / Office 的另存为）
            use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
            let handle = app.handle().clone();
            app.global_shortcut()
                .on_shortcut("Ctrl+Alt+C", move |_app, _shortcut, event| {
                    // Only respond to key press, not release (prevents flicker)
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    if let Some(window) = handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_always_on_top(true);
                            let _ = window.set_focus();
                            let _ = window.set_always_on_top(false);
                        }
                    }
                })
                .ok();

            // 自启动自愈：NSIS 覆盖安装的卸载阶段会清掉 HKCU Run 键（而应用只在切换开关时写键），
            // 启动时发现设置要求自启但注册表缺失，则静默补写
            std::thread::spawn(|| {
                if commands::get_settings().auto_start {
                    if let Ok(false) = commands::get_autostart() {
                        let _ = commands::set_autostart(true);
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Hide to tray instead of closing
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_commands,
            commands::add_command,
            commands::update_command,
            commands::delete_command,
            commands::increment_usage,
            commands::import_commands,
            commands::get_settings,
            commands::update_settings,
            commands::set_autostart,
            commands::get_autostart,
            commands::sync_to_notion,
        ])
        .run(tauri::generate_context!())
        .expect("启动 CmdPad 失败");
}
