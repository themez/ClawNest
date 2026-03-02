# ClawNest

一款基于 Electron 的桌面应用，为 [OpenClaw](https://github.com/nicepkg/openclaw) AI 智能体网关提供图形化管理界面。

## 功能特性

- **环境配置** — 一键检测并安装 Node.js 和 OpenClaw CLI
- **API 认证** — 支持 OAuth 设备码授权和 API Key 方式配置 AI 模型提供商（OpenAI、Anthropic 等）
- **频道管理** — 引导式接入消息平台（Telegram、Discord、Slack、WhatsApp、Signal、飞书）
- **实时仪表盘** — 通过 WebSocket 监控网关健康状态、活跃会话和频道状况
- **网关控制** — 在应用内直接启停 OpenClaw 网关
- **国际化** — 支持中英文切换

## 技术栈

| 层级 | 技术 |
|---|---|
| 运行时 | Electron 33 |
| 语言 | TypeScript 5.7（严格模式） |
| 界面 | React 18 + Tailwind CSS 4 + TanStack Router |
| 状态管理 | Zustand 5 |
| 构建 | electron-vite 2 (Vite 5) |
| 打包 | electron-builder 26 |
| 测试 | Vitest + happy-dom |

## 环境要求

- **Node.js** 18+
- **pnpm**（必须）

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器（支持热更新）
pnpm dev
```

## 可用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 开发模式（热更新） |
| `pnpm build` | 生产构建 |
| `pnpm typecheck` | 类型检查 |
| `pnpm test` | 运行测试 |
| `pnpm test:watch` | 监听模式测试 |
| `pnpm test:coverage` | 测试覆盖率报告 |
| `pnpm package:mac` | 构建 macOS DMG（arm64 + x64） |
| `pnpm package:win` | 构建 Windows NSIS 安装包（x64） |
| `pnpm package:all` | 构建全平台 |

## 项目结构

```
src/
├── main/               # 主进程（Node.js）
│   ├── main.ts         # 窗口创建、IPC 处理、网关生命周期
│   └── openclaw/       # CLI 调用、认证、频道配置、WebSocket 客户端
├── preload/            # IPC 桥接（contextBridge）
├── renderer/           # React 应用
│   ├── features/       # 功能模块（设置向导、仪表盘）
│   ├── components/     # 通用 UI 组件（按钮、卡片、对话框、标题栏）
│   ├── stores/         # Zustand 状态管理
│   └── i18n/           # 国际化文件（中文、英文）
└── shared/             # 跨进程共享的类型与常量
```

## 架构

```
主进程 (Node.js)  ←— IPC —→  预加载脚本 (bridge)  ←— contextBridge —→  渲染进程 (React)
```

应用遵循 Electron 三进程模型，IPC 契约统一定义在 `src/shared/` 中。主进程管理 OpenClaw 网关子进程，通过 WebSocket（JSON-RPC 协议）与其通信。渲染进程使用基于文件的路由和 hash history。

## 许可证

MIT
