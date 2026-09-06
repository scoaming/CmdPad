use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Command {
    pub id: String,
    pub title: String,
    pub command: String,
    pub tags: Vec<String>,
    pub usage_count: u32,
    pub last_used: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub clipboard_monitoring: bool,
    pub sort_by: String,
    #[serde(default)]
    pub auto_start: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    pub commands: Vec<Command>,
    pub settings: Settings,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            commands: Vec::new(),
            settings: Settings {
                clipboard_monitoring: true,
                sort_by: "frequency".to_string(),
                auto_start: false,
            },
        }
    }
}

fn get_data_path() -> PathBuf {
    let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("CmdPad");
    fs::create_dir_all(&path).ok();
    path.push("commands.json");
    path
}

/// 自 1970-01-01 的天数 → 格里历日期（Howard Hinnant 算法）
pub fn days_to_date(mut days: i64) -> (i64, u32, u32) {
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

/// 格里历日期 → 自 1970-01-01 的天数（days_to_date 的逆运算，Howard Hinnant 算法）
fn days_from_date(y: i64, m: u32, d: u32) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { (m - 3) as i64 } else { (m + 9) as i64 };
    let doy = (153 * mp + 2) / 5 + d as i64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

/// 把历史 UTC（Z 结尾）时间戳转换为北京时间（+08:00），其他格式原样返回。
/// 输入格式固定为 "YYYY-MM-DDTHH:MM:SS.mmmZ"。
fn utc_z_to_beijing(s: &str) -> String {
    if !s.ends_with('Z') || s.len() < 23 {
        return s.to_string();
    }
    let num = |a: usize, b: usize| s.get(a..b).and_then(|x| x.parse::<i64>().ok());
    let (y, mo, d) = match (num(0, 4), num(5, 7), num(8, 10)) {
        (Some(a), Some(b), Some(c)) => (a, b as u32, c as u32),
        _ => return s.to_string(),
    };
    let (h, mi, sec) = match (num(11, 13), num(14, 16), num(17, 19)) {
        (Some(a), Some(b), Some(c)) => (a, b, c),
        _ => return s.to_string(),
    };
    let total = days_from_date(y, mo, d) * 86400 + h * 3600 + mi * 60 + sec + 8 * 3600;
    let (yy, mm, dd) = days_to_date(total / 86400);
    let rem = total % 86400;
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}+08:00",
        yy,
        mm,
        dd,
        rem / 3600,
        (rem % 3600) / 60,
        rem % 60,
        &s[20..23]
    )
}

pub fn load_data() -> AppData {
    let path = get_data_path();
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(content) => {
                let mut data: AppData = serde_json::from_str(&content).unwrap_or_default();
                // 一次性迁移：历史 UTC 时间戳 → 北京时间（幂等，仅 Z 结尾的条目会被改写）
                let mut changed = false;
                for cmd in &mut data.commands {
                    let lu = utc_z_to_beijing(&cmd.last_used);
                    if lu != cmd.last_used {
                        cmd.last_used = lu;
                        changed = true;
                    }
                    let ca = utc_z_to_beijing(&cmd.created_at);
                    if ca != cmd.created_at {
                        cmd.created_at = ca;
                        changed = true;
                    }
                }
                if changed {
                    save_data(&data);
                }
                data
            }
            Err(_) => AppData::default(),
        }
    } else {
        AppData::default()
    }
}

pub fn save_data(data: &AppData) -> bool {
    let path = get_data_path();
    match serde_json::to_string_pretty(data) {
        Ok(content) => fs::write(path, content).is_ok(),
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_days_roundtrip() {
        for days in [0i64, 1, 19000, 20667] {
            let (y, m, d) = days_to_date(days);
            assert_eq!(days_from_date(y, m, d), days);
        }
    }

    #[test]
    fn test_utc_z_to_beijing() {
        // 2026-09-06T06:45:29.609Z → 北京时间 14:45:29（截图里的那次同步）
        assert_eq!(
            utc_z_to_beijing("2026-09-06T06:45:29.609Z"),
            "2026-09-06T14:45:29.609+08:00"
        );
        // 跨日：北京 00:30 = UTC 前一天 16:30
        assert_eq!(
            utc_z_to_beijing("2026-09-05T16:30:00.000Z"),
            "2026-09-06T00:30:00.000+08:00"
        );
        // 已是北京时间 / 非法格式：原样返回
        assert_eq!(
            utc_z_to_beijing("2026-09-06T14:00:00.000+08:00"),
            "2026-09-06T14:00:00.000+08:00"
        );
        assert_eq!(utc_z_to_beijing("garbage"), "garbage");
    }
}
