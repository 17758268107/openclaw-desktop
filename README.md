# OpenClaw Desktop

基于 Tauri + React 的 OpenClaw 桌面应用，内置 CopilotKit AI 助手。

[![GitHub Release](https://img.shields.io/github/v/release/17758268107/openclaw-desktop)](https://github.com/17758268107/openclaw-desktop/releases)
[![License](https://img.shields.io/github/license/17758268107/openclaw-desktop)](LICENSE)

## 下载安装

### 最新版本 v0.1.0

| 安装包 | 说明 | 下载 |
|--------|------|------|
| **NSIS 安装包** | 推荐方式，自动创建开始菜单快捷方式 | [OpenClaw_0.1.0_x64-setup.exe](https://github.com/17758268107/openclaw-desktop/releases/download/v0.1.0/OpenClaw_0.1.0_x64-setup.exe) |
| **MSI 安装包** | 适用于企业批量部署 | [OpenClaw_0.1.0_x64_en-US.msi](https://github.com/17758268107/openclaw-desktop/releases/download/v0.1.0/OpenClaw_0.1.0_x64_en-US.msi) |

### 系统要求

- Windows 10/11 (x64)
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)（Windows 10/11 通常已预装）

## 功能特性

### CopilotKit AI 助手

应用内置 AI 助手面板，位于主界面右下角：

- 🤖 **浮动助手按钮** — 点击即可展开 AI 聊天界面
- 💬 **对话功能** — 支持与 AI 进行自然语言交互
- 🔄 **消息同步** — 助手消息自动同步到当前会话
- 📋 **复制功能** — 悬停助手回复显示复制按钮
- 📶 **状态指示** — 显示 Gateway 连接状态（在线/离线）

### 核心功能

| 功能 | 状态 | 说明 |
|------|------|------|
| React 前端（Tauri） | ✅ | 完整迁移自 Electron 项目 |
| CopilotKit AI 助手 | ✅ | 集成 v1.59.5 |
| Gateway 健康检查 | ✅ | 连接状态实时监控 |
| 设置存储（tauri-plugin-store） | ✅ | 本地持久化配置 |
| 系统托盘 | ⏳ | 待实现 |
| 全局快捷键 | ⏳ | 待实现 |
| 自动更新 | ⏳ | 待实现 |

## 项目结构

```
openclaw-desktop/
├── src/                          # React 前端
│   ├── components/               # UI 组件
│   │   ├── CopilotChatPanel.tsx # CopilotKit AI 助手面板
│   │   ├── ChatArea.tsx          # 聊天主区域
│   │   ├── GatewayPanel.tsx       # 网关状态面板
│   │   └── ...
│   ├── lib/                      # 工具库和 API
│   │   ├── tauri-api.ts          # Tauri IPC 封装
│   │   └── gateway-api.ts        # Gateway API 客户端
│   ├── stores/                   # Zustand 状态管理
│   ├── views/                    # 视图页面
│   ├── styles/                   # 样式
│   ├── App.tsx                   # 主应用
│   └── main.tsx                  # 入口文件
├── src-tauri/                    # Rust 后端
│   ├── src/main.rs               # Tauri 主进程
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 配置
├── package.json                  # Node 依赖
├── vite.config.ts               # Vite 配置（含 CopilotKit CSS 修复）
└── tailwind.config.js           # Tailwind CSS 配置
```

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.x |
| 前端框架 | React | 18.3 |
| 构建工具 | Vite | 5.x |
| 样式 | Tailwind CSS | 3.4 |
| AI 助手 | CopilotKit | 1.59.5 |
| 状态管理 | Zustand | 5.x |
| 后端语言 | Rust | 1.96 |

## 开发

### 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Bun](https://bun.sh/)（推荐）或 npm
- [Rust](https://www.rust-lang.org/) 和 Cargo
- Tauri 系统依赖：[Windows 环境配置](https://v2.tauri.app/start/prerequisites/)

### 本地开发

```bash
# 克隆项目
git clone https://github.com/17758268107/openclaw-desktop.git
cd openclaw-desktop

# 安装依赖
bun install

# 开发模式（同时启动 Vite + Tauri）
bun run tauri dev

# 仅开发前端（浏览器预览）
bun run dev
```

### 生产构建

```bash
# 构建 Windows 安装包
bun run tauri build

# 构建产物位置
# - MSI: src-tauri/target/release/bundle/msi/OpenClaw_x.x.x_x64_en-US.msi
# - NSIS: src-tauri/target/release/bundle/nsis/OpenClaw_x.x.x_x64-setup.exe
```

### 运行时依赖

应用默认连接本地 OpenClaw Gateway：

```
http://127.0.0.1:18789/v1/chat/completions
```

确保 OpenClaw Gateway 已在后台运行，或在设置中配置其他 Gateway 地址。

## CopilotKit 集成说明

本项目使用 CopilotKit v1.59.5 的 **Headless Hook** 模式集成 AI 助手，而非使用默认的 CopilotKit UI 组件。原因：

1. **Tailwind 版本冲突** — CopilotKit v4 内置 CSS 使用 Tailwind v4 的 `@layer` 语法，与项目的 Tailwind v3 产生冲突
2. **自定义 UI** — 使用项目统一的设计语言（CSS 变量 + Tailwind v3）重写消息气泡和输入框
3. **Vite CSS Stub** — 通过 `vite.config.ts` 中的 `copilotKitCssStub()` 插件拦截并清空 CopilotKit 的 CSS 文件

详见 [vite.config.ts](vite.config.ts) 中的 `copilotKitCssStub()` 插件实现。

## 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_COPILOT_RUNTIME_URL` | `http://127.0.0.1:18789/v1/chat/completions` | CopilotKit 运行时后端地址 |

### Tauri 配置

主要配置文件：`src-tauri/tauri.conf.json`

- 窗口大小：1280×800（最小 960×600）
- 应用标识符：`com.openclaw.desktop`
- 窗口装饰：使用系统原生窗口边框

## License

本项目基于 MIT License 开源。详见 [LICENSE](LICENSE) 文件。
