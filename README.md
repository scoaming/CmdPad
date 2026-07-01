# CmdPad — 智能命令便签管理器

基于使用频次自动排序的命令便签工具，让常用命令触手可及。

## ✨ 功能

- **📋 命令管理** — 增/删/改/查命令，支持标题、命令内容和标签
- **🔥 智能排序** — 按使用频次 / 最近使用 / 字母顺序自动排列
- **📎 剪贴板监听** — 复制命令执行后自动记录，无需手动操作
- **⌨️ 全局快捷键** — `Ctrl+Shift+C` 呼出/隐藏窗口，`Ctrl+N` 快速添加
- **📥 导入命令** — 支持批量导入现有命令集
- **🔌 开机自启** — 可设置随系统启动
- **📌 系统托盘** — 关闭即隐藏到托盘，右键菜单快速操作

## 🎯 快捷键

| 快捷键 | 作用 |
|--------|------|
| `Ctrl+Shift+C` | 显示 / 隐藏 CmdPad |
| `Ctrl+N` | 快速新增命令 |

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
│   ├── components/          # UI 组件
│   ├── store/               # Zustand 状态管理
│   ├── types/               # TypeScript 类型
│   └── utils/               # 工具函数
├── src-tauri/               # Rust 后端
│   └── src/
│       ├── main.rs          # 入口
│       ├── lib.rs           # 窗口 & 托盘配置
│       ├── commands.rs      # Tauri 命令
│       └── storage.rs       # 数据持久化
├── package.json
└── tauri.conf.json
```

## 📄 许可

MIT License
