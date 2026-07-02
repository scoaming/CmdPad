# 参与贡献

感谢你对 CmdPad 的关注！欢迎任何形式的贡献。

## 提交 Issue

- **Bug 报告** — 使用 [Bug 报告模板](https://github.com/scoaming/CmdPad/issues/new?template=bug_report.yml)
- **功能建议** — 使用 [功能建议模板](https://github.com/scoaming/CmdPad/issues/new?template=feature_request.yml)

## 提交 Pull Request

1. Fork 本仓库
2. 创建你的特性分支：`git checkout -b feature/your-feature`
3. 提交你的改动：`git commit -m 'feat: 添加某某功能'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

- `feat:` — 新功能
- `fix:` — Bug 修复
- `docs:` — 文档更新
- `chore:` — 构建/工具链相关
- `refactor:` — 代码重构

## 开发环境搭建

```bash
# 环境要求
# Node.js ≥ 18, Rust ≥ 1.70

git clone https://github.com/scoaming/CmdPad.git
cd CmdPad
npm install
npm run tauri dev
```

## 构建

```bash
npm run tauri build
# 安装包生成在 src-tauri/target/release/bundle/
```

## 项目结构

```
CmdPad/
├── src/               # React 前端
│   ├── components/    # UI 组件
│   ├── store/         # Zustand 状态
│   ├── types/         # 类型定义
│   └── utils/         # 工具函数
├── src-tauri/         # Rust 后端
│   └── src/
│       ├── lib.rs     # 窗口 & 托盘
│       ├── commands.rs # Tauri 命令
│       └── storage.rs # 数据持久化
└── tauri.conf.json
```
