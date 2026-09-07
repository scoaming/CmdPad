use crate::storage::{self, days_to_date, Command, Settings};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use uuid::Uuid;

/// 生成北京时间（UTC+8，中国无夏令时固定偏移）的 ISO 8601 时间戳。
/// 旧数据是 UTC（Z 结尾），新数据带 +08:00 后缀；两者字典序比较仍保持时间先后正确。
fn now_iso8601() -> String {
    let dur = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs() + 8 * 3600; // UTC + 8h = 北京时间墙上时钟
    let nanos = dur.subsec_nanos();

    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    let (year, month, day) = days_to_date(days as i64);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}+08:00",
        year,
        month,
        day,
        hours,
        minutes,
        seconds,
        nanos / 1_000_000
    )
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

/// 内置 Notion 同步脚本名（随应用打包在 scripts/ 资源目录）。
const NOTION_SYNC_SCRIPT_NAME: &str = "notion-sync.mjs";

/// 把 Rust 侧同步诊断信息追加到 notion-sync.log（与脚本共用日志，便于对照排查）
fn append_sync_log(data_dir: Option<&std::path::Path>, msg: &str) {
    use std::io::Write;
    let Some(dir) = data_dir else { return };
    let path = dir.join("notion-sync.log");
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        let _ = writeln!(f, "[{}][Rust] {}", now_iso8601(), msg);
    }
}

/// 立即把 commands.json 同步到 Notion 页面（内置脚本，幂等：内容一致时直接跳过）。
/// 脚本需要环境变量 NOTION_PAGE_ID（目标页面 ID）与 Notion 令牌（NOTION_TOKEN 或 ~/.notion-token）。
/// 返回脚本最后一行输出（如 "✅ 已同步（N 个代码块...）" 或 "✅ 一致，无需更新"）。
#[tauri::command]
pub async fn sync_to_notion(app: tauri::AppHandle) -> Result<String, String> {
    // 路径解析优先级：环境变量覆盖 → 应用资源目录 → 可执行文件同级目录
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();
    if let Ok(p) = std::env::var("CMDSYNC_NOTION_SCRIPT") {
        candidates.push(std::path::PathBuf::from(p));
    }
    if let Ok(dir) = app.path().resource_dir() {
        candidates.push(dir.join("scripts").join(NOTION_SYNC_SCRIPT_NAME));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("scripts").join(NOTION_SYNC_SCRIPT_NAME));
        }
    }
    let script = candidates
        .into_iter()
        .find(|p| p.exists())
        .ok_or_else(|| {
            format!(
                "未找到内置同步脚本 {}（可用环境变量 CMDSYNC_NOTION_SCRIPT 指定路径）",
                NOTION_SYNC_SCRIPT_NAME
            )
        })?;

    // 复制脚本到应用数据目录（C 盘用户路径、无空格）再执行：
    // 脚本位于 Program Files 时曾被安全软件拦截导致 node 加载即崩
    // （v1.1.1 起脚本在 D:\Program Files 下必现崩溃，位于 C:\Users\... 时正常）
    let data_dir = app.path().app_data_dir().ok();
    let script = match &data_dir {
        Some(dir) => {
            let dest = dir.join(NOTION_SYNC_SCRIPT_NAME);
            // fs::copy 直接覆盖旧副本，保证始终与安装版本一致；失败则退回原路径
            match std::fs::copy(&script, &dest) {
                Ok(_) => dest,
                Err(_) => script,
            }
        }
        None => script,
    };
    append_sync_log(
        data_dir.as_deref(),
        &format!(
            "启动同步：script={}，cwd={}",
            script.display(),
            std::env::current_dir()
                .map(|d| d.display().to_string())
                .unwrap_or_else(|_| "?".to_string())
        ),
    );

    // node 不在 PATH 时兜底常见安装位置（GUI 自启环境 PATH 可能不全）
    let mut candidates: Vec<String> = vec!["node".to_string()];
    #[cfg(windows)]
    {
        if let Some(pf) = std::env::var_os("ProgramFiles") {
            candidates.push(
                std::path::PathBuf::from(pf)
                    .join("nodejs")
                    .join("node.exe")
                    .to_string_lossy()
                    .into_owned(),
            );
        }
        if let Some(lap) = std::env::var_os("LOCALAPPDATA") {
            candidates.push(
                std::path::PathBuf::from(lap)
                    .join("Programs")
                    .join("nodejs")
                    .join("node.exe")
                    .to_string_lossy()
                    .into_owned(),
            );
        }
    }

    let last_err = "未找到 node，请确认已安装 Node.js 并加入 PATH".to_string();
    for cand in candidates {
        let mut cmd = tokio::process::Command::new(&cand);
        cmd.arg(&script)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .kill_on_drop(true); // 超时丢弃 future 时顺带杀掉子进程
        #[cfg(windows)]
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW，避免弹出控制台

        match cmd.spawn() {
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                append_sync_log(data_dir.as_deref(), &format!("node={} 未找到，尝试下一候选", cand));
                continue;
            }
            Err(e) => return Err(format!("启动同步脚本失败：{}", e)),
            Ok(child) => {
                let output = tokio::time::timeout(
                    std::time::Duration::from_secs(180),
                    child.wait_with_output(),
                )
                .await;
                match output {
                    Err(_) => return Err("同步超时（180 秒），请检查网络".to_string()),
                    Ok(Err(e)) => return Err(format!("执行同步脚本失败：{}", e)),
                    Ok(Ok(out)) => {
                        let stdout = String::from_utf8_lossy(&out.stdout);
                        let stderr = String::from_utf8_lossy(&out.stderr);
                        if out.status.success() {
                            let last = stdout
                                .lines()
                                .filter(|l| !l.trim().is_empty())
                                .next_back()
                                .unwrap_or("同步完成")
                                .to_string();
                            return Ok(last);
                        }
                        // 完整 stderr 落日志：node 崩溃时 stderr 是诊断的唯一线索
                        append_sync_log(
                            data_dir.as_deref(),
                            &format!(
                                "node={} exit={:?} stderr全文：\n{}",
                                cand,
                                out.status.code(),
                                stderr
                            ),
                        );
                        // 取 stderr 尾部多行：node 崩溃时尾行只是版本号，Error 信息在倒数几行
                        let tail: Vec<String> = stderr
                            .lines()
                            .filter(|l| !l.trim().is_empty())
                            .rev()
                            .take(4)
                            .map(|s| s.to_string())
                            .collect::<Vec<_>>()
                            .into_iter()
                            .rev()
                            .collect();
                        let msg = if tail.is_empty() {
                            "无错误输出，详见日志".to_string()
                        } else {
                            tail.join(" ｜ ")
                        };
                        return Err(format!("同步失败：{}", msg));
                    }
                }
            }
        }
    }
    Err(last_err)
}
