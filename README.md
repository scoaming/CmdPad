# CmdPad — 智能命令便签管理器

基于使用频次自动排序的命令便签工具，让常用命令触手可及。

## ✨ 功能

- **📋 命令管理** — 增/删/改/查命令，支持标题、命令内容和标签
- **🔥 智能排序** — 按使用频次 / 最近使用 / 字母顺序自动排列
- **📎 剪贴板监听** — 复制命令执行后自动记录，无需手动操作
- **☁️ Notion 云同步** — 一键同步命令库到 Notion 页面，增删改后自动同步，手机装 Notion App 即可查
- **📱 手机端 PWA** — 命令一键上传 Cloudflare Worker，手机浏览器 / 主屏幕图标随时查、点卡片复制
- **🕒 北京时间** — 全链路时间戳统一北京时间（历史数据启动时自动迁移）
- **⌨️ 全局快捷键** — `Ctrl+Shift+C` 呼出/隐藏窗口，`Ctrl+N` 快速添加
- **📥 导入命令** — 支持批量导入现有命令集
- **🔌 开机自启** — 可设置随系统启动
- **🔒 单实例** — 重复启动自动唤起已有窗口，避免双开写坏数据
- **📌 系统托盘** — 关闭即隐藏到托盘，右键菜单快速操作

## 🎯 快捷键

| 快捷键 | 作用 |
|--------|------|
| `Ctrl+Alt+C` | 显示 / 隐藏 CmdPad（避开 Explorer「复制文件路径」与浏览器 DevTools 的 `Ctrl+Shift+C`） |
| `Ctrl+N` | 快速新增命令 |

## ☁️ 云同步 & 手机端

| 顶栏按钮 | 作用 |
|---------|------|
| ☁️（云上传图标） | 立即同步到 Notion；增/删/改/导入后 10 秒也会自动同步（复制计数不触发，避免频繁重写页面）。内置同步脚本（`src-tauri/scripts/notion-sync.mjs`），使用前需设置环境变量 `NOTION_PAGE_ID`（目标 Notion 页面 ID）；令牌从 `NOTION_TOKEN` 环境变量或用户主目录 `.notion-token` 文件读取，**不入仓库**。也可用 `CMDSYNC_NOTION_SCRIPT` 指定自定义脚本路径 |
| 📱（手机图标） | 配置 Cloudflare Worker 地址与访问令牌，一键上传命令库；手机浏览器打开 Worker 地址、输入令牌即可搜索 + 点卡片复制，也可「添加到主屏幕」当 App 用 |

手机端部署指南见 [cloud/DEPLOY.md](cloud/DEPLOY.md)——Cloudflare Workers 免费版即可（¥0），数据经访问令牌保护，非公开可读。

## 📦 下载安装

前往 [Releases](https://github.com/scoaming/CmdPad/releases) 页面下载最新版本：

- **Windows**: 下载 `.msi` 或 `.exe` 安装包，双击安装即可

## 🛠️ 从源码构建

### 环境要求

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://www.rust-lang.org/) ≥ 1.70
- [Tauri CLI](https://v2.tauri.app/) ≥ 2.0

### 构建步骤

```bash
# 克隆仓库
git clone https://github.com/scoaming/CmdPad.git
cd CmdPad

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建安装包
npm run tauri build
```

构建产物在 `src-tauri/target/release/bundle/` 目录下。

## 🏗️ 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | [Tauri 2.0](https://v2.tauri.app/) (Rust) |
| 前端 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand |
| 图标 | Lucide React |

## 📁 项目结构

```
CmdPad/
├── src/                     # React 前端
│   ├── components/          # UI 组件（含 CloudSyncDialog 云端上传）
│   ├── store/               # Zustand 状态管理
│   ├── types/               # TypeScript 类型
│   └── utils/               # 工具函数（剪贴板去重、云端上传）
├── src-tauri/               # Rust 后端
│   └── src/
│       ├── main.rs          # 入口
│       ├── lib.rs           # 窗口/托盘/快捷键/单实例
│       ├── commands.rs      # Tauri 命令（含 Notion 同步、北京时间）
│       └── storage.rs       # 数据持久化（含历史时区迁移）
├── cloud/                   # 手机端：Cloudflare Worker + PWA
│   ├── worker.js            # API（KV 读写 + 令牌鉴权）
│   ├── public/              # PWA 页面（搜索/点卡片复制）
│   ├── wrangler.toml        # 部署配置
│   └── DEPLOY.md            # 手机端部署指南
├── package.json
└── tauri.conf.json
```

## 📄 许可

MIT License
