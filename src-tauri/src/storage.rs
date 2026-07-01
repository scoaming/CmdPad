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

pub fn load_data() -> AppData {
    let path = get_data_path();
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
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
