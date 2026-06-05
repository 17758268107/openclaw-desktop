# OpenClaw Tauri

OpenClaw Desktop 应用的 Tauri + Rust 重构版本。

## 项目结构

```
openclaw-tauri/
├── src/                    # React 前端代码
│   ├── components/         # 组件
│   ├── lib/                # 工具库和 API
│   ├── stores/             # 状态管理
│   ├── styles/             # 样式
│   ├── views/              # 视图页面
│   ├── App.tsx             # 主应用组件
│   └── main.tsx            # 入口文件
├── src-tauri/              # Rust 后端代码
│   ├── src/
│   │   └── main.rs         # Tauri 主进程
│   ├── Cargo.toml          # Rust 依赖
│   └── tauri.conf.json     # Tauri 配置
├── package.json            # npm 依赖
└── vite.config.ts          # Vite 配置
```

## 主要功能

✅ 已实现：
- React 前端从原 Electron 项目完整迁移
- Tauri IPC 命令替代 Electron IPC
- 设置存储使用 tauri-plugin-store
- 网关健康检查和请求代理

⏳ 待实现：
- 系统托盘图标和菜单
- 全局快捷键
- 自动更新
- 窗口状态管理
- 通知系统
- openclaw-cli 集成

## 开发

### 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/) 和 Cargo
- Tauri 系统依赖：https://tauri.app/v1/guides/getting-started/prerequisites

### 运行项目

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建
npm run tauri build
```

## API 迁移说明

原 Electron 项目使用 `window.openclawAPI`，本项目保持相同的 API 接口，但底层通过 Tauri 实现。主要 API 文件在 `src/lib/tauri-api.ts`。
