use crate::storage::{self, Command, Settings};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

fn now_iso8601() -> String {
    let dur = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs();
    let nanos = dur.subsec_nanos();

    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    let (year, month, day) = days_to_date(days as i64);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year,
        month,
        day,
        hours,
        minutes,
        seconds,
        nanos / 1_000_000
    )
}

fn days_to_date(mut days: i64) -> (i64, u32, u32) {
    days += 719468;
    let era = if days >= 0 { days } else { days - 146096 } / 146097;
    let doe = days - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

#[tauri::command]
pub fn get_commands() -> Vec<Command> {
    let data = storage::load_data();
    let settings = data.settings.clone();
    let mut commands = data.commands;

    match settings.sort_by.as_str() {
        "frequency" => commands.sort_by(|a, b| b.usage_count.cmp(&a.usage_count)),
        "recent" => commands.sort_by(|a, b| b.last_used.cmp(&a.last_used)),
        "alpha" => commands.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase())),
        _ => commands.sort_by(|a, b| b.usage_count.cmp(&a.usage_count)),
    }

    commands
}

#[tauri::command]
pub fn add_command(title: String, command: String, tags: Vec<String>) -> Result<Command, String> {
    let mut data = storage::load_data();
    let now = now_iso8601();
    let cmd = Command {
        id: Uuid::new_v4().to_string(),
        title,
        command,
        tags,
        usage_count: 0,
        last_used: now.clone(),
        created_at: now,
    };
    data.commands.push(cmd.clone());
    if storage::save_data(&data) {
        Ok(cmd)
    } else {
        Err("保存失败".to_string())
    }
}

#[tauri::command]
pub fn update_command(
    id: String,
    title: String,
    command: String,
    tags: Vec<String>,
) -> Result<bool, String> {
    let mut data = storage::load_data();
    if let Some(cmd) = data.commands.iter_mut().find(|c| c.id == id) {
        cmd.title = title;
        cmd.command = command;
        cmd.tags = tags;
        if storage::save_data(&data) {
            Ok(true)
        } else {
            Err("保存失败".to_string())
        }
    } else {
        Err("命令不存在".to_string())
    }
}

#[tauri::command]
pub fn delete_command(id: String) -> Result<bool, String> {
    let mut data = storage::load_data();
    let len_before = data.commands.len();
    data.commands.retain(|c| c.id != id);
    if data.commands.len() != len_before {
        if storage::save_data(&data) {
            Ok(true)
        } else {
            Err("保存失败".to_string())
        }
    } else {
        Err("命令不存在".to_string())
    }
}

#[tauri::command]
pub fn increment_usage(id: String) -> Result<bool, String> {
    let mut data = storage::load_data();
    if let Some(cmd) = data.commands.iter_mut().find(|c| c.id == id) {
        cmd.usage_count += 1;
        cmd.last_used = now_iso8601();
        if storage::save_data(&data) {
            Ok(true)
        } else {
            Err("保存失败".to_string())
        }
    } else {
        Err("命令不存在".to_string())
    }
}

#[tauri::command]
pub fn import_commands(imported: Vec<Command>) -> Result<Vec<Command>, String> {
    let mut data = storage::load_data();
    let mut added = Vec::new();
    let now = now_iso8601();

    for cmd in imported {
        if data
            .commands
            .iter()
            .any(|existing| existing.command.trim() == cmd.command.trim())
        {
            continue;
        }
        let new_cmd = Command {
            id: Uuid::new_v4().to_string(),
            created_at: now.clone(),
            last_used: now.clone(),
            ..cmd
        };
        data.commands.push(new_cmd.clone());
        added.push(new_cmd);
    }

    if storage::save_data(&data) {
        Ok(added)
    } else {
        Err("保存失败".to_string())
    }
}

#[tauri::command]
pub fn get_settings() -> Settings {
    let data = storage::load_data();
    data.settings
}

#[tauri::command]
pub fn update_settings(
    clipboard_monitoring: bool,
    sort_by: String,
    auto_start: bool,
) -> Result<Settings, String> {
    let mut data = storage::load_data();
    data.settings.clipboard_monitoring = clipboard_monitoring;
    data.settings.sort_by = sort_by;
    data.settings.auto_start = auto_start;
    if storage::save_data(&data) {
        Ok(data.settings)
    } else {
        Err("保存失败".to_string())
    }
}

#[tauri::command]
pub fn set_autostart(enable: bool) -> Result<bool, String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe_path.to_string_lossy().to_string();

    if enable {
        let output = std::process::Command::new("reg")
            .args([
                "add",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v",
                "CmdPad",
                "/d",
                &format!("\"{}\"", exe_str),
                "/f",
            ])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok(true)
        } else {
            Err("注册表写入失败".to_string())
        }
    } else {
        let output = std::process::Command::new("reg")
            .args([
                "delete",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v",
                "CmdPad",
                "/f",
            ])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok(true)
        } else {
            Err("注册表删除失败".to_string())
        }
    }
}

#[tauri::command]
pub fn get_autostart() -> Result<bool, String> {
    let output = std::process::Command::new("reg")
        .args([
            "query",
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "/v",
            "CmdPad",
        ])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(output.status.success())
}
